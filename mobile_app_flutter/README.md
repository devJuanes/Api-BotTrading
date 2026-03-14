# Quina Bot Alpha (Flutter Android)

## Configuración rápida
1. Instalar Flutter 3.22+.
2. En esta carpeta ejecutar:
   - `flutter pub get`
   - `flutter run --dart-define=API_URL=http://10.0.2.2:3000`

## Módulos incluidos
- Login
- Registro
- Home (gráfico + señal actual)
- Posts en tiempo real (`new_post`)
- Alertas en tiempo real (`new_alert`)
- Perfil de notificaciones

## Base local (MatuDB)
Esquema en `docs/matudb_schema.sql`.

## Nota de emulador Android
- `10.0.2.2` apunta al localhost de tu PC.
- Si usas dispositivo físico, reemplaza por IP LAN de tu backend.
