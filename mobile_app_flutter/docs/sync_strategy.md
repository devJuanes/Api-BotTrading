# Estrategia de sincronización MatuDB (v1)

## Objetivo
Mantener la app funcional offline y actualizar en tiempo real cuando hay conexión.

## Flujo recomendado
1. Login exitoso:
   - Guardar token seguro.
   - Cargar `GET /status`, `GET /posts`, `GET /alerts`.
   - Upsert en `local_posts` y `local_alerts`.
   - Actualizar `sync_state`.
2. Socket conectado:
   - Evento `new_post`: upsert directo en `local_posts`.
   - Evento `new_alert`: upsert directo en `local_alerts`.
   - Evento `status_update`: guardar snapshot en `local_settings`.
3. Reconexión:
   - Usar `cursor` de `sync_state` para traer faltantes.
   - Resolver colisiones por `id` (última actualización gana).
4. Modo sin red:
   - Renderizar desde `local_posts` y `local_alerts`.
   - Reintentar sync cada 30-60 segundos.

## Reglas de consistencia
- `id` es la clave de deduplicación.
- Nunca borrar datos locales si falla la red.
- Mantener historial al menos 7 días; purga por fecha.
