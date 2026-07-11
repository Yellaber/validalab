## 1. Señales estructuradas del agente (capacidad modificada)

- [x] 1.1 Ampliar `salidaScoringSchema` y `ScoreEntrevista` con `senalesEstructuradas` (`dolorConfirmado`, `dolorUrgente`, `sinSolucionActual`, `disposicionPago`: boolean)
- [x] 1.2 Emitir las señales en el modo `fake` (deterministas por hash) y exigirlas en el prompt/esquema del modo real
- [x] 1.3 Subir `SCORING_VERSION_RUBRICA` a `v2`; ajustar los specs del agente (fake, validación/reintento)
- [x] 1.4 Actualizar `contrato-api/openapi.yaml`: `senalesEstructuradas` en el esquema `ScoreEntrevista`

## 2. Motor de cálculo de KPIs

- [x] 2.1 Definir las fórmulas por KPI en `kpis/formulas-kpi.ts`: función `(entrevistas, contactos, idea) → { numerador, denominador, valor }` para los 14 KPIs (outreach, calidad, señal)
- [x] 2.2 Implementar la asignación de `zona` (`sin_datos`/`kill`/`observacion`/`go`) a partir de valor + umbrales vigentes
- [x] 2.3 Implementar `KpisService.calcularTablero(ownerId, ideaId)`: `asegurarPropia`, umbrales vigentes (`UmbralesService`), dos consultas (entrevistas + contactos), agregación en una pasada, `resumen` por zona
- [x] 2.4 Specs unitarios del motor: cada grupo de KPIs, `sin_datos` con denominador cero, el ajuste del usuario prevalece en `score_promedio_entrevista`, señales estructuradas agregadas, entrevista sin señales = `false`

## 3. Endpoint del tablero

- [x] 3.1 DTOs de respuesta Zod `TableroIdea`/`KpiCalculado`/`ResumenTablero` (derivados del contrato)
- [x] 3.2 `KpisController` con `GET /ideas/:id/kpis` (`@OwnerId()`, `@ApiBearerAuth`, respuestas 200/401/403/404)
- [x] 3.3 Cablear `KpisModule` (imports `IdeasModule`, `forFeature([Entrevista, Contacto])`) y registrarlo en `AppModule`

## 4. Verificación

- [x] 4.1 `openspec validate --strict`; `npm test` verde; `eslint` en modo check limpio; `build` OK
- [x] 4.2 e2e (modo `fake`): idea + contactos en varios estados del embudo + entrevistas puntuadas → `GET /ideas/{id}/kpis` devuelve valores/zonas/resumen coherentes; el ajuste del usuario prevalece en `score_promedio_entrevista`
- [x] 4.3 Confirmar el contrato actualizado y sin drift con los DTOs (Swagger vivo en `/docs`)
