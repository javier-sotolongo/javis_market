# 0006 — Imágenes de producto almacenadas en el VPS

- **Estado:** Aceptada
- **Fecha:** 2026-10-30

## Contexto

El cliente aportará las fotos de dos formas: subiéndolas desde el formulario del producto o indicando la URL de una
imagen en otro almacenamiento (p. ej. imágenes autorizadas de Deliflow). La tienda debe funcionar de forma
independiente.

## Decisión

- **Toda imagen se guarda en el VPS** (`STORAGE_PUBLIC_DIR`), también las que llegan por URL: el servidor la
  descarga una vez, la procesa y guarda la URL de origen solo como referencia (`sourceUrl`). La tienda nunca enlaza
  al almacenamiento externo, así que no depende de su disponibilidad.
- Procesado con `sharp`: validación por contenido (JPEG, PNG, WebP, AVIF, GIF; SVG rechazado), máximo 10 MB y
  50 MP de entrada, orientación corregida, máximo 2000 px por lado, salida WebP sin metadatos.
- Clave generada por el servidor: `products/<productId>/<uuid>.webp`. Escritura atómica.
- Descarga por URL protegida contra SSRF: solo `http/https` en puertos estándar, sin credenciales en la URL,
  rechazo de direcciones privadas, loopback, link-local y de metadatos comprobado **en el momento de conectar**
  (también tras cada redirección, máximo 3), tiempo límite de 15 s y tamaño limitado. Lista blanca opcional de
  dominios con `IMAGE_IMPORT_ALLOWED_HOSTS`.
- Nginx sirve `/media/` directamente desde el disco; en desarrollo lo hace la ruta `web/src/app/media/[...key]`.

## Consecuencias

- Las imágenes ocupan disco en el VPS y deben incluirse en las copias de seguridad.
- Una sola resolución por imagen (2000 px). Si hace falta, se pueden generar miniaturas más adelante.
- Cambiar a almacenamiento de objetos solo requiere otra implementación de `FileStorage`.
