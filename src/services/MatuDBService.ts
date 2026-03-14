import { createClient } from '@devjuanes/matuclient';
import { AuthService } from './AuthService';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const MATUDB_URL = process.env.MATUDB_URL!;
const MATUDB_PROJECT_ID = process.env.MATUDB_PROJECT_ID!;
// Acepta MATUDB_API_SECRET o MATUDB_API_KEY (mismo valor en MatuDB)
const MATUDB_API_KEY = process.env.MATUDB_API_SECRET || process.env.MATUDB_API_KEY!;

if (!MATUDB_URL || !MATUDB_PROJECT_ID || !MATUDB_API_KEY) {
    throw new Error('MATUDB_URL, MATUDB_PROJECT_ID y MATUDB_API_SECRET (o MATUDB_API_KEY) son requeridos en .env');
}

// Cliente único con service key
export const adminClient: any = createClient({
    url: MATUDB_URL,
    projectId: MATUDB_PROJECT_ID,
    apiKey: MATUDB_API_KEY
});

export class MatuDBService {

    static async initialize() {
        const { error } = await adminClient.from('trading_signals').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
            console.error('[MatuDB] Connection error:', error.message || error);
        } else {
            console.log('📦 MatuDB Initialized');
        }
    }

    // ──────────────────────────────────────────
    // MARKET HISTORY
    // ──────────────────────────────────────────

    static async saveCandles(candles: Array<{
        symbol: string; timeframe: string; timestamp: number;
        open: number; high: number; low: number; close: number; volume: number;
    }>) {
        if (!candles.length) return;
        const { error } = await adminClient
            .from('market_history')
            .upsert(candles, { onConflict: 'symbol,timeframe,timestamp', ignoreDuplicates: true });
        if (error) console.error('[MatuDB] saveCandles:', error.message);
    }

    static async getHistory(symbol: string, timeframe: string, limit = 500) {
        const { data, error } = await adminClient
            .from('market_history')
            .select('*')
            .eq('symbol', symbol)
            .eq('timeframe', timeframe)
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (error) { console.error('[MatuDB] getHistory:', error.message); return []; }
        return data ?? [];
    }

    // ──────────────────────────────────────────
    // PREDICTIONS & AI METRICS
    // ──────────────────────────────────────────

    static async savePrediction(payload: {
        symbol: string; prediction_type: string;
        predicted_price?: number; actual_price?: number;
        confidence?: number; success?: boolean;
    }) {
        const { error } = await adminClient.from('trade_predictions').insert(payload);
        if (error) console.error('[MatuDB] savePrediction:', error.message);
    }

    static async saveAIMetric(payload: {
        model_version: string; loss?: number; accuracy?: number; training_samples?: number;
    }) {
        const { error } = await adminClient.from('ai_metrics').insert(payload);
        if (error) console.error('[MatuDB] saveAIMetric:', error.message);
    }

    // ──────────────────────────────────────────
    // TRADING SIGNALS
    // ──────────────────────────────────────────

    static async createSignal(payload: {
        symbol: string; signal_type: 'COMPRA' | 'VENTA' | 'ESPERAR';
        reason: string; price: number;
        stop_loss?: number; take_profit?: number;
    }) {
        const { error } = await adminClient
            .from('trading_signals').insert(payload);
        if (error) throw new Error(`[MatuDB] createSignal: ${error.message}`);
        // Fetch the most recently inserted signal for this symbol
        const { data, error: fetchError } = await adminClient
            .from('trading_signals')
            .select('*')
            .eq('symbol', payload.symbol)
            .eq('price', payload.price)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (fetchError) throw new Error(`[MatuDB] createSignal fetch: ${fetchError.message}`);
        return data;
    }

    static async markSignalSentToWa(id: string) {
        await adminClient.from('trading_signals').update({ sent_to_wa: true }).eq('id', id);
    }

    static async getSignals(limit = 30, cursor?: string) {
        let q = adminClient.from('trading_signals').select('*')
            .order('created_at', { ascending: false })
            .limit(Math.min(limit, 100));
        if (cursor) q = q.lt('created_at', cursor);
        const { data, error } = await q;
        if (error) { console.error('[MatuDB] getSignals:', error.message); return []; }
        return data ?? [];
    }

    // ──────────────────────────────────────────
    // TRADING OPERATIONS
    // ──────────────────────────────────────────

    static async createOperation(payload: {
        signal_id?: string; symbol: string; operation_type: string;
        entry_price: number;
    }) {
        const { error } = await adminClient
            .from('trading_operations')
            .insert({ ...payload, status: 'OPEN' });
        if (error) throw new Error(`[MatuDB] createOperation: ${error.message}`);
        // Fetch the most recently inserted operation for this symbol
        const { data, error: fetchError } = await adminClient
            .from('trading_operations')
            .select('*')
            .eq('symbol', payload.symbol)
            .eq('entry_price', payload.entry_price)
            .order('opened_at', { ascending: false })
            .limit(1)
            .single();
        if (fetchError) throw new Error(`[MatuDB] createOperation fetch: ${fetchError.message}`);
        return data;
    }

    static async closeOperation(id: string, exitPrice: number, profitLoss: number) {
        await adminClient.from('trading_operations')
            .update({ exit_price: exitPrice, profit_loss: profitLoss, status: 'CLOSED', closed_at: new Date().toISOString() })
            .eq('id', id);
        const { data } = await adminClient
            .from('trading_operations')
            .select('*')
            .eq('id', id)
            .single();
        return data;
    }

    // ──────────────────────────────────────────
    // WHATSAPP SUBSCRIBERS
    // ──────────────────────────────────────────

    static async getActiveWhatsAppSubscribers(marketSymbol: string) {
        const { data, error } = await adminClient
            .from('whatsapp_subscribers')
            .select('*')
            .eq('is_active', true);

        if (error) { console.error('[MatuDB] getWaSubscribers:', error.message); return []; }
        // Filtrar en memoria porque matuclient no soporta .contains() sobre arrays
        return (data ?? []).filter((sub: any) =>
            !sub.markets || sub.markets.length === 0 || sub.markets.includes(marketSymbol)
        );
    }

    static async addOrUpdateWhatsAppSubscriber(payload: {
        country_code: string; phone_number: string; full_name: string; markets?: string[];
    }) {
        const { error } = await adminClient
            .from('whatsapp_subscribers')
            .upsert(payload, { onConflict: 'country_code,phone_number' });

        if (error) throw new Error(`[MatuDB] addWaSubscriber: ${error.message}`);
        const { data, error: fetchError } = await adminClient
            .from('whatsapp_subscribers')
            .select('*')
            .eq('country_code', payload.country_code)
            .eq('phone_number', payload.phone_number)
            .single();
        if (fetchError) throw new Error(`[MatuDB] addWaSubscriber fetch: ${fetchError.message}`);
        return data;
    }
}
