## ADDED Requirements

### Requirement: Crear una idea
El contrato SHALL definir `POST /ideas` (autenticado) que crea una idea con `titulo`, `descripcion`, `problema` y `segmentoBeachhead`. La idea creada MUST quedar asociada al usuario autenticado (`ownerId` derivado del token, nunca recibido en el cuerpo) y MUST iniciar en estado `borrador`. La respuesta exitosa MUST devolver el recurso `Idea`. Un payload inválido MUST devolver `422 VALIDACION_FALLIDA`.

#### Scenario: Creación exitosa
- **WHEN** un usuario autenticado hace `POST /ideas` con `titulo`, `descripcion`, `problema` y `segmentoBeachhead` válidos
- **THEN** el contrato responde `201` con la `Idea` creada en estado `borrador`
- **AND** el `ownerId` de la idea es el del usuario autenticado, no un valor del cuerpo

#### Scenario: Payload inválido
- **WHEN** un usuario autenticado hace `POST /ideas` sin `titulo`
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA` y el detalle por campo

#### Scenario: Sin token
- **WHEN** se hace `POST /ideas` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Listar las ideas propias
El contrato SHALL definir `GET /ideas` (autenticado) que devuelve, paginadas, solo las ideas del usuario autenticado, con su `estado` de validación. MUST usar los parámetros `pagina`/`porPagina` y devolver el sobre `RespuestaPaginada` de `Idea`. MUST aceptar un filtro opcional por `estado`. NUNCA MUST incluir ideas de otros usuarios.

#### Scenario: Listado paginado
- **WHEN** un usuario autenticado hace `GET /ideas?pagina=1&porPagina=20`
- **THEN** el contrato responde `200` con `RespuestaPaginada` cuyos `datos` son `Idea` propias y un bloque `paginacion`

#### Scenario: Filtro por estado
- **WHEN** un usuario autenticado hace `GET /ideas?estado=en_validacion`
- **THEN** el contrato responde `200` con solo las ideas propias en estado `en_validacion`

#### Scenario: Aislamiento en el listado
- **WHEN** un usuario autenticado lista sus ideas
- **THEN** el resultado no incluye ninguna idea cuyo `ownerId` sea de otro usuario

### Requirement: Consultar una idea propia
El contrato SHALL definir `GET /ideas/{id}` (autenticado) que devuelve la `Idea` indicada si pertenece al usuario autenticado. Una idea de otro propietario MUST devolver `403 ACCESO_DENEGADO` sin revelar datos; un `id` inexistente MUST devolver `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta de idea propia
- **WHEN** un usuario autenticado hace `GET /ideas/{id}` de una idea suya
- **THEN** el contrato responde `200` con la `Idea`

#### Scenario: Idea de otro usuario
- **WHEN** un usuario autenticado hace `GET /ideas/{id}` de una idea cuyo `ownerId` es otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO` sin revelar datos de esa idea

#### Scenario: Idea inexistente
- **WHEN** un usuario autenticado hace `GET /ideas/{id}` con un `id` que no existe
- **THEN** el contrato responde `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Editar el contenido de una idea propia
El contrato SHALL definir `PATCH /ideas/{id}` (autenticado) que permite editar el contenido de una idea propia (`titulo`, `descripcion`, `problema`, `segmentoBeachhead`). El cuerpo MUST NOT permitir fijar el `estado` a `go`, `pivote` o `kill`: esas transiciones provienen del veredicto aprobado (E6), no de la edición. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

#### Scenario: Edición de contenido
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}` de una idea suya con un `problema` nuevo
- **THEN** el contrato responde `200` con la `Idea` actualizada

#### Scenario: No se puede fijar el veredicto por edición
- **WHEN** se revisa el esquema de `PATCH /ideas/{id}`
- **THEN** su cuerpo no incluye un campo para fijar el `estado` a `go`, `pivote` o `kill`

#### Scenario: Edición de idea ajena
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}` de una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Archivar una idea conservando su evidencia
El contrato SHALL definir `POST /ideas/{id}/archivar` (autenticado) que marca una idea propia como `archivada` sin borrar su información ni su evidencia asociada. La respuesta MUST devolver la `Idea` en estado `archivada`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Archivado exitoso
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/archivar` de una idea suya
- **THEN** el contrato responde `200` con la `Idea` en estado `archivada`
- **AND** la operación no elimina la idea ni su evidencia

#### Scenario: Archivar una idea ajena
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/archivar` de una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Reabrir (desarchivar) una idea archivada
El contrato SHALL definir `POST /ideas/{id}/desarchivar` (autenticado) que reabre una idea propia que está `archivada`, devolviéndola a un estado activo (`borrador`) para retomarla, conservando su evidencia. La respuesta MUST devolver la `Idea` ya no archivada. Reabrir una idea que no está `archivada` MUST devolver `409 CONFLICTO`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Reapertura exitosa
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/desarchivar` de una idea suya en estado `archivada`
- **THEN** el contrato responde `200` con la `Idea` en estado `borrador`
- **AND** la evidencia previa de la idea se conserva

#### Scenario: La idea no estaba archivada
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/desarchivar` de una idea suya que no está `archivada`
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`

#### Scenario: Desarchivar una idea ajena
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/desarchivar` de una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`
