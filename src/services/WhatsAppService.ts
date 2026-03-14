import logger from './Logger';

type QueueItem = {
    userId: string;
    phone: string;
    text: string;
    alertId?: string;
};

export class WhatsAppService {
    private client: any = null;
    private ready = false;
    private queue: QueueItem[] = [];
    private isSending = false;
    private readyResolve: (() => void) | null = null;
    private readyPromise: Promise<void> | null = null;

    /**
     * Inicia el cliente de WhatsApp.
     * Si WHATSAPP_ENABLED !== 'true', no hace nada y waitUntilReady() resuelve inmediatamente.
     */
    async initialize(): Promise<void> {
        if (process.env.WHATSAPP_ENABLED !== 'true') {
            this.ready = true;
            return;
        }

        this.readyPromise = new Promise<void>((resolve) => {
            this.readyResolve = resolve;
        });

        try {
            const wa = require('whatsapp-web.js');
            const qrcode = require('qrcode-terminal');
            const { Client, LocalAuth } = wa;

            this.client = new Client({
                authStrategy: new LocalAuth({ clientId: process.env.WHATSAPP_SESSION || 'trading-main' }),
                puppeteer: {
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
            });

            this.client.on('qr', (qr: string) => {
                console.log('\n');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📱  ESCANEA ESTE QR CON TU WHATSAPP');
                console.log('   WhatsApp → Dispositivos vinculados → Vincular dispositivo');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                qrcode.generate(qr, { small: true });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('⏳  Esperando que escanees el QR...\n');
            });

            this.client.on('ready', () => {
                this.ready = true;
                console.log('\n✅  WhatsApp conectado. ¡Arrancando el bot de trading!\n');
                logger.info('✅ WhatsApp conectado correctamente');
                this.readyResolve?.();
            });

            this.client.on('authenticated', () => {
                logger.info('🔐 WhatsApp autenticado (sesión guardada)');
            });

            this.client.on('auth_failure', (error: any) => {
                logger.error('❌ Error autenticando WhatsApp — borra la carpeta .wwebjs_auth y reinicia', error);
                // Resolvemos igualmente para no bloquear el proceso
                this.readyResolve?.();
            });

            this.client.on('disconnected', (reason: string) => {
                this.ready = false;
                logger.warn(`⚠️  WhatsApp desconectado: ${reason}`);
            });

            // initialize() de wweb.js NO espera a 'ready', solo dispara el proceso
            await this.client.initialize();

        } catch (error) {
            logger.error('❌ No se pudo inicializar whatsapp-web.js', error);
            this.readyResolve?.(); // no bloquear la app si hay error grave
        }
    }

    /**
     * Retorna una Promise que se resuelve SOLO cuando WhatsApp está listo.
     * Úsala en el arranque de la app para esperar antes de iniciar el bot.
     */
    waitUntilReady(): Promise<void> {
        if (this.ready) return Promise.resolve();
        return this.readyPromise ?? Promise.resolve();
    }

    isReady(): boolean {
        return this.ready;
    }

    enqueue(userId: string, phone: string, text: string, alertId?: string) {
        this.queue.push({ userId, phone, text, alertId });
        this.processQueue().catch((error) => logger.error('Error procesando cola WA', error));
    }

    private async processQueue() {
        if (this.isSending) return;
        this.isSending = true;
        while (this.queue.length > 0) {
            const item = this.queue.shift()!;
            if (!this.client || !this.ready) {
                logger.warn(`No se pudo enviar WA a ${item.phone}: cliente no conectado.`);
                continue;
            }
            try {
                const chatId = this.toWhatsAppId(item.phone);
                await this.client.sendMessage(chatId, item.text);
                logger.info(`✉️  Mensaje WA enviado a ${item.phone}`);
            } catch (error: any) {
                logger.error(`Error enviando WA a ${item.phone}: ${error?.message}`);
            }
        }
        this.isSending = false;
    }

    private toWhatsAppId(phone: string) {
        const cleaned = phone.replace(/[^\d]/g, '');
        return `${cleaned}@c.us`;
    }
}
