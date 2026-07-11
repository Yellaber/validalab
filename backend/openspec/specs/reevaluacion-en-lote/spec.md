# reevaluacion-en-lote Specification

## Purpose
TBD - created by archiving change reevaluacion-en-lote. Update Purpose after archive.
## Requirements
### Requirement: Estimar el costo de una re-evaluación en lote sin ejecutar
El sistema SHALL calcular, SIN ejecutar ni mutar nada (`GET /ideas/{id}/entrevistas/reevaluacion/estimacion`), el costo estimado de re-evaluar las entrevistas de una idea propia cuya entrada cambió tras un cambio de rúbrica —las entrevistas `puntuada` cuyo `hashEntrada` ya no coincide con el hash vigente de sus respuestas + la versión de rúbrica actual—. La respuesta SHALL incluir `entrevistasAfectadas`, el `modeloScoring` configurado (o `null` sin BYOK), los tokens estimados, el `costoEstimado` (tokens estimados × tabla de precios) y `esEstimado` en `true` con la aclaración normativa. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Estimación tras un cambio de rúbrica
- **WHEN** un usuario autenticado consulta la estimación de una idea con entrevistas puntuadas bajo una rúbrica anterior
- **THEN** la respuesta es `200` con `entrevistasAfectadas` igual al número de esas entrevistas y un `costoEstimado` con `esEstimado` en `true`, sin re-puntuar ninguna

#### Scenario: Sin entrevistas afectadas
- **WHEN** un usuario autenticado consulta la estimación de una idea cuyas entrevistas están puntuadas con la rúbrica vigente
- **THEN** la respuesta es `200` con `entrevistasAfectadas` `0` y `costoEstimado` `0`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado consulta la estimación de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Ejecutar una re-evaluación en lote
El sistema SHALL re-evaluar en lote, de forma SÍNCRONA, las entrevistas de una idea propia (`POST /ideas/{id}/entrevistas/reevaluacion`). Por defecto SHALL re-evaluar las entrevistas afectadas (con `hashEntrada` desactualizado); si el cuerpo trae `idsEntrevistas`, SHALL limitarse a ese subconjunto de la idea. El sistema SHALL re-puntuar las entrevistas cuya entrada cambió y SHALL OMITIR por idempotencia (RF-22c) las que no cambiaron. La respuesta SHALL devolver `entrevistasReevaluadas`, `entrevistasOmitidas` y el costo/tokens reales del lote. Sin configuración BYOK SHALL responder `409 CONFLICTO`; si el proveedor no responde `503 PROVEEDOR_IA_NO_DISPONIBLE`. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una inexistente `404 RECURSO_NO_ENCONTRADO`. Un cambio de rúbrica NO SHALL disparar la re-evaluación automáticamente.

#### Scenario: Re-evaluación de las afectadas
- **WHEN** un usuario autenticado ejecuta la re-evaluación de una idea con entrevistas afectadas, sin cuerpo
- **THEN** la respuesta es `200` con `entrevistasReevaluadas` igual al número de afectadas, `entrevistasOmitidas` `0` y el costo/tokens del lote, y esas entrevistas quedan `puntuada` con un `score` nuevo

#### Scenario: Omitir por idempotencia
- **WHEN** un usuario autenticado ejecuta la re-evaluación con `idsEntrevistas` que incluyen entrevistas ya puntuadas con la rúbrica vigente
- **THEN** esas entrevistas se cuentan en `entrevistasOmitidas` y no se re-puntúan

#### Scenario: Sin configuración BYOK
- **WHEN** un usuario sin config BYOK ejecuta la re-evaluación (en modo real) de entrevistas que requieren re-puntuarse
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado ejecuta la re-evaluación de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

