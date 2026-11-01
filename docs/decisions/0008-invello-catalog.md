# 0008 — Catálogo del proveedor desde Invello

- **Estado:** Aceptada (modifica en parte [0003](0003-independent-inventory.md))
- **Fecha:** 2026-11-01

## Contexto

El proveedor (DELIFLOW CORP) publica su catálogo, precios y existencias en la API pública de solo lectura de Invello
(`https://api.invello.com/api/public/v1`, una API key por tienda). El dueño quiere ver esos productos en el panel,
decidir cuáles vende, partir del precio del proveedor pudiendo cambiarlo, y mostrar el stock que tiene el proveedor.

## Decisión

- El módulo `integrations` guarda una copia del catálogo en `invello_products`, sincronizada por el worker cada
  10 minutos (incremental con `updated_since`, completa una vez al día) y con el botón "Sync now" del panel.
- Nada se vende automáticamente: el administrador pulsa **Add to store** en un producto. Se crea un producto propio con el SKU
  del proveedor, el precio que indique (por defecto el del proveedor), el precio del proveedor como coste y la
  categoría del proveedor (creada si no existe), y queda vinculado (`invello_products.variantId`).
- **Precio:** la sincronización nunca cambia el precio de venta; solo actualiza el precio del proveedor que se
  muestra como referencia en el panel.
- **Existencias:** para las variantes vinculadas, Invello es la fuente de verdad. Cada sincronización fija el físico
  al disponible del proveedor (0 si lo descontinúa) mediante `inventory.setSupplierStock`, con movimiento
  `SUPPLIER_SYNC` y sin bajar nunca de lo reservado. El resto de productos sigue con inventario manual (ADR 0003).
- **Fotos:** solo se descargan las de los productos que se venden. Al venderlo se descarga en segundo plano su foto
  principal (la primera de Invello) para que no quede sin imagen; el resto las elige el administrador en la ficha del
  producto; cada una se descarga y se guarda en el VPS como una importación por URL (ADR 0006). Las
  miniaturas del panel se generan en el servidor y se guardan en el almacenamiento privado, porque Invello no permite
  enlazar sus imágenes desde otro dominio y las sirve despacio.

## Consecuencias

- La tienda sigue funcionando si Invello no responde: solo se retrasan las actualizaciones de stock.
- Un ajuste manual del stock de una variante vinculada se sobrescribe en la siguiente sincronización.
- La API key solo vive en el entorno del servidor (`INVELLO_API_KEY`); sin ella la integración queda desactivada.
