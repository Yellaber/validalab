## Context

E1 es el primer feature de **dominio** del frontend: hasta ahora `core/` (HTTP, errores, sesión) y `features/{auth,shell}` existen, pero la pantalla de inicio del shell es un marcador de posición (`features/shell/inicio/`). Este change lo reemplaza por el portafolio de ideas y, al hacerlo, fija el **patrón de referencia** para las épicas de dominio que siguen (contactos, entrevistas…): servicio de recurso + modelos del contrato + carga reactiva por signals + formularios + rutas hijas del shell.

Restricciones heredadas del E0 y de `frontend/CLAUDE.md`: Angular 22 standalone, **zoneless** (detección por signals), organización **por feature**, contrato en español como fuente de verdad, y la plomería HTTP ya resuelta (interceptor de autorización con `Bearer`+refresh, `errorInterceptor` → `ErrorApi` ramificable por `codigo`). Las mecánicas concretas de Angular las gobierna la skill `angular-developer`; aquí solo se resuelven las tensiones no triviales.

## Goals / Non-Goals

**Goals:**
- CRUD de la entidad `Idea` en el cliente (crear, listar, consultar, editar) + archivar/desarchivar, contra el tag `ideas` del contrato.
- Listado paginado con filtro por `estado` y estados de carga/vacío/error, todo reactivo por signals.
- Formulario reutilizable (alta y edición) con Signal Forms.
- Establecer el patrón de feature de dominio reutilizable por E2–E7.
- Rutas hijas del shell con carga diferida; el índice del shell pasa a ser el listado.

**Non-Goals:**
- Hipótesis y umbrales kill/go por idea (E2), aunque compartan el tag `ideas` del contrato.
- Originar transiciones de veredicto (`go`/`pivote`/`kill`) — solo se **muestran** (provienen de E6); ni el estado `en_validacion` (se origina con entrevistas, E4).
- Notificaciones/toasts globales: los errores se muestran en la propia vista (igual que en E0); se robustecerán cuando haya más features.
- Búsqueda por texto, ordenamiento configurable o borrado de ideas (el contrato ofrece archivar, no `DELETE /ideas`).

## Decisions

### D1 — Servicio de recurso `IdeasService` (`providedIn: 'root'`) que envuelve el tag `ideas`
Un único servicio inyectable concentra las seis llamadas HTTP (`crear`, `listar`, `consultar`, `editar`, `archivar`, `desarchivar`) devolviendo los tipos del contrato. Los componentes no tocan `HttpClient` directamente. El interceptor del E0 hace transparente el `Bearer`+refresh y la traducción de error, así que el servicio no repite esa lógica. Alternativa descartada: un servicio por operación o llamadas desde el componente — dispersa el contrato y duplica el mapeo de rutas.

### D2 — Carga del listado con `httpResource` reactivo a signals de `pagina`/`porPagina`/`estado`
El listado se modela con un recurso HTTP declarativo cuya *request* deriva de los signals de paginación y filtro: al cambiar la página o el filtro, el recurso se reejecuta solo. Expone `value`/`isLoading`/`error` como signals, que la vista consume directamente — encaje natural con zoneless y con los estados carga/vacío/error del spec. Las **mutaciones** (crear/editar/archivar/desarchivar), en cambio, son imperativas en `IdeasService` (devuelven la `Idea`), y tras completarse se dispara un **reload** del recurso del listado. Alternativa descartada: gestionar el listado con `BehaviorSubject`/RxJS manual — reintroduce ceremonia que los signals evitan y choca con el mandato zoneless.

### D3 — Un formulario Signal Forms reutilizado por alta y edición
El mismo componente de formulario sirve para crear y editar: el modelo es `signal({ titulo, descripcion, problema, segmentoBeachhead })` con validadores (`titulo` y `problema` `required`; los otros opcionales). En alta parte de cadenas vacías → `POST`; en edición se **inicializa con la idea cargada** → `PATCH`. El formulario **no** modela `estado`: las transiciones de veredicto no son editables (E6). Se mantiene el patrón del E0 (valores iniciales cadena vacía, submit async, errores del backend mapeados a `detalles`). Alternativa descartada: dos formularios separados — duplica validación y plantilla.

### D4 — Modelos del contrato a mano en `core/api/`, con sobre de paginación genérico
Siguiendo el E0 (D5), los tipos de `ideas` se escriben a mano reflejando el OpenAPI: `Idea`, `EstadoIdea`, `CrearIdeaRequest`, `ActualizarIdeaRequest` en `core/api/idea.model.ts`. Además se introduce el sobre **genérico** `RespuestaPaginada<T>` + `Paginacion` en `core/api/` (transversal, lo reutilizarán contactos/entrevistas). Alternativa descartada: generar tipos desde el OpenAPI — aún no hay pipeline; se reevaluará cuando crezca la superficie.

### D5 — Rutas hijas de `ideas` bajo el shell; el índice del shell es el listado
`app.routes.ts` añade, como hijos de la ruta del shell (ya protegida por `sesionGuard`), las rutas `''` (listado), `nueva` (alta), `:id` (detalle) y `:id/editar` (edición), todas con `loadComponent`. El componente marcador `features/shell/inicio/` se retira y su lugar lo toma el listado. Al colgar del shell, `CanMatch` del padre ya impide cargar los chunks sin sesión, sin guards adicionales. Alternativa descartada: un feature-route con su propio guard — redundante con la protección del shell.

### D6 — Ramificación de la UI por `codigo` del `ErrorApi`, nunca por `mensaje`
Cada vista traduce los errores del contrato por su `codigo` estable: `VALIDACION_FALLIDA` → errores por campo desde `detalles`; `ACCESO_DENEGADO` → acceso denegado sin revelar datos; `RECURSO_NO_ENCONTRADO` → no encontrado; `CONFLICTO` (solo en desarchivar) → "la idea no está archivada"; `ERROR_RED`/`ERROR_INTERNO` → error con reintento. Reafirma D4 del E0 en el terreno de dominio.

## Risks / Trade-offs

- **Recarga del listado tras mutar** → tras crear/editar/archivar/desarchivar se recarga el recurso del listado (y/o del detalle) para no mostrar estado obsoleto; se acepta la petición extra frente a mantener un caché manual que podría desincronizarse.
- **`estado` mostrado pero no gobernado aquí** → `en_validacion`/`go`/`pivote`/`kill` provienen de otras épicas; la UI debe renderizarlos como solo-lectura sin ofrecer transiciones, para no prometer acciones que E1 no implementa. Mitigación: las acciones se derivan del `estado` (editar/archivar disponibles en activos; desarchivar solo en `archivada`).
- **Sobre `RespuestaPaginada<T>` genérico introducido aquí** → si su forma no encaja con futuras colecciones se pagaría un refactor. Mitigación: se modela exactamente como el `RespuestaPaginada`/`Paginacion` del contrato, que es transversal por diseño.
- **Estado vacío vs. error confundibles** → una página vacía (200 sin datos) no es un error; se distinguen explícitamente para no mostrar un error donde solo falta crear la primera idea.
