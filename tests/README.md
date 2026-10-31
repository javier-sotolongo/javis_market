# Pruebas transversales

| Tipo        | Herramienta | Dónde                | Comando                             | Requiere                                                         |
| ----------- | ----------- | -------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| Unitarias   | Vitest      | `*/src/**/*.test.ts` | `npm test`                          | Nada                                                             |
| Integración | Vitest      | `tests/integration/` | `npm run test:integration`          | `TEST_DATABASE_URL`                                              |
| e2e         | Playwright  | `tests/e2e/`         | `npm run build && npm run test:e2e` | `E2E_DATABASE_URL`, Chromium (`npx playwright install chromium`) |

Las bases de datos de pruebas deben tener "test" en el nombre: las pruebas aplican las migraciones y **vacían todas
las tablas**. Nunca apuntes estas variables a la base de datos de desarrollo o producción.

Las pruebas de integración cubren la concurrencia de inventario (sin sobreventa), reglas del catálogo, carrito,
procesado de imágenes e inicio de sesión. Las e2e recorren el panel (login, categoría, producto, foto, publicación,
inventario) y la tienda (ficha, carrito).
