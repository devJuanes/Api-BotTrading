import { adminClient, MatuDBService } from './MatuDBService';
import { WhatsAppService } from './WhatsAppService';

export class NotificationService {
    private fcmServerKey: string;
    private whatsapp: WhatsAppService;

    constructor() {
        this.fcmServerKey = process.env.FCM_SERVER_KEY || '';
        this.whatsapp = new WhatsAppService();
    }

    async initialize() {
        await this.whatsapp.initialize();
    }

    /** Bloquea hasta que WhatsApp esté conectado (o resuelve inmediatamente si WHATSAPP_ENABLED=false) */
    async waitUntilWAReady(): Promise<void> {
        return this.whatsapp.waitUntilReady();
    }

    /** Registra el listener de tiempo real para nuevos suscriptores y envía bienvenida */
    setupRealtimeListeners() {
        adminClient.channel('whatsapp_subscribers')
            .on('INSERT', (payload: any) => {
                const sub = payload.data;
                if (sub && sub.phone_number) {
                    const phoneObj = `${sub.country_code}${sub.phone_number}`;
                    const markets = sub.markets && sub.markets.length > 0
                        ? sub.markets.join(' y ')
                        : 'los mercados configurados';

                    const welcomeMsg =
                        `🎉 ¡Hola, *${sub.full_name}*! Bienvenido/a al sistema de alertas de *BotTrading* 🤖📈\n\n` +
                        `Desde ahora vas a recibir señales de trading en tiempo real para los mercados de *${markets}*. Nuestro bot analiza el mercado las 24 horas usando inteligencia artificial para detectar las mejores oportunidades.\n\n` +
                        `Así se verá cada alerta:\n` +
                        `🟢 *COMPRA* → El bot detecta una oportunidad de subida\n` +
                        `🔴 *VENTA* → El bot detecta una oportunidad de bajada\n` +
                        `📌 *Precio de entrada* → El precio al momento de la señal\n` +
                        `🛑 *Stop Loss* → El límite de pérdida recomendado\n` +
                        `🎯 *Take Profit* → El objetivo de ganancia\n\n` +
                        `_Recuerda que esto no es asesoría financiera. Siempre opera con responsabilidad._ 🙏\n\n` +
                        `¡Mucho éxito! 🚀💰`;

                    this.whatsapp.enqueue(sub.id, phoneObj, welcomeMsg);
                    console.log(`[NotificationService] Bienvenida enviada a: ${sub.full_name}`);
                }
            })
            .subscribe();
    }

    async notifySignal(signal: any, symbol: string, alert?: any) {
        if (signal.type === 'ESPERAR') return;

        try {
            const waSubscribers = await MatuDBService.getActiveWhatsAppSubscribers(symbol);
            for (const sub of waSubscribers) {
                const phoneObj = `${sub.country_code}${sub.phone_number}`;
                const waText = buildSignalMessage(sub.full_name, signal, symbol);
                this.whatsapp.enqueue(sub.id, phoneObj, waText, alert?.id);
            }
        } catch (error) {
            console.error('Error enviando alertas WA', error);
        }
    }

    /** Permite encolar un mensaje WA directamente (ej. desde un endpoint HTTP) */
    enqueueWA(userId: string, phone: string, text: string) {
        this.whatsapp.enqueue(userId, phone, text);
    }
}

function buildSignalMessage(name: string, signal: any, symbol: string): string {
    const isCompra = signal.type === 'COMPRA';
    const emoji = isCompra ? '🟢' : '🔴';
    const accion = isCompra ? 'COMPRA (precio subiendo)' : 'VENTA (precio bajando)';
    const entryFmt = signal.price?.toFixed(5) ?? '–';
    const slFmt = signal.stopLoss?.toFixed(5) ?? '–';
    const tpFmt = signal.takeProfit?.toFixed(5) ?? '–';

    return (
        `${emoji} *SEÑAL DE ${accion.toUpperCase()}* — ${symbol}\n\n` +
        `¡Hola, *${name}*! El bot detectó una oportunidad en *${symbol}*.\n\n` +
        `📌 *Acción:* ${accion}\n` +
        `💵 *Precio de entrada:* ${entryFmt}\n` +
        `🛑 *Stop Loss:* ${slFmt}\n` +
        `🎯 *Take Profit:* ${tpFmt}\n\n` +
        `🧠 *Razón del bot:* ${signal.reason ?? 'Análisis técnico con IA'}\n` +
        `📊 *Confianza:* ${signal.strength !== undefined ? (signal.strength * 100).toFixed(1) + '%' : 'Alta'}\n\n` +
        `_Opera con precaución. Este mensaje es solo informativo._ 🙏`
    );
}
