# reevaluacion-en-lote Specification

## Purpose
TBD - created by archiving change reevaluacion-en-lote. Update Purpose after archive.
## Requirements
### Requirement: Servicio de re-evaluación en lote contra el contrato
El cliente SHALL exponer un servicio inyectable que encapsule las llamadas HTTP de la re-evaluación en lote del tag `entrevistas` (`GET /ideas/{id}/entrevistas/reevaluacion/estimacion`, `POST /ideas/{id}/entrevistas/reevaluacion`). El servicio MUST derivar los tipos del contrato (`EstimacionReevaluacion`, `ReevaluacionLoteRequest`, `ResultadoReevaluacion`) y NUNCA MUST enviar `ownerId`. El cuerpo de la ejecución MUST ser opcional: sin `idsEntrevistas` se re-evalúan todas las afectadas; un subconjunto va explícito. El servicio MUST apoyarse en la plomería HTTP del E0 sin reimplementarla.

#### Scenario: Las operaciones usan las rutas del contrato
- **WHEN** un componente invoca la estimación o la ejecución de la re-evaluación
- **THEN** el servicio emite la petición HTTP a la ruta y método correspondientes del tag `entrevistas`

#### Scenario: La ejecución por defecto no lleva subconjunto
- **WHEN** el servicio ejecuta la re-evaluación sin `idsEntrevistas`
- **THEN** el cuerpo del `POST` va vacío y el servidor re-evalúa todas las entrevistas afectadas

### Requirement: Estimar el costo de la re-evaluación sin ejecutar
El cliente SHALL presentar, antes de ejecutar, la estimación de la re-evaluación consumiendo `GET /ideas/{id}/entrevistas/reevaluacion/estimacion`, mostrando `entrevistasAfectadas`, el `modeloScoring` con que se haría (o que falta BYOK si es `null`), el `costoEstimado` y los tokens estimados. La estimación NO SHALL mutar ni re-puntuar nada. Un `403 ACCESO_DENEGADO` MUST mostrarse como acceso denegado; un `404 RECURSO_NO_ENCONTRADO` como idea inexistente.

#### Scenario: Estimación con entrevistas afectadas
- **WHEN** el usuario abre la re-evaluación de una idea con entrevistas desactualizadas por un cambio de rúbrica
- **THEN** el cliente hace `GET .../reevaluacion/estimacion` y muestra cuántas se re-puntuarían y el costo estimado, sin ejecutar nada

#### Scenario: Nada por re-evaluar
- **WHEN** la estimación devuelve `entrevistasAfectadas` en `0`
- **THEN** el cliente comunica que todo está al día y no ofrece la acción de ejecutar

#### Scenario: Idea ajena
- **WHEN** `GET .../reevaluacion/estimacion` responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra un mensaje de acceso denegado sin revelar la estimación

### Requirement: Ejecutar la re-evaluación en lote bajo confirmación explícita
El cliente SHALL ofrecer la ejecución de la re-evaluación vía `POST /ideas/{id}/entrevistas/reevaluacion` como una acción **explícita** del usuario (nunca automática), y solo cuando hay entrevistas afectadas y hay proveedor configurado. Tras ejecutar, el cliente MUST mostrar el `ResultadoReevaluacion` (entrevistas re-puntuadas, omitidas por idempotencia y costo real del lote) y refrescar la estimación. El cliente MUST traducir `409 CONFLICTO` (sin BYOK) a un aviso de configurar el proveedor y `503 PROVEEDOR_IA_NO_DISPONIBLE` a indisponibilidad temporal, sin romper la vista.

#### Scenario: Ejecución exitosa
- **WHEN** el usuario confirma la re-evaluación con entrevistas afectadas
- **THEN** el cliente hace `POST .../reevaluacion` y muestra cuántas se re-puntuaron, cuántas se omitieron y el costo real del lote

#### Scenario: Sin configuración BYOK
- **WHEN** `POST .../reevaluacion` responde `409 CONFLICTO`
- **THEN** el cliente muestra que hace falta configurar el proveedor de IA (BYOK), sin romper la vista

#### Scenario: Proveedor no disponible
- **WHEN** `POST .../reevaluacion` responde `503 PROVEEDOR_IA_NO_DISPONIBLE`
- **THEN** el cliente muestra un aviso de indisponibilidad temporal y permite reintentar

### Requirement: Comunicar que el costo del lote es un estimado, no el saldo
El cliente SHALL presentar el costo de la estimación y del resultado siempre como un **estimado del consumo vía ValidaLab**, NUNCA como el saldo de la cuenta (RNF-17), mostrando la `aclaracion` que acompaña a la estimación.

#### Scenario: Se muestra la aclaración normativa
- **WHEN** el cliente presenta la estimación de la re-evaluación
- **THEN** muestra la `aclaracion` que aclara que es un estimado del consumo vía ValidaLab, no el saldo

