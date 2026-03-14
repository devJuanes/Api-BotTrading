-- MatuDB schema v1 for Android offline cache

CREATE TABLE IF NOT EXISTS local_user (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    whatsapp_phone TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_posts (
    id TEXT PRIMARY KEY,
    source_alert_id TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    strength REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_alerts (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    strength REAL NOT NULL,
    price REAL NOT NULL,
    stop_loss REAL NOT NULL,
    take_profit REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_state (
    resource TEXT PRIMARY KEY,      -- posts|alerts|status
    last_cursor TEXT,
    last_sync_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_local_posts_created_at ON local_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_alerts_created_at ON local_alerts(created_at DESC);
