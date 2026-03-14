import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import { MatuDBService } from './services/MatuDBService';
import { StrategyEngine } from './core/StrategyEngine';
import { ExchangeService } from './services/ExchangeService';
import { NotificationService } from './services/NotificationService';
import logger from './services/Logger';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const port = process.env.PORT || 3000;


app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());

const MARKETS = ['EUR/USD', 'XAU/USD'];
const exchange = new ExchangeService('EUR/USD'); // will be changed dynamically or per symbol
const strategy = new StrategyEngine();
const notifications = new NotificationService();

let currentStatusMap: Record<string, any> = {};
for (const m of MARKETS) {
    currentStatusMap[m] = {
        symbol: m,
        signal: 'INICIALIZANDO',
        lastUpdate: new Date().toISOString(),
        price: 0,
        performance: { wins: 0, losses: 0 },
        candles: []
    };
}



// ──────────────────────────────────────────
// BOT LOOP
// ──────────────────────────────────────────

const ensureBootTraining = async () => {
    for (const symbol of MARKETS) {
        try {
            const history = await MatuDBService.getHistory(symbol, '1m', 1200);
            if (history.length > 100) await strategy.retrain(history);
        } catch (error) {
            logger.warn(`No fue posible entrenar al inicio para ${symbol}`, error);
        }
    }
};

const startBot = async () => {
    logger.info('Trading Bot Strategy Engine Started (MatuDB)...');
    await ensureBootTraining();

    while (true) {
        for (const symbol of MARKETS) {
            try {
                exchange.setSymbol(symbol);
                const [data1m, data15m] = await Promise.all([
                    exchange.fetchOHLCV('1m', 300),
                    exchange.fetchOHLCV('15m', 200)
                ]);

                if (data1m.length > 0 && data15m.length > 0) {
                    const signal = await strategy.analyze(data1m, data15m);
                    const latestPrice = data1m[data1m.length - 1].close;
                    const last = data1m[data1m.length - 1];

                    await MatuDBService.saveCandles([{
                        symbol: symbol,
                        timeframe: '1m',
                        timestamp: last.timestamp,
                        open: last.open, high: last.high, low: last.low,
                        close: last.close, volume: last.volume
                    }]);

                    await MatuDBService.savePrediction({
                        symbol: symbol,
                        prediction_type: signal.type,
                        predicted_price: signal.aiPrice,
                        actual_price: latestPrice,
                        confidence: signal.strength,
                        success: signal.type !== 'ESPERAR'
                            ? (signal.type === 'COMPRA' ? signal.aiPrice > latestPrice : signal.aiPrice < latestPrice)
                            : undefined
                    });

                    currentStatusMap[symbol] = {
                        ...currentStatusMap[symbol],
                        signal: signal.type, reason: signal.reason,
                        price: latestPrice, lastUpdate: new Date().toISOString(),
                        latestCandle: {
                            time: Math.floor(last.timestamp / 1000),
                            open: last.open, high: last.high, low: last.low, close: last.close
                        },
                        candles: data1m.slice(-100).map(c => ({
                            time: Math.floor(c.timestamp / 1000),
                            open: c.open, high: c.high, low: c.low, close: c.close
                        }))
                    };

                    io.emit('status_update', currentStatusMap[symbol]);

                    if (signal.type !== 'ESPERAR') {
                        const signalData = await MatuDBService.createSignal({
                            symbol: symbol,
                            signal_type: signal.type as 'COMPRA' | 'VENTA',
                            reason: signal.reason,
                            price: signal.price,
                            stop_loss: signal.stopLoss,
                            take_profit: signal.takeProfit
                        });

                        const operation = await MatuDBService.createOperation({
                            signal_id: signalData.id,
                            symbol: symbol,
                            operation_type: signal.type as 'COMPRA' | 'VENTA',
                            entry_price: signal.price
                        });

                        io.emit('new_signal', signalData);
                        io.emit('new_operation', operation);

                        await notifications.notifySignal(signal, symbol, signalData);
                        await MatuDBService.markSignalSentToWa(signalData.id);

                        logger.info(`SEÑAL EJECUTADA: ${symbol} | ${signal.type} | Score: ${signal.strength}`);
                    }

                    if (Math.random() > 0.95) {
                        const history = await MatuDBService.getHistory(symbol, '1m', 1000);
                        if (history.length > 100) await strategy.retrain(history);
                    }
                }
            } catch (error) {
                logger.error(`Bot Loop Error para ${symbol}:`, error);
            }
        } // End of MARKETS for
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
};

io.on('connection', (socket) => {
    logger.info('New client connected');
    socket.on('chat_message', async (msg) => {
        const symbol = 'EUR/USD';
        const st = currentStatusMap[symbol];
        if (!st) return;
        const trend = st.signal === 'COMPRA' ? 'alcista' : st.signal === 'VENTA' ? 'bajista' : 'lateral';
        socket.emit('chat_response', `IA: mercado ${st.symbol} en ${st.signal} a ${st.price}. Tendencia ${trend}. Consulta: "${msg}"`);
    });
});

// ──────────────────────────────────────────
// RUTAS PÚBLICAS
// ──────────────────────────────────────────

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', db: 'matudb', ts: new Date().toISOString() }));
app.get('/api/v1/status', (_req, res) => res.json(currentStatusMap));

app.get('/api/v1/chart/candles', async (req: Request, res: Response) => {
    const symbol = (req.query.symbol as string) || 'EUR/USD';
    const timeframe = (req.query.tf as string) || '1m';
    const limit = Number(req.query.limit || 200);
    const candles = await MatuDBService.getHistory(symbol, timeframe, limit);
    res.json(candles.map((c: any) => ({
        time: Math.floor(c.timestamp / 1000),
        open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume
    })));
});

// Envía manualmente el mensaje de bienvenida a todos los suscriptores activos
app.post('/api/v1/wa/send-welcome', async (_req: Request, res: Response) => {
    try {
        const { data: subs, error } = await (await import('./services/MatuDBService')).adminClient
            .from('whatsapp_subscribers').select('*').eq('is_active', true);
        if (error) return res.status(500).json({ error: error.message });
        let sent = 0;
        for (const sub of subs ?? []) {
            const phone = `${sub.country_code}${sub.phone_number}`;
            const markets = sub.markets?.join(' y ') || 'los mercados configurados';
            const msg =
                `🎉 ¡Hola, *${sub.full_name}*! Bienvenido/a al sistema de alertas de *BotTrading* 🤖📈\n\n` +
                `Vas a recibir señales en tiempo real para *${markets}*.\n\n` +
                `🟢 *COMPRA* → oportunidad de subida\n` +
                `🔴 *VENTA* → oportunidad de bajada\n` +
                `📌 *Precio de entrada*, 🛑 *Stop Loss*, 🎯 *Take Profit*\n\n` +
                `_Esto no es asesoría financiera. Opera con responsabilidad._ 🙏\n\n` +
                `¡Mucho éxito! 🚀💰`;
            notifications.enqueueWA(sub.id, phone, msg);
            sent++;
        }
        res.json({ ok: true, sent });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// ──────────────────────────────────────────
// START
// ──────────────────────────────────────────

httpServer.listen(port, async () => {
    await MatuDBService.initialize();
    logger.info(`API & WebSockets running on http://localhost:${port}`);

    // 1. Arranca el cliente de WhatsApp (puede mostrar QR si no hay sesión guardada)
    await notifications.initialize();

    // 2. Espera a que WhatsApp esté conectado antes de arrancar el bot
    //    Si WHATSAPP_ENABLED=false esto resuelve inmediatamente
    if (process.env.WHATSAPP_ENABLED === 'true') {
        logger.info('⏳ Esperando conexión de WhatsApp antes de iniciar el bot...');
    }
    await notifications.waitUntilWAReady();

    // 3. Ya conectado → registra listeners de tiempo real y arranca el bot
    notifications.setupRealtimeListeners();
    startBot();
});
