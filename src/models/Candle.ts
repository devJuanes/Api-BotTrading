import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SignalType = 'COMPRA' | 'VENTA' | 'ESPERAR';
export type DevicePlatform = 'android' | 'ios' | 'web';
export type WhatsAppDeliveryStatus = 'queued' | 'sent' | 'failed';

@Entity('market_history')
@Index(['symbol', 'timeframe', 'timestamp'], { unique: true })
export class Candle {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    symbol!: string;

    @Column()
    timeframe!: string;

    @Column('bigint')
    timestamp!: number;

    @Column('float')
    open!: number;

    @Column('float')
    high!: number;

    @Column('float')
    low!: number;

    @Column('float')
    close!: number;

    @Column('float')
    volume!: number;
}

@Entity('trade_predictions')
export class TradePrediction {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    symbol!: string;

    @Column()
    prediction_type!: string;

    @Column('float', { nullable: true })
    predicted_price?: number;

    @Column('float', { nullable: true })
    actual_price?: number;

    @Column('float', { nullable: true })
    confidence?: number;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    timestamp!: Date;

    @Column({ nullable: true })
    success?: boolean;
}

@Entity('ai_metrics')
export class AIMetric {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    model_version!: string;

    @Column('float', { nullable: true })
    loss?: number;

    @Column('float', { nullable: true })
    accuracy?: number;

    @Column({ nullable: true })
    training_samples?: number;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    timestamp!: Date;
}

@Entity('users')
@Index(['email'], { unique: true })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    email!: string;

    @Column()
    password_hash!: string;

    @Column()
    display_name!: string;

    @Column({ nullable: true })
    whatsapp_phone?: string;

    @Column({ default: true })
    is_active!: boolean;

    @CreateDateColumn({ type: 'datetime' })
    created_at!: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updated_at!: Date;
}

@Entity('user_devices')
@Index(['user_id'])
@Index(['fcm_token'], { unique: true })
export class UserDevice {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    fcm_token!: string;

    @Column({ type: 'simple-enum', enum: ['android', 'ios', 'web'], default: 'android' })
    platform!: DevicePlatform;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    last_seen_at!: Date;
}

@Entity('user_notification_prefs')
@Index(['user_id'], { unique: true })
export class UserNotificationPreference {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    user_id!: string;

    @Column({ default: true })
    push_enabled!: boolean;

    @Column({ default: false })
    whatsapp_enabled!: boolean;

    @Column({ default: true })
    signals_only!: boolean;

    @Column({ type: 'float', default: 65 })
    min_strength!: number;

    @UpdateDateColumn({ type: 'datetime' })
    updated_at!: Date;
}

@Entity('alerts')
@Index(['symbol', 'created_at'])
export class Alert {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    symbol!: string;

    @Column({ type: 'simple-enum', enum: ['COMPRA', 'VENTA', 'ESPERAR'] })
    signal_type!: SignalType;

    @Column()
    reason!: string;

    @Column('float')
    strength!: number;

    @Column('float')
    price!: number;

    @Column('float')
    stop_loss!: number;

    @Column('float')
    take_profit!: number;

    @CreateDateColumn({ type: 'datetime' })
    created_at!: Date;
}

@Entity('posts')
@Index(['created_at'])
export class Post {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ nullable: true })
    source_alert_id?: string;

    @Column()
    title!: string;

    @Column('text')
    body!: string;

    @Column()
    symbol!: string;

    @Column({ type: 'simple-enum', enum: ['COMPRA', 'VENTA', 'ESPERAR'] })
    signal_type!: SignalType;

    @Column('float')
    strength!: number;

    @Column({ default: true })
    is_system!: boolean;

    @CreateDateColumn({ type: 'datetime' })
    created_at!: Date;
}

@Entity('refresh_tokens')
@Index(['user_id'])
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    token_hash!: string;

    @Column({ type: 'datetime' })
    expires_at!: Date;

    @Column({ type: 'datetime', nullable: true })
    revoked_at?: Date;

    @CreateDateColumn({ type: 'datetime' })
    created_at!: Date;
}

@Entity('whatsapp_sessions')
export class WhatsAppSession {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ default: 'main' })
    session_name!: string;

    @Column({ default: 'disconnected' })
    status!: string;

    @Column({ type: 'datetime', nullable: true })
    last_qr_at?: Date;

    @Column({ type: 'datetime', nullable: true })
    connected_at?: Date;
}

@Entity('whatsapp_logs')
@Index(['user_id'])
export class WhatsAppLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    user_id!: string;

    @Column({ nullable: true })
    alert_id?: string;

    @Column()
    phone!: string;

    @Column({ type: 'simple-enum', enum: ['queued', 'sent', 'failed'], default: 'queued' })
    status!: WhatsAppDeliveryStatus;

    @Column({ nullable: true })
    provider_msg_id?: string;

    @Column({ nullable: true })
    error?: string;

    @CreateDateColumn({ type: 'datetime' })
    created_at!: Date;
}
