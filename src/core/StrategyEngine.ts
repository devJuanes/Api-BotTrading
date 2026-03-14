import { OHLCV, IndicatorService } from '../services/IndicatorService';
import { AIModel } from './AIModel';
import { RiskProfile, RiskManager } from './RiskManager';
import logger from '../services/Logger';

export interface StrategyConfig {
    rsiBuyThreshold: number;
    rsiSellThreshold: number;
    emaFast: number;
    emaSlow: number;
    emaTrend: number;
    slMultiplier: number;
    tpMultiplier: number;
    minSignalStrength: number;
    minSellStrength: number;  // Umbral más alto para VENTA (más conservador)
    signalPersistence: number;
    cooldownSeconds: number;
}

export interface Signal {
    type: 'COMPRA' | 'VENTA' | 'ESPERAR';
    reason: string;
    strength: number;
    price: number;
    aiPrice: number;
    stopLoss: number;
    takeProfit: number;
}

export class StrategyEngine {
    private config: StrategyConfig;
    private signalHistory: string[] = [];
    private aiModel: AIModel;

    constructor(config?: Partial<StrategyConfig>) {
        this.aiModel = new AIModel();
        this.config = {
            rsiBuyThreshold: 32,
            rsiSellThreshold: 68,
            emaFast: 20,
            emaSlow: 50,
            emaTrend: 200,
            slMultiplier: 1.6,
            tpMultiplier: 2.8,
            minSignalStrength: 65,
            minSellStrength: 72,  // VENTA exige más confluencia que COMPRA
            signalPersistence: 2,
            cooldownSeconds: 45,
            ...config
        };
    }

    async retrain(historicalCandles: any[]) {
        logger.info(`🧠 Retraining AI Model with ${historicalCandles.length} data points...`);
        await this.aiModel.train(historicalCandles);
    }

    setRiskProfile(profile: RiskProfile) {
        const profileConfig = RiskManager.getProfileConfig(profile);
        this.config.rsiBuyThreshold = profile === 'SAFE' ? 30 : 35;
        this.config.rsiSellThreshold = profile === 'SAFE' ? 70 : 65;
        this.config.minSignalStrength = profileConfig.minSignalStrength;
        logger.info(`⚙️ Strategy Risk Profile updated to: ${profile}`);
    }

    async analyze(data1m: OHLCV[], data15m: OHLCV[]): Promise<Signal> {
        if (data1m.length < 210 || data15m.length < 200) {
            return this.waitSignal('Datos insuficientes para análisis MTF');
        }

        const prices = data1m.map(d => d.close);
        const price = data1m[data1m.length - 1].close;

        // AI Prediction
        const aiPrediction = await this.aiModel.predict(data1m);
        const aiBullish = aiPrediction > price;
        const aiBearish = aiPrediction < price;

        // 15m Trend Confirmation
        const closes15m = data15m.map(d => d.close);
        const emaTrend15m = IndicatorService.ema(closes15m, this.config.emaTrend);
        const majorTrendUp = price > emaTrend15m[emaTrend15m.length - 1];

        // 1m Indicators
        const rsi = IndicatorService.rsi(prices);
        const emaFastValues = IndicatorService.ema(prices, 9);
        const emaSlowValues = IndicatorService.ema(prices, 21);
        const macd = IndicatorService.macd(prices);
        const bb = IndicatorService.BollingerBands(prices);
        const atr = IndicatorService.atr(
            data1m.map(d => d.high),
            data1m.map(d => d.low),
            data1m.map(d => d.close)
        );

        const currentRsi = rsi[rsi.length - 1];
        const currentMacd = macd[macd.length - 1];
        const currentBB = bb[bb.length - 1];
        const currentAtr = atr[atr.length - 1] || price * 0.005;
        const currentEmaFast = emaFastValues[emaFastValues.length - 1];
        const currentEmaSlow = emaSlowValues[emaSlowValues.length - 1];

        const aiTrained = this.aiModel.isTrained();
        let buyScore = this.computeScore(1, majorTrendUp, currentRsi, currentMacd, currentBB, price, currentEmaFast, currentEmaSlow, aiBullish, aiTrained);
        let sellScore = this.computeScore(-1, majorTrendUp, currentRsi, currentMacd, currentBB, price, currentEmaFast, currentEmaSlow, aiBearish, aiTrained);

        let signal: Signal = this.waitSignal('Esperando confluencia...');

        if (buyScore >= this.config.minSignalStrength && buyScore > sellScore) {
            signal = {
                type: 'COMPRA',
                reason: `Confluencia COMPRA (score ${Math.round(buyScore)}) | AI: ${aiPrediction.toFixed(2)}`,
                strength: buyScore,
                price,
                aiPrice: aiPrediction,
                stopLoss: price - (currentAtr * this.config.slMultiplier),
                takeProfit: price + (currentAtr * this.config.tpMultiplier)
            };
        } else if (sellScore >= this.config.minSellStrength && sellScore > buyScore) {
            signal = {
                type: 'VENTA',
                reason: `Confluencia VENTA (score ${Math.round(sellScore)}) | AI: ${aiPrediction.toFixed(2)}`,
                strength: sellScore,
                price,
                aiPrice: aiPrediction,
                stopLoss: price + (currentAtr * this.config.slMultiplier),
                takeProfit: price - (currentAtr * this.config.tpMultiplier)
            };
        }

        // Persistence check
        this.signalHistory.push(signal.type);
        if (this.signalHistory.length > this.config.signalPersistence * 2) {
            this.signalHistory.shift();
        }

        const recentSignals = this.signalHistory.slice(-this.config.signalPersistence);
        const isPersistent = recentSignals.every(s => s === signal.type);

        if (!isPersistent && signal.type !== 'ESPERAR') {
            return this.waitSignal(`Señal en espera (persistencia ${recentSignals.filter(s => s === signal.type).length}/${this.config.signalPersistence})`);
        }

        return signal;
    }

    private computeScore(direction: 1 | -1, majorTrendUp: boolean, rsi: number, macd: any, bb: any, price: number, emaFast: number, emaSlow: number, aiSignal: boolean, aiTrained: boolean): number {
        let score = 0;

        // MTF Alignment (20 pts)
        if ((direction === 1 && majorTrendUp) || (direction === -1 && !majorTrendUp)) {
            score += 20;
        }

        // AI Model Confirmation (30 pts) — solo contar si el modelo está entrenado
        if (aiTrained && aiSignal) score += 30;

        // RSI (20 pts)
        if (direction === 1) {
            if (rsi < this.config.rsiBuyThreshold) score += 20;
            else if (rsi < 40) score += 10;
        } else {
            if (rsi > this.config.rsiSellThreshold) score += 20;
            else if (rsi > 60) score += 10;
        }

        // MACD (15 pts)
        if (macd) {
            if (direction === 1 && macd.MACD > macd.signal) score += 15;
            if (direction === -1 && macd.MACD < macd.signal) score += 15;
        }

        // Bollinger Bands (10 pts)
        if (bb) {
            if (direction === 1 && price <= bb.lower * 1.002) score += 10;
            if (direction === -1 && price >= bb.upper * 0.998) score += 10;
        }

        // EMAs (5 pts)
        if (direction === 1 && price > emaFast && emaFast > emaSlow) score += 5;
        if (direction === -1 && price < emaFast && emaFast < emaSlow) score += 5;

        return Math.min(100, score);
    }

    private waitSignal(reason: string): Signal {
        return {
            type: 'ESPERAR',
            reason,
            strength: 0,
            price: 0,
            aiPrice: 0,
            stopLoss: 0,
            takeProfit: 0
        };
    }
}
