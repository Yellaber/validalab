## 1. Catálogo de KPIs (SRS §7)

- [x] 1.1 Tipos Zod `kpiSchema` (14 claves), `kpiGrupoSchema` (4 grupos) y `unidadKpiSchema` (5 unidades) con los catálogos del contrato
- [x] 1.2 Constante `CATALOGO_KPI`: por cada KPI su `grupo`, `unidad`, `umbralGo` y `umbralKill` por defecto (SRS §7; `null` en `volumen_evidencia`/`densidad_citas`)
- [x] 1.3 Test del catálogo: 14 entradas, coherencia (`umbralKill` `null` o `≤ umbralGo`), grupos/unidades válidos

## 2. Persistencia (entidad y migración)

- [x] 2.1 Entidad `UmbralIdea` (tabla `umbrales`): `id` uuid, `ideaId`, `kpi`, `umbralGo`, `umbralKill` (nullable), único `(idea_id, kpi)`, FK a `ideas` ON DELETE CASCADE
- [x] 2.2 Migración de la tabla `umbrales`; limpiado el ruido de `migration:generate` y verificado `run`/`revert`/`run` contra PostgreSQL (Docker)

## 3. DTOs y mapeo (Zod + contrato)

- [x] 3.1 DTOs con `createZodDto`: `ActualizarUmbralDto` (`umbralGo` number, `umbralKill?` number|null), `IdKpiParamDto` (`id` uuid + `kpi` string — NO enum, para poder devolver 404)
- [x] 3.2 Esquemas/DTOs de respuesta: `UmbralRespuestaDto` y `UmbralesIdeaDto`
- [x] 3.3 Mapeador `aUmbralDto(kpi, override?)` que compone catálogo + override en un `Umbral` vigente

## 4. Umbrales de idea (umbrales-de-idea)

- [x] 4.1 `UmbralesService.listar(ownerId, ideaId)`: verifica idea propia; carga overrides a un mapa y proyecta el catálogo → 14 `Umbral` vigentes
- [x] 4.2 `UmbralesService.fijar(ownerId, ideaId, kpi, dto)`: verifica idea propia; kpi ∈ catálogo (si no → 404); `umbralKill > umbralGo` → 422; upsert idempotente del override; devuelve el `Umbral`
- [x] 4.3 Endpoints: `GET /ideas/{id}/umbrales` (200) y `PUT /ideas/{id}/umbrales/{kpi}` (200) — protegidos, `@ApiBearerAuth`
- [x] 4.4 Tests: listar (14 umbrales, defaults; `umbralKill` `null` en los sin kill; aislamiento 403); fijar (override reflejado en el GET; idempotencia); kpi fuera de catálogo→404; kill>go→422; idea ajena→403

## 5. Cableado y verificación final

- [x] 5.1 Registrar `UmbralIdea`, `UmbralesController` y `UmbralesService` en `IdeasModule` (`forFeature([..., UmbralIdea])`)
- [x] 5.2 Verificado el flujo completo contra la BD (Docker): GET→PUT→GET (refleja override)→PUT idempotente, con 401/403/404/422 conforme al contrato
- [x] 5.3 `npm run lint` y `npm test` en verde (112 tests; incluye catálogo y aislamiento por idea)
- [x] 5.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos)
