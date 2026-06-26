## ADDED Requirements

### Requirement: Registro de tokens y costo por scoring
El contrato SHALL enriquecer el schema `ScoreEntrevista` con `tokensEntrada`, `tokensSalida`, `costoEstimado`, `moneda` y `hashEntrada`, de modo que cada scoring del agente registre los tokens consumidos, el costo estimado calculado localmente y el hash de su entrada (RF-22e). El `costoEstimado` MUST ser un estimado del consumo vía ValidaLab, no el saldo de la cuenta (RNF-17). El `hashEntrada` MUST derivarse de las respuestas de la entrevista y la versión de rúbrica, para soportar la idempotencia.

#### Scenario: Un scoring registra su consumo
- **WHEN** el agente puntúa una entrevista
- **THEN** el `score` resultante incluye `tokensEntrada`, `tokensSalida`, `costoEstimado` y `moneda`, además del `hashEntrada` de su entrada

### Requirement: Scoring idempotente
El contrato SHALL especificar que guardar o actualizar una entrevista (`PUT`/`PATCH`) o re-disparar el scoring (`POST .../puntuar`) **sin** cambios en sus respuestas ni en la versión de rúbrica —es decir, con el mismo `hashEntrada`— MUST NOT volver a invocar al agente (RF-22c, HU-30). En ese caso se MUST conservar el `score` y el `costoEstimado` previos, sin generar una nueva llamada ni un nuevo costo.

#### Scenario: Editar una entrevista sin cambiar las respuestas
- **WHEN** un usuario actualiza una entrevista ya puntuada sin modificar sus respuestas ni la rúbrica
- **THEN** el contrato no re-invoca al agente y conserva el `score` y el `costoEstimado` previos

#### Scenario: Cambiar las respuestas sí re-dispara el scoring
- **WHEN** un usuario actualiza las respuestas de una entrevista (cambia su `hashEntrada`)
- **THEN** el contrato re-dispara el scoring del agente y registra el nuevo `costoEstimado`

### Requirement: Estimación de costo de una re-evaluación en lote
El contrato SHALL definir `GET /ideas/{id}/entrevistas/reevaluacion/estimacion` (autenticado) que calcula, **sin ejecutar**, el costo estimado de re-evaluar las entrevistas de una idea propia tras un cambio de rúbrica (RF-22h, HU-32): número de entrevistas afectadas, tokens estimados y costo estimado con el `modeloScoring` configurado. La operación MUST NOT mutar ni re-puntuar nada. La respuesta MUST declarar que es un estimado (`esEstimado`, `aclaracion`). Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; inexistente, `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Ver el costo estimado antes de confirmar
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/entrevistas/reevaluacion/estimacion` sobre una idea propia
- **THEN** el contrato responde `200` con las entrevistas afectadas y el costo estimado, sin re-puntuar ninguna

### Requirement: Ejecutar una re-evaluación en lote
El contrato SHALL definir `POST /ideas/{id}/entrevistas/reevaluacion` (autenticado) que re-evalúa en lote las entrevistas de una idea propia tras la confirmación del usuario (RF-22h, HU-32). El cuerpo `ReevaluacionLoteRequest` acepta opcionalmente `idsEntrevistas`; por defecto re-evalúa las entrevistas cuya entrada cambió. La re-evaluación MUST ser una acción explícita del usuario: un cambio de rúbrica NO la dispara automáticamente. La respuesta `ResultadoReevaluacion` MUST informar cuántas entrevistas se re-evaluaron, cuántas se omitieron por idempotencia y el costo estimado. Si el usuario no tiene BYOK configurado, MUST devolver `409 CONFLICTO`; si el proveedor no responde, `503 PROVEEDOR_IA_NO_DISPONIBLE`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`.

#### Scenario: Ejecutar la re-evaluación tras confirmar
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/entrevistas/reevaluacion` sobre una idea propia
- **THEN** el contrato responde `200` con las entrevistas re-evaluadas, las omitidas por idempotencia y el costo estimado

#### Scenario: Re-evaluar sin BYOK configurado
- **WHEN** un usuario sin configuración BYOK hace `POST /ideas/{id}/entrevistas/reevaluacion`
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`

#### Scenario: Proveedor no disponible durante la re-evaluación
- **WHEN** el proveedor de IA no responde durante la re-evaluación en lote
- **THEN** el contrato responde `503` con `codigo` `PROVEEDOR_IA_NO_DISPONIBLE`
