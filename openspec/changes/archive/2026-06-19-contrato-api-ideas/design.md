## Context

El contrato (`contrato-api/openapi.yaml`) ya tiene el módulo `usuarios` (E0) y las convenciones transversales. Este cambio llena el `tag` `ideas` (E1). La `Idea` es entidad raíz del dominio (junto a `Usuario`): pertenece a un usuario por `owner_id` y de ella cuelgan hipótesis, contactos, entrevistas, KPIs y veredictos. E1 cubre solo el portafolio (HU-01/02/03, RF-01, RF-26); las demás piezas son épicas posteriores.

## Goals / Non-Goals

**Goals:**
- Definir en el contrato CRUD de portafolio + archivado/reapertura de ideas, aislado por usuario.
- Reutilizar convenciones y componentes existentes (paginación, errores, auth).
- Mantener el contrato como un único documento (solo se añade bajo el `tag` `ideas` y en `components`).

**Non-Goals:**
- **No** hipótesis ni umbrales kill/go (E2), KPIs (E5), veredicto del agente (E6).
- **No** código de runtime (módulo NestJS, persistencia, guardas).
- **No** se modela el borrado físico de ideas: se archivan y se pueden reabrir (RF-26).

## Decisions

### Decisión 1: Endpoints del módulo (todos autenticados)
- `POST /ideas` — crear (estado inicial `borrador`).
- `GET /ideas` — listar propias, paginado, filtro opcional `?estado=`.
- `GET /ideas/{id}` — consultar propia.
- `PATCH /ideas/{id}` — editar contenido propio.
- `POST /ideas/{id}/archivar` — archivar conservando evidencia.
- `POST /ideas/{id}/desarchivar` — reabrir una idea archivada para retomarla.
- **Por qué acciones `POST .../archivar` y `.../desarchivar` y no `PATCH estado`:** archivar/reabrir son acciones de dominio con semántica propia (RF-26, conservar evidencia), no ediciones libres de estado. Aislarlas evita que el cliente fije estados arbitrarios y deja explícita la transición.

### Decisión 2: `EstadoIdea` y de dónde viene cada transición
- Enum `EstadoIdea`: `borrador` | `en_validacion` | `go` | `pivote` | `kill` | `archivada`.
- `borrador` lo asigna la creación. `archivada` la asigna `POST .../archivar`. `desarchivar` devuelve la idea a `borrador`.
- `go`/`pivote`/`kill` **no** se fijan por edición: provienen del veredicto aprobado del agente (E6, modo consultivo). El contrato del módulo `ideas` los expone como valores posibles del enum, pero su transición se definirá en el módulo `agente`.
- **Por qué `desarchivar` vuelve a `borrador`:** es un punto de partida activo y predecible para "retomar" la idea, sin necesidad de que el contrato rastree el estado previo al archivado. La evidencia nunca se borró, así que se conserva. (Runtime podría, más adelante, restaurar el estado previo sin romper el contrato.)
- **Por qué no permitir editar el estado en `PATCH`:** mantiene la regla del SRS de que la idea solo cambia de estado tras aprobación humana del veredicto; evita un camino paralelo que rompa la trazabilidad.
- **Transición a `en_validacion`:** se origina cuando empieza el trabajo de descubrimiento (entrevistas, E4); se define fuera de E1 para no anticipar ese módulo.

### Decisión 3: Schemas de dominio (en `components.schemas`)
- `Idea`: `id` (uuid), `ownerId` (uuid, **solo lectura**), `titulo`, `descripcion`, `problema`, `segmentoBeachhead`, `estado` (`EstadoIdea`), `fechaCreacion`, `fechaActualizacion`.
- `CrearIdeaRequest`: `titulo`, `descripcion`, `problema`, `segmentoBeachhead` (sin `ownerId` ni `estado`).
- `ActualizarIdeaRequest`: los mismos campos de contenido, todos opcionales; **sin** `estado` ni `ownerId`.
- `IdeasPaginadas`: `allOf` de `RespuestaPaginada` estrechando `datos` a `Idea` (mismo patrón que `UsuariosPaginados`).
- **Por qué `ownerId` de solo lectura en la respuesta:** informa la pertenencia para depuración/trazabilidad, pero nunca se acepta como entrada (regla de aislamiento).

### Decisión 4: Aislamiento y mapeo de errores
- Toda ruta `{id}` sobre una idea ajena → `403 ACCESO_DENEGADO` (convención del contrato: no revelar datos de otro propietario). `id` inexistente → `404 RECURSO_NO_ENCONTRADO`. Validación → `422 VALIDACION_FALLIDA`. Sin token → `401 NO_AUTENTICADO`. Reabrir una idea no archivada → `409 CONFLICTO` (transición de estado inválida; reutiliza la respuesta `Conflicto`).
- Se reutilizan las `responses` compartidas y los parámetros de paginación; se añade un parámetro de path `idIdea` y un parámetro de query `filtroEstadoIdea`.
- **Por qué `403` y no `404` para ideas ajenas:** la convención transversal ya fijada lo establece así; coherente con el módulo `usuarios`.

## Risks / Trade-offs

- **[`403` revela existencia del `id`]** Devolver `403` (en vez de `404`) ante una idea ajena indica que el `id` existe. → Aceptado: es la convención transversal ya adoptada; el `403` no expone ningún dato de la idea.
- **[`desarchivar` pierde el estado previo]** Reabrir siempre a `borrador` no restaura el estado que tenía antes de archivar. → Aceptado para E1: `borrador` es un punto de retoma claro; el contrato no se rompe si luego se decide restaurar el estado previo.
- **[Estado sin camino a `en_validacion` en E1]** En E1 una idea solo transita entre `borrador` y `archivada`. → Esperado: las demás transiciones llegan con E4/E6; el enum ya las contempla para no romper el contrato luego.

## Open Questions

- Ninguna pendiente. Resuelta: se **incluye** `POST /ideas/{id}/desarchivar` para reabrir y retomar una idea archivada (vuelve a `borrador`, conserva la evidencia).
