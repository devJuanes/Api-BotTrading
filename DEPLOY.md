# Subir Api-BotTrading al servidor (trading.deportivospro.com)

## Requisito previo

En tu proveedor de DNS (Cloudflare, GoDaddy, etc.) crea un registro **A**:
- **Nombre:** `trading`
- **Valor:** IP de tu servidor (la misma que usa factory.deportivospro.com)

---

## Pasos en el servidor (por SSH)

### 1. Clonar el repo

```bash
cd ~/apps
git clone https://github.com/devJuanes/Api-BotTrading.git
cd Api-BotTrading
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Rellena al menos (usa tu proyecto MatuDB del bot):

```
PORT=4060
NODE_ENV=production

MATUDB_URL=https://matudb-api.huakar.cloud
MATUDB_PROJECT_ID=tu_project_id
MATUDB_API_KEY=tu_api_key
MATUDB_API_SECRET=tu_api_secret

WHATSAPP_ENABLED=true
WHATSAPP_SESSION=trading-main
```

Guarda (Ctrl+O, Enter, Ctrl+X).

### 3. Instalar, compilar y arrancar con PM2

```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

(Copia y ejecuta el comando que te muestre `pm2 startup` si es la primera vez.)

### 4. Nginx: configurar subdominio trading.deportivospro.com

Primero solo HTTP (para que Certbot pueda validar):

```bash
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
```

### 5. Obtener SSL con Certbot

```bash
sudo certbot --nginx -d trading.deportivospro.com
```

Sigue las preguntas (email, aceptar términos). Certbot dejará HTTPS activo.

### 6. Comprobar

- API: **https://trading.deportivospro.com/api/v1/health**
- En Prediction Factory, en `.env` de producción, pon:  
  `VITE_TRADING_API_URL=https://trading.deportivospro.com`  
  y vuelve a hacer build y desplegar la fábrica.

---

## Actualizar la API en el futuro

En el servidor:

```bash
cd ~/apps/Api-BotTrading
git pull
npm install
npm run build
pm2 reload bot-trading
```

---

## Comandos útiles

| Comando | Descripción |
|--------|-------------|
| `pm2 status` | Ver procesos (bot-trading en puerto 4060) |
| `pm2 logs bot-trading` | Ver logs en vivo |
| `pm2 restart bot-trading` | Reiniciar |
