# Subir BotTrading API al servidor

## 1. En tu PC (primera vez)

```bash
cd C:\Users\Usuario\Desktop\BotTrading

# Inicializar repo si aún no existe
git init
git add .
git commit -m "BotTrading API + PM2 + nginx"

# Crear repo en GitHub/GitLab y enlazar
git remote add origin https://github.com/TU_USUARIO/bot-trading.git
git branch -M main
git push -u origin main
```

## 2. En el servidor (SSH)

### Clonar e instalar

```bash
cd ~/apps
git clone https://github.com/TU_USUARIO/bot-trading.git
cd bot-trading
```

### Configurar .env

```bash
cp .env.example .env
nano .env
```

Rellena al menos:

- `PORT=4060`
- `MATUDB_URL=...`
- `MATUDB_PROJECT_ID=...`
- `MATUDB_API_KEY=...` (o `MATUDB_API_SECRET` si tu código lo usa)
- `WHATSAPP_ENABLED=true` o `false`
- `WHATSAPP_SESSION=trading-main`

### Build y arrancar con PM2

```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Nginx + SSL (subdominio trading.deportivospro.com)

```bash
# Copiar config (primero solo HTTP para que certbot funcione)
sudo tee /etc/nginx/sites-available/trading.deportivospro.com << 'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name trading.deportivospro.com;
    location / {
        proxy_pass http://127.0.0.1:4060;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/trading.deportivospro.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d trading.deportivospro.com
```

**Antes de certbot:** crea el registro DNS tipo `A` para `trading.deportivospro.com` apuntando a la IP del servidor.

## 3. Actualizar la API en el futuro

En el servidor:

```bash
cd ~/apps/bot-trading
git pull
npm install
npm run build
pm2 reload bot-trading
```

## Comandos útiles

| Comando | Descripción |
|--------|-------------|
| `pm2 status` | Ver procesos |
| `pm2 logs bot-trading` | Ver logs en vivo |
| `pm2 restart bot-trading` | Reiniciar |
