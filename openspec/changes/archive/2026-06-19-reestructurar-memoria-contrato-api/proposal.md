## Why

`CLAUDE.md` debe ser la **fuente de verdad integral** del proyecto: el único punto de entrada que tanto `frontend/` como `backend/` consultan para ejecutar sus responsabilidades por separado, sin que ninguno conozca el código del otro. Hoy no existe un **contrato de API** que desacople a los dos equipos. Embeber ese contrato completo dentro de `CLAUDE.md` haría que la memoria crezca sin control a medida que el proyecto escale, degradando su utilidad como contexto.

## What Changes

- **Introducir el contrato de API como fuente de verdad** que dirige el desarrollo de frontend y backend, de modo que cada equipo desarrolle contra el contrato sin conocer el código del otro.
- **Definir el contrato como artefacto canónico** fuera de `CLAUDE.md`, en una ubicación única que consumen ambos equipos: un **único documento OpenAPI** vinculante (no fragmentado por módulos), organizado internamente por `tags` de dominio (`usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`).
- **Fijar las convenciones transversales del contrato** que ambos equipos deben honrar siempre: autenticación, aislamiento multi-tenant por `owner_id`, formato de error, paginación y convención de nombres.
- **Solución al crecimiento de la memoria:** el detalle endpoint-por-endpoint —voluminoso y de cambio rápido— vive en los ficheros del contrato, no en `CLAUDE.md`. La memoria solo retiene lo estable (convenciones transversales + un índice navegable del contrato), de modo que crece lento. La consulta sigue siendo **integral** porque `CLAUDE.md` enlaza a cada pieza del contrato; seguir el índice alcanza todo el detalle sin romper el flujo de ninguno de los dos equipos.

## Capabilities

### New Capabilities
- `contrato-api`: Establece el contrato de API como artefacto canónico y única fuente de verdad entre frontend y backend — su ubicación, formato (un único documento OpenAPI, navegable por `tags` de dominio), convenciones transversales y la estrategia en capas (índice + resumen de convenciones en `CLAUDE.md`; detalle en el OpenAPI) que evita que la memoria crezca sin control, sin que ningún equipo dependa del código del otro.

### Modified Capabilities
<!-- No existen specs previos en openspec/specs/; no se modifican capacidades existentes. -->

## Impact

- **`CLAUDE.md` (raíz):** se le añade el bloque de contrato de API como índice navegable + convenciones transversales (no el contrato completo).
- **Nueva ubicación de contrato** (`contrato-api/` en la raíz del monorepo): un único documento OpenAPI (`openapi.yaml`, navegable por `tags` de dominio), consumido por `frontend/` y `backend/`.
- **`frontend/CLAUDE.md` y `backend/CLAUDE.md`:** pasan a referenciar el contrato y la raíz como fuente de verdad; no se duplica el contrato en cada paquete.
- **Flujo de equipos:** frontend y backend desarrollan contra el mismo contrato sin acoplarse entre sí; el contrato evoluciona en sus ficheros sin inflar la memoria.
