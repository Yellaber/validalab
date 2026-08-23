## MODIFIED Requirements

### Requirement: Eliminar una entrevista
El contrato SHALL definir `DELETE /ideas/{id}/entrevistas/{idEntrevista}` (autenticado) que elimina una entrevista propia. La respuesta exitosa MUST ser `204` sin contenido. Una idea o entrevista ajena MUST devolver `403 ACCESO_DENEGADO`; un `idEntrevista` inexistente `404 RECURSO_NO_ENCONTRADO`.

Eliminar una entrevista MUST devolver el contacto vinculado al estado `agendado`, cerrando el ciclo que abre el registro (que lo mueve a `entrevistado`). El estado `agendado` NO es una elección arbitraria: el embudo prohíbe los saltos y `entrevistado` solo es alcanzable desde `agendado`, luego es el estado inmediatamente anterior. Sin esta reversión, el `409 CONFLICTO` que impide registrar una entrevista sobre un contacto ya `entrevistado` haría **irreversible** cualquier entrevista creada por error, dejando a esa persona inentrevistable de forma permanente.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/entrevistas/{idEntrevista}` sobre una entrevista suya
- **THEN** el contrato responde `204` sin contenido

#### Scenario: El contacto vuelve a agendado
- **WHEN** un usuario autenticado elimina una entrevista cuyo contacto está en estado `entrevistado`
- **THEN** el contacto queda en estado `agendado`

#### Scenario: Corregir una entrevista registrada por error
- **WHEN** un usuario autenticado elimina una entrevista y a continuación registra otra sobre el mismo contacto
- **THEN** el contrato acepta el nuevo registro y no responde `409`, porque el contacto ya no está en `entrevistado`
