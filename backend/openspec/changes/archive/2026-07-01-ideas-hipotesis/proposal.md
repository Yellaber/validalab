## Why

Con E1 cerrada, ya existe la entidad raíz `Idea`, pero una idea sin hipótesis es solo un enunciado: no hay nada falsable que las entrevistas puedan confirmar o refutar. La épica E2 introduce la evidencia estructurada de la idea. Este change entrega su primera mitad —las **hipótesis tipificadas**— dejando los umbrales kill/go para un change posterior (llevan el catálogo de KPIs del SRS §7).

## What Changes

- **Entidad `Hipotesis`** (TypeORM) con `id`, `ideaId`, `tipo`, `enunciado`, `estado`, `fechaCreacion`, `fechaActualizacion`. Migración de la tabla `hipotesis` (índice por `idea_id`, FK a `ideas` ON DELETE CASCADE). El `ideaId` **nunca** se acepta como entrada: se deriva del path.
- **Crear** (`POST /ideas/{id}/hipotesis`, autenticado): crea una hipótesis `tipo` (`problema`/`mercado`/`pago`) + `enunciado` sobre una idea propia, en estado `pendiente`; devuelve `201`.
- **Listar** (`GET /ideas/{id}/hipotesis`, autenticado): devuelve las hipótesis de una idea propia como arreglo `HipotesisLista` (sin paginar, colección pequeña).
- **Editar / marcar estado** (`PATCH /ideas/{id}/hipotesis/{idHipotesis}`, autenticado): edita `tipo`/`enunciado` y/o marca `estado` (`confirmada`/`refutada`/`pendiente`); no permite cambiar `ideaId`.
- **Eliminar** (`DELETE /ideas/{id}/hipotesis/{idHipotesis}`, autenticado): borra una hipótesis registrada por error; `204` sin contenido.
- **Aislamiento anidado:** toda operación verifica primero que la idea del path sea propia (ajena → `403`, inexistente → `404`); una hipótesis que no pertenece a esa idea → `404`.

**Fuera de alcance** (change posterior de E2): los umbrales kill/go por KPI (`GET /ideas/{id}/umbrales`, `PUT /ideas/{id}/umbrales/{kpi}`) y el catálogo de KPIs (SRS §7).

## Capabilities

### New Capabilities
- `gestion-de-hipotesis`: alta, listado, edición (incluida la marca de estado de aprendizaje) y eliminación de las hipótesis tipificadas de una idea propia, aisladas a través de la propiedad de la idea.

### Modified Capabilities
<!-- Ninguna a nivel de requisito. `gestion-de-ideas` se reutiliza (verificación de idea propia) sin cambiar su comportamiento observable. -->

## Impact

- **Código**: crece el módulo `ideas` (mismo contexto acotado) con `HipotesisController`, `HipotesisService`, entidad `Hipotesis`, DTOs Zod (`CrearHipotesisDto`, `ActualizarHipotesisDto`, `IdHipotesisParamDto`) y el mapeador `aHipotesisDto`. `IdeasService` expone un método reutilizable para resolver una idea propia (403/404) que `HipotesisService` consume.
- **Persistencia**: migración de la tabla `hipotesis`.
- **Reutiliza la fundación E0 y E1**: DTOs con `createZodDto` + `ZodValidationPipe` global, sobre `Error`/`CodigoError` + filtro global, `JwtAuthGuard` global, `@OwnerId()`, y la verificación de propiedad de la idea de `gestion-de-ideas`.
- **Contrato**: implementa la porción de hipótesis del tag `ideas` del OpenAPI. No lo modifica.
- **Sin dependencias nuevas.**
