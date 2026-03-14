import * as ccxt from 'ccxt';
import { OHLCV } from './IndicatorService';

export class ExchangeService {
    private exchange: ccxt.Exchange;
    private symbol: string;

    constructor(symbol: string = 'BTC/USDT') {
        this.symbol = symbol;
        this.exchange = new ccxt.binance({
            enableRateLimit: true,
            options: { 'defaultType': 'spot' }
        });
    }

    async fetchOHLCV(timeframe: string = '1m', limit: number = 100): Promise<OHLCV[]> {
        // Forex pairs are not supported on Binance Spot natively in this format.
        // We simulate basic dummy data until a Forex Broker is integrated.
        if (this.symbol === 'EUR/USD' || this.symbol === 'XAU/USD') {
            const mockData = [];
            let currentPrice = this.symbol === 'EUR/USD' ? 1.0500 : 2050.50;
            const now = Date.now();

            for (let i = limit; i > 0; i--) {
                const ts = now - i * 60000;
                mockData.push({
                    timestamp: ts,
                    open: currentPrice,
                    high: currentPrice + 0.0010,
                    low: currentPrice - 0.0010,
                    close: currentPrice + 0.0005,
                    volume: Math.random() * 100
                });
                currentPrice += (Math.random() - 0.5) * 0.0010;
            }
            return mockData;
        }

        try {
            const ohlcv = await this.exchange.fetchOHLCV(this.symbol, timeframe, undefined, limit);
            return (ohlcv as any[]).map(candle => ({
                timestamp: candle[0],
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: candle[5]
            }));
        } catch (error: any) {
            console.error(`Error fetching data for ${this.symbol}: ${error.message}`);
            return [];
        }
    }

    async getAvailableMarkets(): Promise<any[]> {
        await this.exchange.loadMarkets();
        return Object.values(this.exchange.markets as any)
            .filter((m: any) => m.quote === 'USDT' && m.active)
            .map((m: any) => ({
                symbol: m.symbol,
                type: m.type,
                base: m.base,
                quote: m.quote
            }));
    }

    setSymbol(newSymbol: string) {
        this.symbol = newSymbol;
    }
}
