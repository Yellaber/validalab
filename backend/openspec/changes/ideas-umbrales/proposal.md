## Why

Las hipótesis ya hacen explícito qué probar, pero falta el criterio con el que se juzga: los **umbrales kill/go**. Son el criterio, fijado de antemano, que el agente pondera al emitir el veredicto (E6) y que el tablero contrasta contra los KPIs (E5). Este change entrega la segunda mitad de E2 —el catálogo de KPIs (SRS §7) y la gestión de umbrales por idea— cerrando la épica.

## What Changes

- **Catálogo de KPIs en código** (SRS §7): los 14 KPIs con su `grupo`, `unidad` y sus `umbralGo`/`umbralKill` por defecto. Es una constante del dominio (no se cablean en cada consulta); `volumen_evidencia` y `densidad_citas` no tienen zona kill (`umbralKill` por defecto `null`).
- **Entidad `UmbralIdea`** (TypeORM) que almacena **solo los overrides** por idea (`idea_id`, `kpi`, `umbral_go`, `umbral_kill`), con unicidad `(idea_id, kpi)` y FK a `ideas` ON DELETE CASCADE. Migración de la tabla `umbrales`.
- **Consultar** (`GET /ideas/{id}/umbrales`, autenticado): devuelve el conjunto completo `UmbralesIdea` —un `Umbral` por cada KPI del catálogo— con los valores **vigentes** (el override de la idea, o el default del catálogo si no se ha editado).
- **Fijar** (`PUT /ideas/{id}/umbrales/{kpi}`, autenticado, idempotente): fija `umbralGo` y, cuando aplica, `umbralKill` de un KPI para una idea propia (upsert del override). Un `{kpi}` fuera del catálogo → `404`; un `umbralKill` mayor que `umbralGo` → `422`.

**Fuera de alcance**: el cálculo de los KPIs a partir de las entrevistas (E5) y su traducción a veredicto (E6). Aquí los umbrales son solo el criterio editable; no se calcula ningún valor de KPI.

## Capabilities

### New Capabilities
- `umbrales-de-idea`: consulta del conjunto de umbrales kill/go de una idea (uno por KPI, con default o override vigente) y fijación idempotente del umbral de un KPI concreto, apoyada en el catálogo de KPIs del SRS §7.

### Modified Capabilities
<!-- Ninguna a nivel de requisito. Se reutiliza `gestion-de-ideas` (verificación de idea propia) sin cambiar su comportamiento observable. -->

## Impact

- **Código**: crece el módulo `ideas` con `UmbralesController`, `UmbralesService`, la entidad `UmbralIdea`, el catálogo `CATALOGO_KPI` (constante), DTOs Zod (`ActualizarUmbralDto`, `IdKpiParamDto`) y el mapeador a `Umbral`. `UmbralesService` reutiliza `IdeasService.asegurarPropia` para el 403/404 de la idea.
- **Persistencia**: migración de la tabla `umbrales` (solo overrides; el catálogo con defaults vive en código).
- **Reutiliza la fundación E0–E2**: DTOs con `createZodDto` + `ZodValidationPipe` global, sobre `Error`/`CodigoError` + filtro global, `JwtAuthGuard` global, `@OwnerId()`, y la verificación de idea propia de `gestion-de-ideas`.
- **Contrato**: implementa la porción de umbrales del tag `ideas` del OpenAPI. No lo modifica.
- **Sin dependencias nuevas.**
