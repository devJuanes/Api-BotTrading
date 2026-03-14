import * as TA from 'technicalindicators';

export interface OHLCV {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export class IndicatorService {
    static rsi(values: number[], period: number = 14): number[] {
        return TA.rsi({ values, period });
    }

    static ema(values: number[], period: number): number[] {
        return TA.ema({ values, period });
    }

    static macd(values: number[]): any[] {
        return TA.macd({
            values,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });
    }

    static BollingerBands(values: number[], period: number = 20, stdDev: number = 2): any[] {
        return TA.bollingerbands({ values, period, stdDev });
    }

    static atr(high: number[], low: number[], close: number[], period: number = 14): number[] {
        return TA.atr({ high, low, close, period });
    }
}
