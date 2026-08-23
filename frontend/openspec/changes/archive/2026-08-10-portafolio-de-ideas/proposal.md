## Why

Tras el E0, el frontend ya sabe autenticar, mantener la sesión y proteger rutas, pero el shell autenticado solo muestra un **marcador de posición**: no hay ninguna UI de dominio. La `Idea` es la entidad raíz de ValidaLab y todo lo demás (hipótesis, contactos, entrevistas, KPIs, veredictos) cuelga de ella; sin una pantalla para **crear, listar, consultar, editar y archivar** ideas, el usuario no puede empezar a validar nada. Este change entrega el primer corte de dominio del cliente —el **portafolio de ideas** (E1)— reemplazando el marcador de la pantalla de inicio por la funcionalidad real y estableciendo el patrón de feature de dominio (servicio de recurso, modelos del contrato, estado por `resource`, formularios y rutas) sobre el que se montarán E2–E7.

Se construye contra `../contrato-api/openapi.yaml` (tag `ideas`, endpoints de idea: `POST/GET/PATCH /ideas`, `GET /ideas/{id}`, `POST /ideas/{id}/archivar|desarchivar`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/`): tipos TypeScript que reflejan el tag `ideas` del OpenAPI — `Idea`, `EstadoIdea`, `CrearIdeaRequest`, `ActualizarIdeaRequest`, y los sobres genéricos de colección `RespuestaPaginada<T>` / `Paginacion`. Fuente: el contrato, no el backend.
- **Servicio de recurso de ideas** (`features/ideas/`): un `IdeasService` inyectable que encapsula las llamadas HTTP del tag `ideas` (crear, listar paginado con filtro por `estado`, consultar por id, editar, archivar, desarchivar). El interceptor de autorización del E0 adjunta el `Bearer` y renueva ante `401` de forma transparente; el aislamiento por `ownerId` lo garantiza el backend.
- **Listado del portafolio** (`features/ideas/lista/`): página que consume `GET /ideas` con estado por `resource`/signals, muestra las ideas propias con su `estado`, ofrece **paginación** (`pagina`/`porPagina`) y **filtro por estado**, y estados vacío/cargando/error. Es la nueva pantalla de inicio del shell.
- **Alta de idea** (`features/ideas/formulario/`): formulario con **Signal Forms** (`titulo` y `problema` obligatorios; `descripcion` y `segmentoBeachhead` opcionales) que hace `POST /ideas`; muestra `VALIDACION_FALLIDA` campo a campo. La idea nace en `borrador`.
- **Detalle de idea** (`features/ideas/detalle/`): consume `GET /ideas/{id}`, muestra el contenido y el `estado`, y ofrece las acciones de **editar**, **archivar** y **desarchivar** según el estado actual.
- **Edición de idea**: reutiliza el formulario de Signal Forms para `PATCH /ideas/{id}` sobre `titulo`, `descripcion`, `problema`, `segmentoBeachhead`. El `estado` (`go`/`pivote`/`kill`) **no** es editable aquí: proviene del veredicto aprobado (E6).
- **Archivar / desarchivar**: acciones `POST /ideas/{id}/archivar` y `POST /ideas/{id}/desarchivar` que conservan la evidencia; desarchivar solo aplica a una idea `archivada` (un `409 CONFLICTO` se traduce a un mensaje claro).
- **Rutas de ideas y navegación**: rutas hijas protegidas bajo el shell (`/ideas`, `/ideas/nueva`, `/ideas/:id`, `/ideas/:id/editar`) con carga diferida; la ruta por defecto del shell pasa a ser el **listado del portafolio** en lugar del marcador de posición.

**Fuera de alcance** (irá en changes posteriores): hipótesis y umbrales kill/go por idea (E2 — mismo tag `ideas` del contrato, pero otra épica), el CRM de contactos (E3), entrevistas y scoring (E4), el tablero de KPIs (E5), y el veredicto del agente (E6). El `estado` `en_validacion` y las transiciones de veredicto se **muestran** pero no se originan aquí.

## Capabilities

### New Capabilities
- `portafolio-de-ideas`: gestión del portafolio de ideas en el cliente — crear, listar (paginado y filtrado por estado), consultar, editar, archivar y desarchivar las ideas propias, con sus estados de carga/vacío/error y la traducción de los errores del contrato (`VALIDACION_FALLIDA`, `CONFLICTO`, `ACCESO_DENEGADO`, `RECURSO_NO_ENCONTRADO`).

### Modified Capabilities
- `shell-y-navegacion`: la ruta por defecto del shell autenticado deja de ser el marcador de posición y pasa a renderizar el **listado del portafolio de ideas**; se incorporan las rutas hijas protegidas del dominio `ideas` con carga diferida.

## Impact

- **Código**: nuevo árbol `src/app/features/ideas/` (servicio, modelos co-localizados o en `core/api/`, y componentes de lista, formulario y detalle con sus specs). `core/api/` gana `idea.model.ts` y los sobres `RespuestaPaginada`/`Paginacion`. `app.routes.ts` incorpora las rutas hijas de `ideas` bajo el shell y cambia la ruta índice. Se retira/absorbe el componente `features/shell/inicio/` (marcador de posición).
- **Dependencias**: ninguna nueva — `@angular/common/http`, `@angular/router`, `@angular/forms/signals` ya están presentes.
- **Contrato**: consume el tag `ideas` del OpenAPI (solo los endpoints de la entidad `Idea`); **no** lo modifica. Los endpoints de hipótesis y umbrales del mismo tag quedan para E2.
- **Zoneless**: todo el estado que la vista lee es signal (`resource`/`signal`/`computed`); el trabajo asíncrono refresca la UI a través de signals, sin Zone.js.
- **Aislamiento multi-tenant**: el cliente nunca envía `ownerId`; el filtrado por propietario y las respuestas `403 ACCESO_DENEGADO` las gobierna el backend. La UI solo ramifica por el `codigo` estable del error.
