## Context

Sobre la fundación E0 (config validada, TypeORM + migraciones, filtro de errores → sobre `Error`/`CodigoError`, `JwtAuthGuard` global + `@Publico()`, `@OwnerId()`, paginación, validación Zod) y con el módulo `usuarios` ya operativo. El contrato (`../contrato-api/openapi.yaml`, tag `ideas`) fija la superficie de E1:

- `Idea { id(uuid), ownerId(uuid, readOnly), titulo, descripcion?, problema, segmentoBeachhead?, estado, fechaCreacion, fechaActualizacion }`.
- `EstadoIdea`: `borrador` | `en_validacion` | `go` | `pivote` | `kill` | `archivada`. En E1 una idea solo transita `borrador` ⇄ `archivada`; `en_validacion` se origina en E4 y `go/pivote/kill` en E6.
- Requests: crear `{ titulo(≥1), descripcion?, problema(≥1), segmentoBeachhead? }`; editar (PATCH) los mismos campos, todos opcionales, **sin** `estado` ni `ownerId`.
- Listado: `RespuestaPaginada<Idea>` con `pagina`/`porPagina` y filtro opcional `estado`.

## Goals / Non-Goals

**Goals:**
- Entregar el CRUD del portafolio de ideas y el ciclo de archivado/desarchivado exactamente como define el contrato.
- Garantizar el aislamiento multi-tenant: cada operación se resuelve por `owner_id` derivado del token; idea ajena → `403` sin revelar datos; inexistente → `404`.
- Dejar la entidad raíz `Idea` sobre la que E2–E6 colgarán hipótesis, contactos, entrevistas, KPIs y veredictos.

**Non-Goals:**
- Hipótesis tipificadas y umbrales kill/go por idea (épica E2) → change posterior.
- Transiciones de veredicto (`go`/`pivote`/`kill`) y el cálculo de KPIs (E5/E6).
- Borrado físico de ideas: el archivado conserva la evidencia; no se expone `DELETE /ideas/{id}` en E1.

## Decisions

### D1 — Entidad `Idea` y mapeo a la respuesta
Entidad TypeORM `ideas`: `id uuid (gen_random_uuid)`, `owner_id uuid` (indexado, FK a `usuarios` ON DELETE CASCADE), `titulo`, `descripcion` (nullable), `problema`, `segmento_beachhead` (nullable), `estado` (default `borrador`), `fecha_creacion` (`@CreateDateColumn`), `fecha_actualizacion` (`@UpdateDateColumn`). Un mapeador `aIdeaDto(entidad)` produce el recurso `Idea` del contrato; los campos opcionales guardados como `null` se serializan **ausentes** (`undefined`), no `null`, para coincidir con el esquema (que no los marca como `nullable`).

### D2 — Aislamiento y resolución de propiedad (403 vs 404)
El `owner_id` se toma **solo** de `@OwnerId()` (claim `sub` del token verificado), nunca del cuerpo/query/ruta. Para consultar/editar/archivar una idea concreta se usa un helper privado `buscarPropia(ownerId, id)` que: carga por `id`; si no existe → `RecursoNoEncontradoException` (404); si existe pero `idea.ownerId !== ownerId` → `AccesoDenegadoException` (403, sin revelar datos). El **listado** sí filtra directamente `where { ownerId }` (nunca devuelve ideas ajenas). Es la misma convención documentada en `@OwnerId()`.

### D3 — Estado gobernado por la aplicación, no por el cliente
`POST /ideas` fija `estado = 'borrador'` en el servicio (el DTO de creación no admite `estado`). El `ActualizarIdeaDto` **no** incluye `estado`: la edición jamás puede fijar `go`/`pivote`/`kill` ni ningún estado; esas transiciones son del veredicto (E6). Archivar/desarchivar son los **únicos** cambios de estado de E1 y viven en endpoints dedicados, no en el PATCH.

### D4 — Regla de desarchivado (conflicto)
`desarchivar` solo aplica a una idea en estado `archivada`. Si la idea propia no está `archivada` → `ConflictoException` (409 `CONFLICTO`). Al reabrir, la idea vuelve a `borrador` (estado activo mínimo) conservando toda su evidencia; archivar/desarchivar nunca borran filas asociadas.

### D5 — DTOs Zod derivados del contrato
`CrearIdeaDto` (`titulo` ≥ 1, `problema` ≥ 1, `descripcion?`, `segmentoBeachhead?`), `ActualizarIdeaDto` (mismos campos, todos opcionales), `IdIdeaParamDto` (`id` uuid) y `ListarIdeasQueryDto` (extiende `paginacionQuerySchema` con `estado?` = `estadoIdeaSchema`). En el PATCH, los campos ausentes no se tocan (asignación explícita por campo definido), preservando la semántica parcial. La respuesta `IdeaRespuestaDto` e `IdeasPaginadasDto` se publican como esquemas Swagger.

### D6 — Cableado y documentación
`IdeasModule` (`TypeOrmModule.forFeature([Idea])`, `IdeasController`, `IdeasService`), importado por `AppModule`. Todos los endpoints están protegidos por el `JwtAuthGuard` global (sin `@Publico()`), marcados con `@ApiBearerAuth('bearerAuth')` y documentados con `@ApiOperation`/`@Api*Response` usando los DTOs Zod, igual que `usuarios`.

## Risks / Trade-offs

- **Filtro `estado` fuera del catálogo** → el `ListarIdeasQueryDto` valida `estado` contra `estadoIdeaSchema`; un valor inválido → `422 VALIDACION_FALLIDA` antes de llegar al servicio.
- **`404` vs `403` filtra existencia** → aceptado y exigido por el contrato: inexistente = 404, ajena existente = 403 sin datos. Es la convención transversal ya establecida.
- **Migración escrita a mano** (Docker no disponible en este entorno) → se sigue el estilo de las migraciones existentes; se debe verificar `migration:run`/`revert` contra PostgreSQL en `apply` antes de archivar.

## Migration Plan

1. Entidad `Idea` + migración de la tabla `ideas` (índice `owner_id`, FK a `usuarios` ON DELETE CASCADE).
2. DTOs Zod, mapeador `aIdeaDto`, `IdeasService`, `IdeasController`.
3. Cablear `IdeasModule` en `AppModule`.
4. Verificar contra la BD (Docker): crear→listar(filtro/paginación)→consultar→editar→archivar→desarchivar, y los casos 401/403/404/409/422 conforme al contrato. Rollback: revertir la migración; sin datos productivos.

## Open Questions

- **Estado de reapertura**: el contrato indica volver a `borrador` al desarchivar → resuelto (D4): se reabre siempre a `borrador`.
