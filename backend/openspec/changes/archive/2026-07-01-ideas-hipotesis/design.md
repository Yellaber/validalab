## Context

Sobre E0 (fundación) y E1 (`ideas`: entidad `Idea`, aislamiento por `owner_id`, `IdeasService` con la verificación de idea propia 403/404). El contrato (`../contrato-api/openapi.yaml`, tag `ideas`) fija la superficie de las hipótesis:

- `Hipotesis { id(uuid), ideaId(uuid, readOnly), tipo, enunciado, estado, fechaCreacion, fechaActualizacion }`.
- `TipoHipotesis`: `problema` | `mercado` | `pago`. `EstadoHipotesis`: `pendiente` | `confirmada` | `refutada` (nace `pendiente`).
- Requests: crear `{ tipo, enunciado(≥1) }`; editar (PATCH) `{ tipo?, enunciado?(≥1), estado? }`, sin `ideaId`.
- Listado: `HipotesisLista` = arreglo de `Hipotesis` (sin paginar).

## Goals / Non-Goals

**Goals:**
- CRUD de hipótesis tipificadas por idea, exactamente como define el contrato, incluida la marca del estado de aprendizaje (`confirmada`/`refutada`/`pendiente`).
- Aislamiento anidado correcto: la propiedad de la hipótesis se hereda de la idea; idea ajena → 403, inexistente → 404, hipótesis fuera de la idea → 404.

**Non-Goals:**
- Umbrales kill/go y catálogo de KPIs (segunda mitad de E2) → change posterior.
- Cualquier automatismo de confirmación/refutación desde las entrevistas (E4): en E2 el estado lo marca el usuario a mano.

## Decisions

### D1 — Las hipótesis viven en el módulo `ideas`
El contrato anida las hipótesis bajo el tag `ideas`; pertenecen al mismo contexto acotado. En lugar de un módulo nuevo, el módulo `ideas` crece con `HipotesisController`/`HipotesisService`/entidad `Hipotesis`, registrados en `IdeasModule` (`forFeature([Idea, Hipotesis])`). Evita un módulo anémico y comparte DI con `IdeasService`.

### D2 — Verificación de propiedad reutilizada desde `IdeasService`
La propiedad de una hipótesis se deriva de su idea. `IdeasService` expone un método público `asegurarPropia(ownerId, ideaId): Promise<Idea>` (la lógica que hoy es `buscarPropia`: inexistente → 404, ajena → 403). `HipotesisService` lo inyecta y lo invoca al inicio de cada operación, antes de tocar hipótesis. Así el 403/404 de la idea vive en un solo lugar.

### D3 — Entidad `Hipotesis` y resolución anidada
Entidad TypeORM `hipotesis`: `id uuid (gen_random_uuid)`, `idea_id uuid` (indexado, FK a `ideas` ON DELETE CASCADE), `tipo`, `enunciado`, `estado` (default `pendiente`), `fecha_creacion` (`@CreateDateColumn`), `fecha_actualizacion` (`@UpdateDateColumn`). Para las operaciones por `idHipotesis`, un helper privado `buscarEnIdea(ideaId, idHipotesis)` carga la hipótesis por `id` y exige que su `ideaId` coincida con la idea (ya verificada como propia); si no existe o pertenece a otra idea → `RecursoNoEncontradoException` (404). Un mapeador `aHipotesisDto` produce el recurso del contrato.

### D4 — Estado gobernado, `ideaId` inmutable
`POST` fija `estado = 'pendiente'` en el servicio (el DTO de creación no admite `estado` ni `ideaId`). El `ActualizarHipotesisDto` admite `tipo?`, `enunciado?`, `estado?` pero **no** `ideaId`: una hipótesis nunca cambia de idea. La marca de estado (`confirmada`/`refutada`/`pendiente`) es una edición normal del PATCH.

### D5 — DTOs Zod derivados del contrato
`CrearHipotesisDto` (`tipo` ∈ catálogo, `enunciado` ≥ 1), `ActualizarHipotesisDto` (todos opcionales, sin `ideaId`), `IdHipotesisParamDto` (`id` + `idHipotesis` uuid). En el PATCH, los campos ausentes no se tocan (asignación por campo definido). `HipotesisRespuestaDto` y `HipotesisListaDto` se publican como esquemas Swagger.

### D6 — Cableado y documentación
`HipotesisController` con base `ideas/:id/hipotesis`, protegido por el guard global, `@ApiBearerAuth('bearerAuth')`, documentado con `@ApiOperation`/`@Api*Response` usando los DTOs Zod. `DELETE` responde `204` (`@HttpCode(204)`).

## Risks / Trade-offs

- **Acoplamiento `HipotesisService` → `IdeasService`** → aceptado: mismo contexto acotado; centraliza el 403/404 de la idea (D2) en vez de duplicarlo.
- **`404` para hipótesis de otra idea** (en vez de 403) → correcto: no se revela existencia cruzada entre ideas; la barrera de propiedad es la idea del path (403/404 ya aplicado sobre ella).
- **Migración escrita a mano tras `migration:generate`** → se limpia el ruido ajeno (como en E1) y se verifica `run`/`revert`/`run` contra PostgreSQL (Docker).

## Migration Plan

1. Exponer `IdeasService.asegurarPropia` (refactor menor de `buscarPropia`, sin cambio de comportamiento) + tests.
2. Entidad `Hipotesis` + migración de la tabla `hipotesis` (índice `idea_id`, FK a `ideas` ON DELETE CASCADE).
3. DTOs Zod, mapeador `aHipotesisDto`, `HipotesisService`, `HipotesisController`.
4. Registrar en `IdeasModule` (`forFeature([Idea, Hipotesis])`).
5. Verificar contra la BD (Docker): crear→listar→editar/marcar estado→eliminar, y los casos 401/403/404/422. Rollback: revertir la migración.

## Open Questions

- **Ninguna abierta.** El estado de reapertura, el orden de listado (por `fechaCreacion`) y la semántica de 403/404 anidados quedan resueltos arriba.
