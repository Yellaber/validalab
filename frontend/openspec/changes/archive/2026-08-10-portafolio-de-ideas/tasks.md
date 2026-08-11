## 1. Modelos del contrato (core/api)
- [x] 1.1 `core/api/idea.model.ts`: `Idea`, `EstadoIdea` (`borrador`|`en_validacion`|`go`|`pivote`|`kill`|`archivada`), `CrearIdeaRequest` (`titulo`, `problema` requeridos; `descripcion`, `segmentoBeachhead` opcionales) y `ActualizarIdeaRequest`, reflejando el tag `ideas` del OpenAPI (sin `ownerId` en los requests).
- [x] 1.2 `core/api/paginacion.model.ts`: sobre genérico `RespuestaPaginada<T>` + `Paginacion` (`pagina`, `porPagina`, `total`, `totalPaginas`), reflejando el contrato.

## 2. Servicio de recurso de ideas (portafolio-de-ideas)
- [x] 2.1 `features/ideas/ideas.service.ts` (`providedIn: 'root'`) con `crear`, `listar` (params `pagina`/`porPagina`/`estado?`), `consultar`, `editar`, `archivar`, `desarchivar`, tipados contra el contrato; sin `HttpClient` en los componentes y sin enviar `ownerId`.
- [x] 2.2 Test: cada método pega a la ruta/método correctos del tag `ideas`; el listado propaga `pagina`/`porPagina`/`estado`; ningún request incluye `ownerId`.

## 3. Listado del portafolio (portafolio-de-ideas)
- [x] 3.1 `features/ideas/lista/` — carga con `httpResource` reactivo a signals de `pagina`/`porPagina`/`estado`; renderiza cada idea con `titulo` y `estado`; controles de paginación derivados de `paginacion`.
- [x] 3.2 Filtro por `estado` que reemite la consulta; estados de **carga**, **vacío** (sin ideas / sin coincidencias) y **error** (ramificando por `codigo`, con reintento).
- [x] 3.3 Test (Act–Wait–Assert, `whenStable`): listado inicial pide con paginación; cambiar filtro reemite con `estado`; página vacía muestra estado vacío (no error); `ERROR_RED` muestra error con reintento.

## 4. Alta y edición de idea (portafolio-de-ideas)
- [x] 4.1 `features/ideas/formulario/` — componente Signal Forms reutilizable (`titulo`, `descripcion`, `problema`, `segmentoBeachhead`); `titulo`/`problema` `required`; **sin** control de `estado`.
- [x] 4.2 Modo alta: valores iniciales vacíos → `POST /ideas`; al `201` navega a la idea creada (estado `borrador`). Modo edición: inicializa con la idea cargada → `PATCH /ideas/{id}`.
- [x] 4.3 Mapear `422 VALIDACION_FALLIDA` a errores por campo desde `detalles`; validación local deshabilita el envío mientras el formulario sea inválido.
- [x] 4.4 Test: envío válido llama a `crear`/`editar`; validación local bloquea el envío; `VALIDACION_FALLIDA` se muestra campo a campo; el formulario no expone forma de fijar `go`/`pivote`/`kill`.

## 5. Detalle y acciones de estado (portafolio-de-ideas)
- [x] 5.1 `features/ideas/detalle/` — consume `GET /ideas/{id}`; muestra `titulo`, `descripcion`, `problema`, `segmentoBeachhead`, `estado`; ofrece editar/archivar/desarchivar según el `estado`.
- [x] 5.2 Acción **archivar** (`POST /ideas/{id}/archivar`) → refleja `archivada`; acción **desarchivar** (`POST /ideas/{id}/desarchivar`, solo si `archivada`) → refleja `borrador`; tras mutar se recarga el detalle/listado.
- [x] 5.3 Ramificar errores: `403 ACCESO_DENEGADO` → acceso denegado sin revelar datos; `404 RECURSO_NO_ENCONTRADO` → no encontrado; `409 CONFLICTO` en desarchivar → "la idea no está archivada".
- [x] 5.4 Test: detalle propio muestra contenido y estado; archivar/desarchivar llaman al endpoint y reflejan el nuevo estado; `403` y `404` muestran sus estados; `409` al desarchivar muestra el mensaje sin romper la vista.

## 6. Rutas y navegación (shell-y-navegacion)
- [x] 6.1 `app.routes.ts`: rutas hijas del shell con carga diferida — `''` (listado), `nueva` (alta), `:id` (detalle), `:id/editar` (edición); el índice del shell pasa a ser el listado.
- [x] 6.2 Retirar `features/shell/inicio/` (marcador de posición) y ajustar cualquier enlace del shell hacia el portafolio.
- [x] 6.3 Test de rutas (`RouterTestingHarness`): la ruta por defecto del shell renderiza el listado; las rutas de `ideas` cuelgan del shell (protegidas por el `sesionGuard` del padre).

## 7. Verificación
- [x] 7.1 `npm run build` sin errores.
- [x] 7.2 `npm test -- --no-watch` en verde (servicio, listado, formulario, detalle, rutas).
- [x] 7.3 `npx prettier --check` sobre los archivos nuevos/modificados.
- [x] 7.4 `npx openspec validate portafolio-de-ideas --strict` en verde.
