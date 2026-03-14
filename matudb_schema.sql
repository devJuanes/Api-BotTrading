-- ============================================================
-- MATUDB SCHEMA v3 — BotTrading / Quina Bot
-- Sin auth.users ni supabase_realtime (no existen en MatuDB)
-- ============================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    display_name   TEXT NOT NULL,
    whatsapp_phone TEXT,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. MARKET HISTORY (OHLCV)
CREATE TABLE IF NOT EXISTS market_history (
    id          BIGSERIAL PRIMARY KEY,
    symbol      TEXT NOT NULL,
    timeframe   TEXT NOT NULL,
    timestamp   BIGINT NOT NULL,
    open        DOUBLE PRECISION NOT NULL,
    high        DOUBLE PRECISION NOT NULL,
    low         DOUBLE PRECISION NOT NULL,
    close       DOUBLE PRECISION NOT NULL,
    volume      DOUBLE PRECISION NOT NULL,
    UNIQUE (symbol, timeframe, timestamp)
);

-- 3. TRADE PREDICTIONS
CREATE TABLE IF NOT EXISTS trade_predictions (
    id               BIGSERIAL PRIMARY KEY,
    symbol           TEXT NOT NULL,
    prediction_type  TEXT NOT NULL,
    predicted_price  DOUBLE PRECISION,
    actual_price     DOUBLE PRECISION,
    confidence       DOUBLE PRECISION,
    success          BOOLEAN,
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- 4. AI METRICS
CREATE TABLE IF NOT EXISTS ai_metrics (
    id                BIGSERIAL PRIMARY KEY,
    model_version     TEXT NOT NULL,
    loss              DOUBLE PRECISION,
    accuracy          DOUBLE PRECISION,
    training_samples  INTEGER,
    created_at        TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS whatsapp_subscribers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code   TEXT NOT NULL, -- e.g. '57'
    phone_number   TEXT NOT NULL, -- e.g. '3001234567'
    full_name      TEXT NOT NULL,
    markets        TEXT[] DEFAULT ARRAY['EUR/USD', 'XAU/USD'],
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE(country_code, phone_number)
);

-- 5. WHATSAPP SUBSCRIBERS
CREATE TABLE IF NOT EXISTS trading_signals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol         TEXT NOT NULL, -- e.g. 'EUR/USD', 'XAU/USD'
    signal_type    TEXT NOT NULL, -- 'BUY', 'SELL'
    reason         TEXT NOT NULL,
    price          DOUBLE PRECISION NOT NULL,
    stop_loss      DOUBLE PRECISION,
    take_profit    DOUBLE PRECISION,
    sent_to_wa     BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- 6. TRADING OPERATIONS (Historial de operaciones ejecutadas)
CREATE TABLE IF NOT EXISTS trading_operations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id      UUID REFERENCES trading_signals(id),
    symbol         TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'BUY', 'SELL'
    entry_price    DOUBLE PRECISION NOT NULL,
    exit_price     DOUBLE PRECISION,
    status         TEXT NOT NULL, -- 'OPEN', 'CLOSED', 'CANCELED'
    profit_loss    DOUBLE PRECISION,
    opened_at      TIMESTAMPTZ DEFAULT now(),
    closed_at      TIMESTAMPTZ
);

