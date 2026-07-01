## Why

Con E0 cerrada (cuentas, sesión y RBAC), ya existe identidad y aislamiento por `owner_id`, pero **no hay ninguna entidad de dominio**: el usuario no puede registrar nada que validar. La `Idea` es la entidad raíz sobre la que cuelga todo el resto (hipótesis, contactos, entrevistas, KPIs, veredictos); sin ella ningún módulo posterior puede existir. Este change abre la épica E1 entregando el portafolio de ideas: alta, consulta, edición, listado y el ciclo de archivado/desarchivado, todo aislado por usuario.

## What Changes

- **Entidad `Idea`** (TypeORM) con `id`, `ownerId`, `titulo`, `descripcion?`, `problema`, `segmentoBeachhead?`, `estado`, `fechaCreacion`, `fechaActualizacion`. Migración de la tabla `ideas` (índice por `owner_id`, FK a `usuarios` ON DELETE CASCADE). El `ownerId` **nunca** se acepta como entrada: se deriva del token.
- **Crear** (`POST /ideas`, autenticado): crea la idea en estado `borrador` asociada al usuario autenticado; devuelve `201` con la `Idea`.
- **Listar** (`GET /ideas`, autenticado): devuelve solo las ideas propias, paginadas (`pagina`/`porPagina`), con filtro opcional por `estado`; sobre `RespuestaPaginada`.
- **Consultar** (`GET /ideas/{id}`, autenticado): idea propia; ajena → `403 ACCESO_DENEGADO`, inexistente → `404 RECURSO_NO_ENCONTRADO`.
- **Editar** (`PATCH /ideas/{id}`, autenticado): solo contenido (`titulo`, `descripcion`, `problema`, `segmentoBeachhead`); el cuerpo **no** permite fijar `estado` a `go`/`pivote`/`kill` (eso proviene del veredicto aprobado, E6).
- **Archivar** (`POST /ideas/{id}/archivar`, autenticado): marca la idea como `archivada` **sin borrar** su información ni su evidencia.
- **Desarchivar** (`POST /ideas/{id}/desarchivar`, autenticado): reabre una idea `archivada` devolviéndola a `borrador`; si no estaba archivada → `409 CONFLICTO`.

**Fuera de alcance** (irá en un change posterior de la épica E2): las hipótesis tipificadas y los umbrales kill/go por idea (`/ideas/{id}/hipotesis`, `/ideas/{id}/umbrales`).

## Capabilities

### New Capabilities
- `gestion-de-ideas`: alta, consulta, edición y listado paginado de las ideas propias, aisladas por `owner_id` (crea en `borrador`; la edición nunca fija el veredicto).
- `archivado-de-ideas`: archivar una idea conservando su evidencia y reabrir (desarchivar) una idea archivada, con la regla de conflicto cuando no estaba archivada.

### Modified Capabilities
<!-- Ninguna. Las capacidades de la fundación (autenticacion-multitenant, paginacion-colecciones, manejo-errores-api) se reutilizan sin cambios a nivel de requisito. -->

## Impact

- **Código**: nuevo módulo `src/ideas/` con `IdeasController`, `IdeasService`, entidad `Idea`, DTOs Zod (`CrearIdeaDto`, `ActualizarIdeaDto`, filtro de listado) y el mapeador `aIdeaDto`. `AppModule` importa `IdeasModule`.
- **Persistencia**: migración de la tabla `ideas`.
- **Reutiliza la fundación E0**: DTOs con `createZodDto` + `ZodValidationPipe` global, sobre `Error`/`CodigoError` + filtro global, `JwtAuthGuard` global, `@OwnerId()`, paginación (`PaginacionQueryDto` + `crearRespuestaPaginada`).
- **Contrato**: implementa la porción E1 del tag `ideas` del OpenAPI. No lo modifica.
- **Sin dependencias nuevas.**
