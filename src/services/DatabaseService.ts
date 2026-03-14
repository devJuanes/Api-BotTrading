import { DataSource, LessThan, Repository } from 'typeorm';
import crypto from 'crypto';
import {
    AIMetric,
    Alert,
    Candle,
    Post,
    RefreshToken,
    TradePrediction,
    User,
    UserDevice,
    UserNotificationPreference,
    WhatsAppLog,
    WhatsAppSession
} from '../models/Candle';

export class DatabaseService {
    private static dataSource: DataSource;

    static async initialize() {
        this.dataSource = new DataSource({
            type: 'sqlite',
            database: 'data/database.sqlite',
            entities: [
                Candle,
                TradePrediction,
                AIMetric,
                User,
                UserDevice,
                UserNotificationPreference,
                Alert,
                Post,
                RefreshToken,
                WhatsAppSession,
                WhatsAppLog
            ],
            synchronize: true,
            logging: false
        });

        await this.dataSource.initialize();
        console.log('📦 Database Initialized with Advanced Schema');
    }

    static getRepository<T extends object>(entity: new () => T): Repository<T> {
        return this.dataSource.getRepository(entity);
    }

    static async saveCandles(candles: Candle[]) {
        try {
            await this.dataSource.getRepository(Candle).upsert(candles, ['symbol', 'timeframe', 'timestamp']);
        } catch (error) {
            // Handle unique constraint or other errors silently for bulk saves
        }
    }

    static async getHistory(symbol: string, timeframe: string, limit: number = 500): Promise<Candle[]> {
        return await this.dataSource.getRepository(Candle).find({
            where: { symbol, timeframe },
            order: { timestamp: 'DESC' },
            take: limit
        }) as Candle[];
    }

    static async savePrediction(prediction: Partial<TradePrediction>) {
        return await this.dataSource.getRepository(TradePrediction).save(prediction);
    }

    static async saveAIMetric(metric: Partial<AIMetric>) {
        return await this.dataSource.getRepository(AIMetric).save(metric);
    }

    static async createUser(payload: {
        email: string;
        passwordHash: string;
        displayName: string;
        whatsappPhone?: string;
    }) {
        const repo = this.dataSource.getRepository(User);
        const user = repo.create({
            email: payload.email.trim().toLowerCase(),
            password_hash: payload.passwordHash,
            display_name: payload.displayName,
            whatsapp_phone: payload.whatsappPhone
        });
        const saved = await repo.save(user);
        await this.dataSource.getRepository(UserNotificationPreference).save({
            user_id: saved.id,
            push_enabled: true,
            whatsapp_enabled: !!payload.whatsappPhone,
            signals_only: true,
            min_strength: 65
        });
        return saved;
    }

    static async findUserByEmail(email: string): Promise<User | null> {
        return await this.dataSource.getRepository(User).findOne({
            where: { email: email.trim().toLowerCase(), is_active: true }
        });
    }

    static async findUserById(id: string): Promise<User | null> {
        return await this.dataSource.getRepository(User).findOne({
            where: { id, is_active: true }
        });
    }

    static async upsertDevice(userId: string, fcmToken: string, platform: 'android' | 'ios' | 'web' = 'android') {
        const repo = this.dataSource.getRepository(UserDevice);
        const existing = await repo.findOne({ where: { fcm_token: fcmToken } });
        if (existing) {
            existing.user_id = userId;
            existing.platform = platform;
            existing.last_seen_at = new Date();
            return await repo.save(existing);
        }
        return await repo.save({
            user_id: userId,
            fcm_token: fcmToken,
            platform,
            last_seen_at: new Date()
        });
    }

    static async getNotificationPreference(userId: string) {
        let prefs = await this.dataSource.getRepository(UserNotificationPreference).findOne({
            where: { user_id: userId }
        });
        if (!prefs) {
            prefs = await this.dataSource.getRepository(UserNotificationPreference).save({
                user_id: userId,
                push_enabled: true,
                whatsapp_enabled: false,
                signals_only: true,
                min_strength: 65
            });
        }
        return prefs;
    }

    static async updateNotificationPreference(
        userId: string,
        patch: Partial<Pick<UserNotificationPreference, 'push_enabled' | 'whatsapp_enabled' | 'signals_only' | 'min_strength'>>
    ) {
        const prefs = await this.getNotificationPreference(userId);
        Object.assign(prefs, patch);
        return await this.dataSource.getRepository(UserNotificationPreference).save(prefs);
    }

    static async updateUserProfile(userId: string, patch: Partial<Pick<User, 'display_name' | 'whatsapp_phone'>>) {
        const repo = this.dataSource.getRepository(User);
        const user = await repo.findOne({ where: { id: userId, is_active: true } });
        if (!user) {
            return null;
        }
        Object.assign(user, patch);
        return await repo.save(user);
    }

    static async createRefreshToken(userId: string, token: string, expiresAt: Date) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        return await this.dataSource.getRepository(RefreshToken).save({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt
        });
    }

    static async findRefreshToken(token: string): Promise<RefreshToken | null> {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        return await this.dataSource.getRepository(RefreshToken).findOne({
            where: { token_hash: tokenHash }
        });
    }

    static async revokeRefreshToken(token: string) {
        const found = await this.findRefreshToken(token);
        if (!found) {
            return;
        }
        found.revoked_at = new Date();
        await this.dataSource.getRepository(RefreshToken).save(found);
    }

    static async purgeExpiredRefreshTokens() {
        await this.dataSource.getRepository(RefreshToken).delete({
            expires_at: LessThan(new Date())
        });
    }

    static async createAlert(payload: {
        symbol: string;
        signal_type: 'COMPRA' | 'VENTA' | 'ESPERAR';
        reason: string;
        strength: number;
        price: number;
        stop_loss: number;
        take_profit: number;
    }) {
        return await this.dataSource.getRepository(Alert).save(payload);
    }

    static async createPostFromAlert(alert: Alert) {
        const title = `${alert.signal_type} ${alert.symbol}`;
        const body = `${alert.reason}\nPrecio: ${alert.price.toFixed(2)} | SL: ${alert.stop_loss.toFixed(2)} | TP: ${alert.take_profit.toFixed(2)} | Score: ${Math.round(alert.strength)}`;
        return await this.dataSource.getRepository(Post).save({
            source_alert_id: alert.id,
            title,
            body,
            symbol: alert.symbol,
            signal_type: alert.signal_type,
            strength: alert.strength,
            is_system: true
        });
    }

    static async getAlerts(limit: number = 30, cursor?: string) {
        const qb = this.dataSource.getRepository(Alert).createQueryBuilder('a')
            .orderBy('a.created_at', 'DESC')
            .limit(Math.min(limit, 100));
        if (cursor) {
            qb.andWhere('a.created_at < :cursor', { cursor });
        }
        return await qb.getMany();
    }

    static async getPosts(limit: number = 30, cursor?: string) {
        const qb = this.dataSource.getRepository(Post).createQueryBuilder('p')
            .orderBy('p.created_at', 'DESC')
            .limit(Math.min(limit, 100));
        if (cursor) {
            qb.andWhere('p.created_at < :cursor', { cursor });
        }
        return await qb.getMany();
    }

    static async getPostById(id: string) {
        return await this.dataSource.getRepository(Post).findOne({ where: { id } });
    }

    static async getUsersForSignal(signalType: 'COMPRA' | 'VENTA' | 'ESPERAR', strength: number) {
        if (signalType === 'ESPERAR') {
            return [];
        }
        const repo = this.dataSource.getRepository(User);
        const users = await repo.find({ where: { is_active: true } });
        const prefsRepo = this.dataSource.getRepository(UserNotificationPreference);
        const devicesRepo = this.dataSource.getRepository(UserDevice);
        const rows: Array<{ user: User; prefs: UserNotificationPreference | null; devices: UserDevice[] }> = [];
        for (const user of users) {
            const prefs = await prefsRepo.findOne({ where: { user_id: user.id } });
            if (prefs && strength < prefs.min_strength) {
                continue;
            }
            const devices = await devicesRepo.find({ where: { user_id: user.id } });
            rows.push({ user, prefs, devices });
        }
        return rows;
    }

    static async saveWhatsAppLog(payload: Partial<WhatsAppLog>) {
        return await this.dataSource.getRepository(WhatsAppLog).save(payload);
    }

    static async getOrCreateWhatsAppSession(sessionName = 'main') {
        const repo = this.dataSource.getRepository(WhatsAppSession);
        let session = await repo.findOne({ where: { session_name: sessionName } });
        if (!session) {
            session = await repo.save({
                session_name: sessionName,
                status: 'disconnected'
            });
        }
        return session;
    }

    static async updateWhatsAppSession(sessionName: string, patch: Partial<WhatsAppSession>) {
        const session = await this.getOrCreateWhatsAppSession(sessionName);
        Object.assign(session, patch);
        return await this.dataSource.getRepository(WhatsAppSession).save(session);
    }
}
