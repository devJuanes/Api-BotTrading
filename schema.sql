-- Advanced Market Data Schema for MatuDB / SQLite

-- 1. High-resolution Market History (OHLCV)
CREATE TABLE IF NOT EXISTS market_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL,
    UNIQUE(symbol, timeframe, timestamp)
);

-- 2. Trade Logs & Prediction Accuracy
CREATE TABLE IF NOT EXISTS trade_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    prediction_type TEXT NOT NULL, -- COMPRA, VENTA, ESPERAR
    predicted_price REAL,
    actual_price REAL,
    confidence REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN
);

-- 3. AI Model Performance Tracking
CREATE TABLE IF NOT EXISTS ai_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_version TEXT NOT NULL,
    loss REAL,
    accuracy REAL,
    training_samples INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bot Interaction History (Chat Logs)
CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_message TEXT,
    bot_response TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    whatsapp_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fcm_token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'android',
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_notification_prefs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    push_enabled BOOLEAN NOT NULL DEFAULT 1,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT 0,
    signals_only BOOLEAN NOT NULL DEFAULT 1,
    min_strength REAL NOT NULL DEFAULT 65,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6. Alerts and Feed Posts
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    strength REAL NOT NULL,
    price REAL NOT NULL,
    stop_loss REAL NOT NULL,
    take_profit REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    source_alert_id TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    strength REAL NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_alert_id) REFERENCES alerts(id)
);

-- 7. WhatsApp delivery tracking
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id TEXT PRIMARY KEY,
    session_name TEXT NOT NULL,
    status TEXT NOT NULL,
    last_qr_at DATETIME,
    connected_at DATETIME
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    alert_id TEXT,
    phone TEXT NOT NULL,
    status TEXT NOT NULL, -- queued|sent|failed
    provider_msg_id TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (alert_id) REFERENCES alerts(id)
);
