## Context

Sobre E0–E2 (`ideas` con `IdeasService.asegurarPropia` para el 403/404 de la idea). El contrato (`../contrato-api/openapi.yaml`, tag `ideas`) fija la superficie:

- `Umbral { kpi, grupo(readOnly), unidad(readOnly), umbralGo, umbralKill(nullable) }`. Zona GO `≥ umbralGo`, zona KILL `< umbralKill`; `umbralKill` `null` en KPIs sin zona kill.
- `UmbralesIdea` = arreglo de `Umbral`, uno por KPI del catálogo.
- `ActualizarUmbralRequest { umbralGo(req), umbralKill?(nullable) }`.
- `Kpi` (14 claves), `KpiGrupo` (4 grupos), `UnidadKpi` (5 unidades).

Los valores por defecto de cada KPI los define el dominio (SRS §7), no el contrato.

## Catálogo de KPIs (SRS §7)

Constante `CATALOGO_KPI`: por cada `Kpi`, su `grupo`, `unidad`, `umbralGo` y `umbralKill` por defecto (`null` = sin zona kill). Las tasas se expresan como proporción 0–1.

| kpi | grupo | unidad | umbralGo | umbralKill |
|---|---|---|---|---|
| tasa_respuesta | outreach | porcentaje | 0.25 | 0.10 |
| tasa_agendamiento | outreach | porcentaje | 0.40 | 0.15 |
| tasa_conversion_entrevista | outreach | porcentaje | 0.10 | 0.04 |
| velocidad_pipeline | outreach | conteo_semanal | 3 | 1 |
| volumen_evidencia | calidad_descubrimiento | conteo | 15 | null |
| cobertura_segmento | calidad_descubrimiento | porcentaje | 0.70 | 0.40 |
| score_promedio_entrevista | calidad_descubrimiento | puntaje_0_10 | 7 | 4 |
| densidad_citas | calidad_descubrimiento | porcentaje | 0.50 | null |
| tasa_confirmacion_dolor | senal_problema | porcentaje | 0.60 | 0.30 |
| dolor_sin_solucion | senal_problema | porcentaje | 0.50 | 0.20 |
| intensidad_dolor | senal_problema | porcentaje | 0.40 | 0.15 |
| senal_disposicion_pago | senal_mercado_pago | porcentaje | 0.35 | 0.15 |
| compromiso_tangible | senal_mercado_pago | porcentaje | 0.30 | 0.10 |
| tasa_referidos | senal_mercado_pago | ratio | 0.5 | 0.1 |

## Goals / Non-Goals

**Goals:**
- Servir el conjunto completo de umbrales de una idea (default + overrides) y permitir fijar el umbral de un KPI concreto de forma idempotente, exactamente como define el contrato.
- Mantener el catálogo (claves, grupos, unidades, defaults) como fuente única en código, no duplicado por idea.

**Non-Goals:**
- Calcular el valor real de cada KPI desde las entrevistas (E5) ni el semáforo del tablero.
- Traducir umbrales a veredicto (E6): aquí solo se editan los criterios.

## Decisions

### D1 — El catálogo vive en código; la BD solo guarda overrides
`grupo`, `unidad` y los defaults son estructurales (readOnly en el contrato): viven en la constante `CATALOGO_KPI`, no en la BD. La tabla `umbrales` guarda **solo** los umbrales editados por idea: `(idea_id, kpi, umbral_go, umbral_kill)` con unicidad `(idea_id, kpi)`. Ventaja: crear una idea no siembra 14 filas, el catálogo se actualiza en un solo lugar y el "vigente" es un merge determinista.

### D2 — `GET` compone catálogo + overrides
`GET /ideas/{id}/umbrales`: verifica idea propia (403/404), carga los overrides de la idea a un mapa por `kpi`, y proyecta el catálogo en orden fijo: por cada KPI, si hay override usa sus `umbralGo`/`umbralKill`; si no, los defaults del catálogo. `grupo` y `unidad` siempre del catálogo. Devuelve los 14 `Umbral`.

### D3 — `{kpi}` fuera del catálogo → 404 (no 422)
El contrato exige `404 RECURSO_NO_ENCONTRADO` para un `kpi` que no está en el catálogo, no un error de validación. Por eso el `IdKpiParamDto` valida `kpi` como **string** (no como enum Zod, que daría 422); el servicio comprueba la pertenencia a `CATALOGO_KPI` y lanza `RecursoNoEncontradoException` si falta. El `id` de la idea sí se valida como uuid.

### D4 — `PUT` idempotente con coherencia go/kill
`PUT /ideas/{id}/umbrales/{kpi}`: verifica idea propia (403/404) y kpi ∈ catálogo (404). `umbralGo` es requerido; `umbralKill` es opcional/`null`. Si `umbralKill` no es `null` y es **mayor que** `umbralGo` → `ValidacionFallidaException` (422) (zona kill por encima de la go es incoherente). Hace **upsert** del override por `(idea_id, kpi)` (idempotente: repetir la misma llamada deja el mismo estado) y devuelve el `Umbral` resultante (con `grupo`/`unidad` del catálogo).

### D5 — Umbrales viven en el módulo `ideas`
Como las hipótesis, los umbrales pertenecen al contexto `ideas` y se anidan bajo la idea en el contrato. `UmbralesController`/`UmbralesService`/entidad `UmbralIdea` se registran en `IdeasModule` (`forFeature([..., UmbralIdea])`) y reutilizan `IdeasService.asegurarPropia`.

### D6 — DTOs y documentación
`ActualizarUmbralDto` (`umbralGo` number, `umbralKill?` number|null), `IdKpiParamDto` (`id` uuid + `kpi` string). Respuestas `UmbralRespuestaDto` y `UmbralesIdeaDto` publicadas como esquemas Swagger; endpoints protegidos, `@ApiBearerAuth('bearerAuth')`.

## Risks / Trace-offs

- **Números en coma flotante para tasas** → aceptado: las tasas son proporciones 0–1; la columna se guarda como `numeric`/`double precision`. La comparación go/kill es del dominio del cálculo (E5), aquí solo se persisten los criterios.
- **KPI sin zona kill con override de kill** → el contrato dice "omitir o `null`" para esos KPIs; se permite `null` y no se fuerza un kill donde el default es `null`. La única regla dura es `umbralKill ≤ umbralGo` cuando se envía.
- **Migración escrita a mano tras `migration:generate`** → se limpia el ruido (como en E1/E2) y se verifica `run`/`revert`/`run` contra PostgreSQL.

## Migration Plan

1. Definir `CATALOGO_KPI` (constante) + tipos Zod `Kpi`/`KpiGrupo`/`UnidadKpi`.
2. Entidad `UmbralIdea` + migración de la tabla `umbrales` (único `(idea_id, kpi)`, FK a `ideas` ON DELETE CASCADE).
3. DTOs Zod, mapeador a `Umbral`, `UmbralesService` (GET compone, PUT upsert), `UmbralesController`.
4. Registrar en `IdeasModule`.
5. Verificar contra la BD (Docker): GET (14 umbrales, defaults) → PUT (override) → GET (refleja el override) → PUT idempotente → casos 401/403/404 (kpi fuera de catálogo)/422 (kill > go). Rollback: revertir la migración.

## Open Questions

- **Ninguna abierta.** Los defaults, la semántica de "vigente", el 404 para kpi fuera de catálogo y la coherencia go/kill quedan resueltos arriba.
