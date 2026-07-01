## ADDED Requirements

### Requirement: Archivar una idea conservando su evidencia
El sistema SHALL permitir a un usuario autenticado marcar una idea propia como `archivada` sin borrar su información ni su evidencia asociada. La respuesta SHALL devolver la `Idea` en estado `archivada`. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Archivado exitoso
- **WHEN** un usuario autenticado archiva una idea suya
- **THEN** la respuesta es `200` con la `Idea` en estado `archivada`
- **AND** la operación no elimina la idea ni su evidencia

#### Scenario: Archivar una idea ajena
- **WHEN** un usuario autenticado archiva una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Archivar una idea inexistente
- **WHEN** un usuario autenticado archiva un `id` que no existe
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Reabrir (desarchivar) una idea archivada
El sistema SHALL permitir reabrir una idea propia que está `archivada`, devolviéndola al estado `borrador` para retomarla, conservando su evidencia. Reabrir una idea que no está `archivada` SHALL responder `409 CONFLICTO`. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Reapertura exitosa
- **WHEN** un usuario autenticado desarchiva una idea suya en estado `archivada`
- **THEN** la respuesta es `200` con la `Idea` en estado `borrador`
- **AND** la evidencia previa de la idea se conserva

#### Scenario: La idea no estaba archivada
- **WHEN** un usuario autenticado desarchiva una idea suya que no está `archivada`
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`

#### Scenario: Desarchivar una idea ajena
- **WHEN** un usuario autenticado desarchiva una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`
