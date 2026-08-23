## MODIFIED Requirements

### Requirement: Eliminar un contacto
El contrato SHALL definir `DELETE /ideas/{id}/contactos/{idContacto}` (autenticado) que elimina un contacto propio registrado por error. La respuesta exitosa MUST ser `204` sin contenido. Un contacto o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`.

Un contacto referenciado por **al menos una entrevista** MUST responder `409 CONFLICTO` y no eliminarse, en defensa de RNF-14: una entrevista no puede existir sin idea y contacto válidos del mismo usuario, y eliminar el contacto dejaría la entrevista en el estado exacto que `ENTREVISTA_SIN_VINCULO` rechaza al crearla. La condición SHALL ser la **existencia de entrevistas que referencien el contacto**, NO el `estado` del contacto: un contacto en estado `entrevistado` cuyas entrevistas se hayan eliminado MUST poder borrarse, porque no queda ninguna referencia huérfana. El contrato SHALL indicar que la vía para eliminar un contacto con evidencia es eliminar antes sus entrevistas.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/contactos/{idContacto}` sobre un contacto suyo
- **THEN** el contrato responde `204` sin contenido

#### Scenario: Contacto ajeno
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/contactos/{idContacto}` sobre un contacto de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Contacto con entrevistas registradas
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/contactos/{idContacto}` sobre un contacto referenciado por al menos una entrevista
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO` y el contacto permanece

#### Scenario: Contacto entrevistado cuyas entrevistas ya se eliminaron
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/contactos/{idContacto}` sobre un contacto en estado `entrevistado` que ya no es referenciado por ninguna entrevista
- **THEN** el contrato responde `204`, porque la condición es la existencia de entrevistas y no el estado del contacto

#### Scenario: Eliminar primero la entrevista habilita eliminar el contacto
- **WHEN** un usuario autenticado elimina la única entrevista que referenciaba a un contacto y a continuación elimina el contacto
- **THEN** el contrato responde `204` a ambas operaciones
