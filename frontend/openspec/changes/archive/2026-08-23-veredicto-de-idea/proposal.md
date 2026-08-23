## Why

Con E5 cerrada el usuario ve sus KPIs frente a los umbrales que fijó, pero la **decisión** sigue siendo suya a ojo. E6 es donde el Validador Inteligente entra: pondera esos KPIs y **propone** un juicio `go`/`pivote`/`kill` razonado, KPI por KPI, con su nivel de confianza.

Es el componente distintivo del producto y su principio de diseño más delicado: **modo consultivo**. El agente nunca decide en firme. El veredicto nace `pendiente` y la idea solo cambia de estado cuando el humano lo **aprueba**; puede también **anularlo** con una nota. Se conservan siempre ambas versiones —la del agente y la del usuario— aunque difieran.

El backend ya expone el tag `agente` completo (E6 backend, archivado). Este change lo lleva al cliente. Se construye contra `../contrato-api/openapi.yaml` (tag `agente`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/veredicto.model.ts`): `Veredicto`, `TipoVeredicto` (go/pivote/kill), `EstadoVeredicto` (pendiente/aprobado/anulado), `JustificacionKpi`, `VerificacionVeredicto` y `VerificarVeredictoRequest`. Reutiliza `Kpi` (E2) y `KpiCalculado` (E5): el `snapshotKpis` congela los mismos KPIs del tablero.
- **Servicio de recurso** (`features/ideas/veredicto/`): `VeredictoService` con `emitir` (POST sin cuerpo), `listar`/`solicitudHistorial` (paginado), `solicitudDetalle` y `verificar` (aprobar/anular). Nunca envía `ownerId` ni el bloque del agente.
- **Historial + emitir** (`ideas/:id/veredictos`): lista paginada de veredictos con su juicio, estado y confianza, y la acción de **emitir** uno nuevo, que invoca al agente y lleva al veredicto recién emitido. Traduce `409` (sin BYOK), `502` (salida inválida) y `503` (proveedor no disponible) a avisos claros.
- **Detalle + verificación** (`ideas/:id/veredictos/:idVeredicto`): el juicio, el razonamiento por KPI (con nombre legible del catálogo compartido), las recomendaciones, el proveedor/modelo y el `snapshotKpis` congelado, más el **gobierno consultivo**: aprobar (hace firme el veredicto y cambia el estado de la idea) o anular (exige una nota, no cambia la idea), solo mientras está `pendiente`.
- **Rutas y navegación**: dos rutas hijas protegidas con carga diferida; el detalle de la idea gana el acceso a su veredicto junto a hipótesis, umbrales, contactos, entrevistas y tablero; el resaltado de `Ideas` sobrevive a las rutas de veredicto.

**Reutilización**: el nombre legible de cada KPI sale de `catalogo-kpi.ts` y el formateo de valores de `unidad-kpi.ts` (E2/E5), para que el snapshot se lea igual que el tablero. La plomería HTTP (interceptor de autorización, traducción a `ErrorApi`) y los patrones de `httpResource` + Signal Forms del resto del cliente se reutilizan sin reimplementar.

**Fuera de alcance**: la configuración BYOK (E7) —el veredicto solo la asume y avisa cuando falta—; el costo agregado (E8); y cualquier cálculo del veredicto o de los KPIs en el cliente: el cliente **lee** el juicio y el snapshot que produce el servidor, no los deriva.

## Capabilities

### New Capabilities
- `veredicto-de-idea`: presentación en el cliente del veredicto del Validador Inteligente sobre una idea —emitirlo invocando al agente, listar su historial paginado, ver su detalle (juicio, razonamiento por KPI, recomendaciones, proveedor/modelo y snapshot congelado) y el gobierno consultivo de su verificación humana (aprobar o anular con nota)— en modo consultivo, sin que el cliente calcule ni reinterprete nada.

### Modified Capabilities
- `portafolio-de-ideas`: el detalle de una idea ofrece además el acceso a su **veredicto**, junto a los de hipótesis, umbrales, contactos, entrevistas y tablero.
- `shell-y-navegacion`: el shell aloja dos rutas hijas protegidas más del dominio `ideas` (historial de veredictos y detalle de un veredicto) con carga diferida, y el resaltado de `Ideas` sobrevive a ellas.

## Impact

- **Código**: nuevo árbol `src/app/features/ideas/veredicto/` (servicio, historial, detalle, etiquetas y sus specs). `core/api/` gana `veredicto.model.ts`. `app.routes.ts` incorpora las dos rutas. El detalle de idea gana un enlace más.
- **Dependencias**: ninguna nueva.
