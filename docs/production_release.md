# Producción: API Trading Bot

## Requisitos mínimos
- Node.js 20+
- PM2 o systemd
- PostgreSQL (recomendado en prod)
- Dominio con HTTPS (Nginx + Certbot)

## Variables de entorno
Definir en servidor:

```
PORT=3000
NODE_ENV=production
JWT_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me_too
FCM_SERVER_KEY=your_fcm_server_key
WHATSAPP_ENABLED=true
WHATSAPP_SESSION=trading-main
```

## Pasos de despliegue
1. Instalar dependencias: `npm ci`
2. Build: `npm run build`
3. Crear carpeta `data/` y `logs/`
4. Ejecutar con PM2:
   - `pm2 start dist/index.js --name quina-bot-api`
5. Configurar reverse proxy Nginx a `http://127.0.0.1:3000`
6. Habilitar SSL con Certbot.

## Monitoreo básico
- Healthcheck: `GET /api/v1/health`
- Logs:
  - `logs/combined.log`
  - `logs/error.log`
- Alertas recomendadas:
  - caída de proceso
  - respuesta > 2s en `/health`
  - errores 5xx en incremento

## Checklist de release
- [ ] Registro/login funciona
- [ ] Refresh token funciona
- [ ] `GET /posts` y `GET /alerts` responden autenticado
- [ ] Socket emite `status_update`
- [ ] Socket emite `new_alert` y `new_post`
- [ ] Push FCM llega al menos a un dispositivo
- [ ] WhatsApp envía mensaje con sesión conectada
- [ ] Backups de DB diarios configurados
