## Why

Cuando cambia la rúbrica de scoring (se sube `SCORING_VERSION_RUBRICA`), los scores emitidos con la versión anterior quedan desactualizados: su `hashEntrada` ya no coincide con el hash vigente. El SRS (RF-22h, HU-32) pide una **re-evaluación en lote explícita**: el usuario ve primero el costo estimado de re-puntuar las entrevistas afectadas y, si confirma, las re-puntúa en lote, omitiendo por idempotencia las que no cambiaron (RF-22c). Un cambio de rúbrica NO dispara nada automáticamente. Es el último bloque de E8.

## What Changes

- **Estimar sin ejecutar** (`GET /ideas/{id}/entrevistas/reevaluacion/estimacion`): cuenta las entrevistas afectadas (puntuadas cuyo `hashEntrada` ya no coincide con el hash vigente de sus respuestas + rúbrica actual) y estima los tokens y el costo de re-puntuarlas con el `modeloScoring` configurado, **sin mutar ni re-puntuar nada**. Los tokens estimados salen del promedio histórico de scorings reales del usuario (ledger `ejecuciones_agente`); el costo, de la tabla de precios (E8a).
- **Ejecutar el lote** (`POST /ideas/{id}/entrevistas/reevaluacion`): re-evalúa en lote las entrevistas afectadas (o el subconjunto `idsEntrevistas` del cuerpo), de forma **síncrona**, re-puntuando las que cambiaron y **omitiendo por idempotencia** las que no. Devuelve `entrevistasReevaluadas`, `entrevistasOmitidas` y el costo/tokens reales del lote. Sin BYOK → `409`; proveedor no disponible → `503`.
- **Scoring síncrono para el lote:** se añade a `AgenteService` un camino de scoring síncrono (`reevaluar`) que reutiliza toda su maquinaria (hash idempotente, puntuar real/`fake`, persistencia y traza) pero devuelve el resultado y propaga los errores, para que el lote pueda reportar conteos y costo reales. El scoring automático (E4) sigue siendo asíncrono e intacto.

## Capabilities

### New Capabilities
- `reevaluacion-en-lote`: la estimación de costo (sin ejecutar) y la ejecución explícita de la re-evaluación en lote de las entrevistas de una idea cuya entrada cambió tras un cambio de rúbrica, con idempotencia (RF-22c), síncrona, y el costo/tokens reales del lote.

### Modified Capabilities
_(ninguna a nivel de spec: el scoring síncrono para el lote reutiliza la maquinaria del scoring sin cambiar su comportamiento automático)._

## Impact

- **Código:** nuevo sub-dominio `entrevistas/reevaluacion/` (`ReevaluacionService`, controller `ideas/:id/entrevistas/reevaluacion[/estimacion]`, DTOs `EstimacionReevaluacion`/`ResultadoReevaluacion`/`ReevaluacionLoteRequest`). `AgenteService` gana `reevaluar(ownerId, entrevista)` (scoring síncrono con conteo y tokens). `EntrevistasModule` importa `ProveedoresModule` (precios + config BYOK) y consume el repo de `EjecucionAgente` (promedio de tokens).
- **Reutiliza:** `AgenteService` (scoring + hash idempotente), `PreciosService`/tabla de precios (E8a), `ConfiguracionService` (modeloScoring), `IdeasService` (aislamiento), el ledger `ejecuciones_agente` (promedio de tokens y traza).
- **Persistencia:** sin tablas nuevas (la re-evaluación re-usa `entrevistas`/`ejecuciones_agente`; la afectación se deriva del hash).
- **Contrato:** `contrato-api/openapi.yaml` ya define `EstimacionReevaluacion`, `ResultadoReevaluacion`, `ReevaluacionLoteRequest` y los endpoints; no requiere cambios.
- **Cierra E8** y el backend del MVP.
