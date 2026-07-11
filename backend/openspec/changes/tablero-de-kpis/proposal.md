## Why

Ya se registran ideas, contactos y entrevistas puntuadas por el agente, pero nada agrega esa evidencia en los indicadores de validación. El tablero de KPIs (SRS §7, RF-11/12, HU-15/16) es lo que traduce el embudo de outreach y las entrevistas en 14 métricas con semáforo kill/go por idea. Es, además, el insumo directo del veredicto del agente (E6): sin KPIs calculados, el agente no tiene qué ponderar. El sistema **calcula** (KPIs); el agente **ejecuta** (puntúa y dictamina).

## What Changes

- **Nuevo módulo de dominio `kpis`**: un motor de cálculo que, a partir de las entrevistas puntuadas, los contactos y los umbrales de la idea, computa los 14 KPIs del catálogo (sección 7) con su `valor`, `numerador`/`denominador` (transparencia), sus umbrales vigentes y su `zona` de semáforo (`go`/`observacion`/`kill`/`sin_datos`).
- **Endpoint `GET /ideas/{id}/kpis`**: devuelve el `TableroIdea` de una idea propia (KPIs + `resumen` con el conteo por zona + `fechaCalculo`). Se calcula bajo demanda; **reconstruible** desde las entrevistas (RNF-15) y rápido (RNF-02: < 1 s hasta 200 entrevistas).
- **Señales estructuradas del agente (capacidad modificada):** el output de scoring del agente (E4) se amplía con señales tipadas por entrevista —`dolorConfirmado`, `dolorUrgente`, `sinSolucionActual`, `disposicionPago`— para que el sistema pueda agregar los KPIs de señal de problema/pago. El modo `fake` las emite de forma determinista; el prompt/esquema del modo real las exige. Se sube la versión de rúbrica para invalidar los scores previos.
- **`score_promedio_entrevista` usa el ajuste del usuario** cuando existe, conservando el del agente (invariante de E4).

## Capabilities

### New Capabilities
- `tablero-de-kpis`: el cálculo de los 14 KPIs de una idea a partir de sus entrevistas/contactos/umbrales, con numerador/denominador para transparencia, zona de semáforo por umbral, y el `resumen` del tablero; expuesto en `GET /ideas/{id}/kpis`. Reconstruible (RNF-15) y bajo el presupuesto de latencia (RNF-02).

### Modified Capabilities
- `scoring-inteligente-de-entrevistas`: el output estructurado del scoring incorpora señales tipadas por entrevista (`dolorConfirmado`, `dolorUrgente`, `sinSolucionActual`, `disposicionPago`), validadas con Zod, emitidas de forma determinista en modo `fake` y exigidas al modelo en modo `real`; son el insumo de los KPIs de señal de problema/pago.

## Impact

- **Código:** nuevo `src/kpis/` (módulo, `KpisService` con el motor de cálculo, definiciones de fórmula por KPI, controller anidado `ideas/{id}/kpis`, DTOs de respuesta `TableroIdea`/`KpiCalculado`/`ResumenTablero`). Reutiliza `IdeasService` (aislamiento), `UmbralesService` (umbrales vigentes), y los repositorios de `Entrevista` y `Contacto`.
- **Agente (E4):** se amplía `salidaScoringSchema`/`ScoreEntrevista` con las 4 señales; se actualizan el modo `fake`, el prompt del modo real y `SCORING_VERSION_RUBRICA` (bump → los scores previos se recalculan al re-dispararse).
- **Persistencia:** sin tabla nueva (los KPIs se calculan al vuelo desde entrevistas/contactos; RNF-15). Las señales viajan dentro del `score` jsonb ya existente.
- **Contrato:** `contrato-api/openapi.yaml` ya define `TableroIdea`, `KpiCalculado`, `ResumenTablero`, `ZonaKpi` y el endpoint; se añaden las señales al esquema `ScoreEntrevista`.
- **Fuera de alcance:** las **alertas** de cruce de umbral (`GET/PATCH /ideas/{id}/alertas`) van en el siguiente change (E5b, `alertas-de-kpi`), que se apoya en este cálculo.
