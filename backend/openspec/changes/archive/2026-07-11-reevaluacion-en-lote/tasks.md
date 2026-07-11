## 1. Scoring síncrono para el lote

- [x] 1.1 Añadir `AgenteService.reevaluar(ownerId, entrevista)`: hash idempotente (coincide → `reevaluada:false`), si no puntúa (real/`fake`, lanza antes de tocar estado si falta BYOK/cae proveedor), persiste `puntuada` + traza, devuelve `{ reevaluada, tokensEntrada, tokensSalida }`; exportarlo desde `AgenteService`
- [x] 1.2 Specs unitarios de `reevaluar`: hash igual → omitida; hash distinto → reevaluada con tokens; sin BYOK (real) → propaga Conflicto

## 2. Motor de re-evaluación

- [x] 2.1 Implementar `ReevaluacionService.estimar(ownerId, ideaId)`: afectadas (puntuadas con `hashEntrada` desactualizado), promedio de tokens del histórico (`ejecuciones_agente`), `modeloScoring` de BYOK, costo = tokens × precios; sin mutar
- [x] 2.2 Implementar `ReevaluacionService.ejecutar(ownerId, ideaId, idsEntrevistas?)`: objetivo (afectadas o subconjunto), `reevaluar` por entrevista, agrega reevaluadas/omitidas/tokens/costo; mapea Conflicto→409 y otros errores de proveedor→503
- [x] 2.3 DTOs Zod `EstimacionReevaluacion`, `ResultadoReevaluacion`, `ReevaluacionLoteRequest` (derivados del contrato)
- [x] 2.4 Specs unitarios de `ReevaluacionService`: estimación cuenta afectadas y no muta, ejecución reevalúa/omite, aislamiento, sin BYOK→409

## 3. Endpoint y cableado

- [x] 3.1 `ReevaluacionController` (`ideas/:id/entrevistas/reevaluacion`): `GET /estimacion` y `POST /` con Swagger y respuestas 200/401/403/404/409/503
- [x] 3.2 Cablear en `EntrevistasModule`: importar `ProveedoresModule` (exportar `PreciosService`) y `forFeature([EjecucionAgente])`; providers

## 4. Verificación

- [x] 4.1 `openspec validate --strict`; `npm test` verde; `eslint` en modo check limpio; `build` OK
- [x] 4.2 e2e (modo `fake`): puntuar entrevistas con rúbrica v2 → subir la rúbrica → `GET .../estimacion` cuenta las afectadas sin mutar → `POST .../reevaluacion` re-puntúa (reevaluadas>0) → repetir el POST omite todas (idempotencia)
