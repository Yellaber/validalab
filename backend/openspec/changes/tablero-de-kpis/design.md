## Context

El catálogo de 14 KPIs (4 grupos) ya existe en `ideas/umbral/kpi.catalog.ts` con su grupo, unidad y umbrales por defecto; los overrides por idea viven en la tabla `umbrales` (E2). Faltan los **valores**: calcularlos desde el embudo de `contactos` (E3) y las `entrevistas` puntuadas (E4). El contrato ya define `TableroIdea`, `KpiCalculado`, `ResumenTablero`, `ZonaKpi` y `GET /ideas/{id}/kpis`. Los KPIs deben ser **reconstruibles** desde las entrevistas (RNF-15) y refrescarse en < 1 s hasta 200 entrevistas (RNF-02). El `score_promedio_entrevista` usa el ajuste del usuario cuando existe (invariante E4).

Los KPIs de **señal de problema/pago** requieren señales tipadas por entrevista que hoy no existen (el scoring solo emite `senales: string[]` libre). Por decisión de producto, esas señales las produce el **agente** al puntuar (opción "extender el output del agente").

## Goals / Non-Goals

**Goals:**
- Motor de cálculo de los 14 KPIs con `valor`, `numerador`/`denominador` y `zona` de semáforo por idea.
- `GET /ideas/{id}/kpis` → `TableroIdea` con el `resumen` por zona, aislado por owner.
- Ampliar el output del agente con señales estructuradas y agregarlas en los KPIs de señal.
- Cálculo al vuelo (sin tabla), en una sola pasada, dentro del presupuesto de latencia.

**Non-Goals:**
- Alertas de cruce de umbral (E5b, `alertas-de-kpi`).
- Persistir/cachear el tablero (se recalcula; RNF-15). Si el perfilado exige caché, se decide en E5b/E8.
- El veredicto (E6) y la tool `calcularKPIs` del agente (la reutilizará; aquí solo se expone el cálculo por HTTP).

## Decisions

### D1 — Módulo `kpis` de solo lectura, cálculo al vuelo
Nuevo módulo de dominio `kpis` con `KpisService.calcularTablero(ownerId, ideaId)`. No hay entidad ni tabla: los KPIs se derivan de dos consultas (`entrevistas` y `contactos` de la idea) más los umbrales vigentes, en una sola pasada en memoria (RNF-15). Reutiliza `IdeasService.asegurarPropia` (403/404), `UmbralesService.listar` (umbrales efectivos con overrides) y los repos de `Entrevista`/`Contacto`. Controller anidado `ideas/:id/kpis`. *Alternativa descartada:* materializar KPIs en una tabla — viola "reconstruible" y añade invalidación; a 200 entrevistas el cálculo al vuelo sobra para < 1 s.

### D2 — Fórmulas del embudo (outreach)
Sobre los contactos de la idea (denominador cero → `valor` `null`, zona `sin_datos`):
- `contactados` = contactos con `primerToqueEn` no nulo **o** con `estado` ya avanzado (`contactado`/`respondio`/`agendado`/`entrevistado`), pues un contacto puede llegar a `entrevistado` sin toque explícito; así las tasas no superan 1 por un denominador incompleto. Un `descartado` sin toque no cuenta (pudo descartarse sin contactar).
- `respondieron` = `estado ∈ {respondio, agendado, entrevistado}`; `agendados` = `{agendado, entrevistado}`; `entrevistas` = nº de entrevistas de la idea.
- `tasa_respuesta` = respondieron/contactados · `tasa_agendamiento` = agendados/respondieron · `tasa_conversion_entrevista` = entrevistas/contactados.
- `velocidad_pipeline` = entrevistas / semanas activas (desde la primera entrevista hasta hoy, mínimo 1 semana).

### D3 — Fórmulas de calidad del descubrimiento
- `volumen_evidencia` = nº de entrevistas (conteo, sin zona kill).
- `cobertura_segmento` = entrevistas cuyo `contacto.perfil` coincide (case-insensitive, contiene) con `idea.segmentoBeachhead` / total entrevistas; si `segmentoBeachhead` es vacío → `sin_datos`.
- `score_promedio_entrevista` = promedio de `ajuste.scoreAjustado ?? score.score` sobre entrevistas **puntuadas** (0–10).
- `densidad_citas` = entrevistas con ≥ 1 cita / total entrevistas (sin zona kill).

### D4 — Fórmulas de señal (problema y pago) sobre señales estructuradas
Sobre entrevistas **puntuadas**; denominador = total puntuadas:
- `tasa_confirmacion_dolor` = con `dolorConfirmado` / total · `dolor_sin_solucion` = con `sinSolucionActual` / total · `intensidad_dolor` = con `dolorUrgente` / total · `senal_disposicion_pago` = con `disposicionPago` / total.
- `compromiso_tangible` = contactos que ceden algo tangible (entrevistados **o** que generaron un referido —su id aparece en algún `referidoPorId`) / total contactos.
- `tasa_referidos` = contactos con `referidoPorId` no nulo (referidos obtenidos) / nº de entrevistas (ratio).
Una entrevista puntuada **sin** el bloque de señales estructuradas (scoreada con la rúbrica anterior) cuenta como señal en `false`; al re-puntuarse con la rúbrica nueva se corrige.

### D5 — Zona de semáforo
Por KPI: `valor == null` → `sin_datos`; `umbralKill != null && valor < umbralKill` → `kill`; `valor >= umbralGo` → `go`; en otro caso → `observacion`. Los KPIs sin zona kill solo alternan `go`/`observacion`. El `resumen` cuenta KPIs por zona (`totalKpis` = 14).

### D6 — Señales estructuradas en el output del agente (capacidad modificada)
Se amplía `salidaScoringSchema`/`ScoreEntrevista` con `senalesEstructuradas: { dolorConfirmado, dolorUrgente, sinSolucionActual, disposicionPago }` (booleans), validadas con Zod. El **modo `fake`** las deriva de forma determinista del hash (igual que el score). El **prompt del modo real** las exige y el esquema estructurado las incluye, de modo que el mismo bucle de validación/reintento (E4) las cubre. Se sube `SCORING_VERSION_RUBRICA` a `v2`: cambia el hash → las entrevistas se re-puntúan al re-dispararse (crear/editar respuestas) obteniendo las señales; los scores viejos siguen siendo válidos como número, solo sin señales hasta el re-scoring.

### D7 — Rendimiento (RNF-02)
Dos consultas indexadas por `idea_id` + una construcción del mapa de umbrales; agregación O(nEntrevistas + nContactos) en una pasada. A 200 entrevistas es muy inferior a 1 s. Sin N+1 (no se cargan relaciones; se opera sobre columnas jsonb ya presentes).

## Risks / Trade-offs

- **KPIs de embudo pierden la posición del contacto descartado** (el `estado` no guarda historia; un `descartado` no dice desde dónde) → Mitigación: usar `primerToqueEn` como marca fiable de "contactado"; un histórico de embudo queda como evolución si se necesita más precisión.
- **Scores previos sin señales estructuradas** subestiman los KPIs de señal hasta el re-scoring → Mitigación: el bump de rúbrica los recalcula al re-dispararse; documentado. No se fuerza un re-scoring masivo en este change.
- **`cobertura_segmento` por coincidencia de texto** (perfil vs beachhead) es aproximada → aceptable para MVP; una taxonomía de segmentos sería otra épica.
- **Cálculo al vuelo en cada request** → dentro del presupuesto a 200 entrevistas; si el volumen crece mucho, se introduce caché con invalidación por scoring (E8), no ahora.
