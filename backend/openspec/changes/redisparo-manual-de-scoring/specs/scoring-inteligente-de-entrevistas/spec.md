## ADDED Requirements

### Requirement: Re-disparar manualmente el scoring de una entrevista
El sistema SHALL exponer un re-disparo manual del scoring de una entrevista propia (`POST /ideas/{id}/entrevistas/{idEntrevista}/puntuar`, RF-09b), para reintentar sobre una entrevista `fallida` o `pendiente` sin reeditarla. A diferencia del disparo automático (asíncrono), el re-disparo manual SHALL ejecutarse de forma **síncrona** y devolver `200` con la entrevista y su `estadoScoring` actualizado (`puntuada` o `fallida`). El bloque `score` es de solo lectura: lo produce el agente, nunca el cliente. Si la salida del agente no valida tras reintentos, o falta la configuración BYOK, o el proveedor no responde, el `estadoScoring` SHALL quedar `fallida` sin romper el flujo (el endpoint NO expone `409`/`503`). El re-disparo SHALL respetar la idempotencia (RF-22c): si la entrevista ya está `puntuada` con el hash vigente, SHALL omitir la re-ejecución y conservar el `score`. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea o entrevista inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Re-disparo sobre una entrevista fallida
- **WHEN** un usuario autenticado dispara `POST .../puntuar` sobre una entrevista propia en `estadoScoring` `fallida`
- **THEN** el sistema ejecuta el scoring de forma síncrona y responde `200` con la entrevista cuyo `estadoScoring` queda `puntuada` (con su bloque `score`) o `fallida` si el agente vuelve a fallar

#### Scenario: Re-disparo idempotente no re-puntúa
- **WHEN** un usuario autenticado dispara `POST .../puntuar` sobre una entrevista ya `puntuada` cuyo hash de respuestas + rúbrica no cambió
- **THEN** el sistema omite la re-ejecución y responde `200` conservando el `score` existente

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado dispara `POST .../puntuar` sobre una entrevista de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Entrevista inexistente
- **WHEN** un usuario autenticado dispara `POST .../puntuar` sobre una entrevista que no existe en su idea
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`
