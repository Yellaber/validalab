## Why

Con E0 (`usuarios`) ya definido en el contrato, el siguiente paso del camino crítico del MVP es **E1 (portafolio de ideas)**: la `Idea` es, junto al `Usuario`, una de las dos entidades raíz del dominio; de ella cuelga todo lo demás (hipótesis, contactos, entrevistas, KPIs, veredictos). Sin el contrato del módulo `ideas`, frontend y backend no pueden construir el portafolio sobre el que se apoyan las épicas siguientes.

## What Changes

- **Definir el contrato del módulo `ideas`** (épica E1) bajo el `tag` `ideas`: crear una idea, listar las ideas propias (paginado, filtrable por estado), consultar una idea, editar su contenido, archivar una idea descartada conservando su evidencia y reabrir (desarchivar) una idea archivada para retomarla.
- **Añadir los schemas de dominio** a `components.schemas`: `Idea` (con `ownerId` de solo lectura), `EstadoIdea` (`borrador`|`en_validacion`|`go`|`pivote`|`kill`|`archivada`), `CrearIdeaRequest`, `ActualizarIdeaRequest`, `IdeasPaginadas`.
- **Reflejar el aislamiento multi-tenant (RF-02, RNF-04/05):** todas las rutas operan solo sobre ideas del usuario autenticado; el `ownerId` se deriva del token y solicitar una idea ajena devuelve `403 ACCESO_DENEGADO`.
- **Respetar las convenciones ya definidas** y reutilizar componentes existentes (`bearerAuth` global, `Error`/`CodigoError`, parámetros de paginación, respuestas compartidas).

## Capabilities

### New Capabilities
- `ideas`: Portafolio de ideas de ValidaLab (épica E1) — alta, consulta, edición y listado de las ideas propias con su estado de validación, y archivado de ideas descartadas conservando su evidencia, todo aislado por usuario. La expresión de esta capacidad es el detalle del `tag` `ideas` en el contrato de API.

### Modified Capabilities
<!-- `contrato-api` no cambia: este detalle se añade respetando sus reglas, no las modifica. -->

## Impact

- **`contrato-api/openapi.yaml`:** se llenan los `paths` del `tag` `ideas` y se añaden sus schemas de dominio. No se tocan otros módulos.
- **Convenciones:** se reutilizan los componentes existentes; este cambio no introduce convenciones ni códigos de error nuevos.
- **Equipos:** frontend (pantallas de portafolio/listado/detalle de idea) y backend (módulo NestJS `ideas`) ya pueden desarrollar E1 contra el contrato.
- **Fuera de alcance:** hipótesis y umbrales kill/go (E2), KPIs (E5), veredicto del agente (E6) y todo código de runtime. Las transiciones de estado a `go`/`pivote`/`kill` provienen del veredicto aprobado (E6), no se editan en E1.
