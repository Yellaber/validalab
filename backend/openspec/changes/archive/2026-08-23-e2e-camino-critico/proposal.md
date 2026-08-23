## Why

El workflow de CI ejecuta un paso llamado «E2E tests» que **no puede fallar**. `backend/test/` contiene un único archivo —`jest-e2e.json`— y ni una sola spec; el script lleva `--passWithNoTests`, así que el paso pasa siempre, en cada PR, desde que existe. El repositorio declara una cobertura que no tiene.

No es una laguna cosmética. Los invariantes que sostienen el producto multi-tenant son precisamente los que un test unitario **no puede** verificar, porque solo existen cuando concurren base de datos real, guards reales y HTTP real:

- El **aislamiento por `owner_id`**: que el tenant A no vea ni toque nada del B, y que un `owner_id` enviado por el cliente se ignore en favor del derivado del token.
- El **RBAC**: que un `validador` reciba `403` en las operaciones de administración de cuentas.
- El **ciclo de sesión**: que el refresh rote la cookie `HttpOnly` y que el logout la invalide de verdad.
- La **inicialización de un solo uso**: que el segundo intento reciba `409` aunque presente el secreto correcto.

Los tests unitarios cubren cada pieza por separado con dobles; ninguno prueba que el cableado real las una como se espera. Este change convierte ese paso del CI en algo que puede ponerse en rojo.

## What Changes

- **Cuatro specs e2e** sobre el camino crítico: `sesion`, `aislamiento`, `rbac` y `sistema`. Cubren los invariantes de arriba contra la aplicación completa, levantada como en producción.
- **Utilidades compartidas** en `test/utils/`: arranque de la app, limpieza de la base entre tests y alta de tenants autenticados. Son la base sobre la que después se extiende la cobertura dominio a dominio sin repetir andamiaje.
- **`configurarApp(app)` extraído** de `main.ts` a una función compartida que aplican tanto el arranque real como el e2e. Hoy `main.ts` monta `cookieParser()` fuera de todo módulo; replicarlo en los tests significaría probar una app *parecida* a la de producción en vez de la misma. Con la función compartida, cualquier añadido futuro al bootstrap queda cubierto automáticamente.
- **Base de datos de test propia**, con las migraciones aplicadas antes de la suite —lo que de paso las verifica en cada ejecución— y limpieza entre tests.
- **`--passWithNoTests` eliminado** del script `test:e2e`. Si algún día no hay specs, el CI debe fallar, no aprobar en silencio.
- **PostgreSQL en el CI**: el job del backend gana un `services: postgres` con healthcheck. Sin base de datos en el runner no hay e2e posible, y esa es la razón real de que el paso naciera vacío.

**Fuera de alcance**: cobertura e2e por dominio (ideas, contactos, entrevistas, kpis, veredicto, proveedores), que queda como extensión natural sobre estas utilidades; tests de carga o rendimiento; y e2e del frontend, que no tiene framework configurado.

## Capabilities

### New Capabilities
- `pruebas-e2e-del-backend`: verificación extremo a extremo de los invariantes que solo se manifiestan con la aplicación completa —aislamiento multi-tenant, RBAC, ciclo de sesión con cookie e inicialización de un solo uso—, ejecutada contra PostgreSQL real y con las migraciones como esquema, tanto en local como en CI.

### Modified Capabilities
<!-- Ninguna. Ningún requisito de comportamiento cambia: este change verifica los que ya existen. `arranque-plataforma` tampoco cambia — extraer `configurarApp` reorganiza dónde vive el bootstrap, no qué hace. -->

## Impact

- **Código**: nuevo `src/app-setup.ts` (o equivalente) con `configurarApp`, invocado desde `main.ts`; `main.ts` se reduce a crear la app, configurarla y escuchar.
- **Tests**: nuevo `test/utils/` y cuatro `*.e2e-spec.ts`. `test/jest-e2e.json` gana `setupFiles` y ejecución en serie.
- **`package.json`**: `test:e2e` pierde `--passWithNoTests`.
- **CI (`.github/workflows/ci.yml`)**: el job `Backend (NestJS)` gana un servicio PostgreSQL y las variables de entorno del paso e2e. Es el único archivo fuera de `backend/` que se toca.
- **Contrato**: **no lo toca**. Este change verifica el contrato ya implementado; no añade ni modifica endpoints.
- **Tiempo de CI**: el job del backend crece por el arranque del contenedor y la ejecución de 16 migraciones. Se asume a cambio de que el paso deje de ser decorativo.
- **Sin dependencias nuevas**: `supertest` y `@nestjs/testing` ya están en `devDependencies`.
