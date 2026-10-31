# 0004 — Despliegue en VPS con PM2 y Nginx

- **Estado:** Aceptada
- **Fecha:** 2026-10-30

## Contexto

El cliente aporta un VPS. Se busca una operación sencilla, sin contenedores ni orquestadores.

## Decisión

- PM2 gestiona dos procesos: `javis-web` (`next start`, solo en `127.0.0.1`) y `javis-worker`, inicialmente con una
  instancia cada uno.
- Nginx actúa como proxy inverso, termina HTTPS y sirve las imágenes públicas desde un directorio persistente fuera
  del repositorio. Los documentos privados nunca los sirve Nginx.
- Variables de entorno en un archivo fuera del repositorio (permisos `600`), cargado por la configuración de PM2.
- Migraciones con `prisma migrate deploy` como paso explícito del despliegue.

## Consecuencias

- Despliegue mediante `git checkout` de una etiqueta + `npm ci` + `npm run build` + `pm2 reload`.
- Con una sola instancia web, cada recarga provoca un corte breve; aceptable en esta etapa.
- Copias de seguridad, rotación de logs y monitorización son responsabilidad explícita del procedimiento
  (`docs/deployment.md`).
