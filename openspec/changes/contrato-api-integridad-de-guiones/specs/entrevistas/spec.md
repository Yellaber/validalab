## MODIFIED Requirements

### Requirement: Gestionar guiones de entrevista reutilizables
El contrato SHALL definir un recurso `/guiones` (autenticado, nivel de usuario) para el guión de entrevista reutilizable **entre ideas** (RF-08, HU-11), con `POST /guiones` (crear), `GET /guiones` (listar paginado), `GET /guiones/{idGuion}` (consultar), `PATCH /guiones/{idGuion}` (editar) y `DELETE /guiones/{idGuion}` (eliminar). Un guión MUST contener `preguntas` ordenadas. El `ownerId` MUST derivarse del token; un guión ajeno MUST devolver `403 ACCESO_DENEGADO`; un `idGuion` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

Un guión referenciado por **al menos una entrevista** SHALL ser inmutable en su estructura, para preservar la correspondencia entre el `preguntaId` de cada respuesta registrada y el texto que efectivamente se preguntó (RNF-15). En consecuencia: `DELETE /guiones/{idGuion}` MUST responder `409 CONFLICTO` cuando exista alguna entrevista que lo referencie, y `PATCH /guiones/{idGuion}` MUST responder `409 CONFLICTO` cuando el cuerpo incluya `preguntas` y el guión tenga alguna entrevista. El `nombre` y la `descripcion` MUST seguir siendo editables en ese caso, porque no participan en la evidencia. Un guión **sin** entrevistas MUST poder eliminarse y ver reemplazadas sus `preguntas` sin restricción.

#### Scenario: Crear un guión con preguntas ordenadas
- **WHEN** un usuario autenticado hace `POST /guiones` con un `nombre` y una lista de `preguntas` con su `orden`
- **THEN** el contrato responde `201` con el `Guion` creado y sus preguntas ordenadas

#### Scenario: Listar los guiones propios
- **WHEN** un usuario autenticado hace `GET /guiones`
- **THEN** el contrato responde `200` con una página de `Guion` propios y su bloque `paginacion`

#### Scenario: Guión ajeno
- **WHEN** un usuario autenticado hace `GET /guiones/{idGuion}` sobre un guión de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Sin token
- **WHEN** se hace `POST /guiones` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

#### Scenario: Eliminar un guión sin entrevistas
- **WHEN** un usuario autenticado hace `DELETE /guiones/{idGuion}` sobre un guión propio que ninguna entrevista referencia
- **THEN** el contrato responde `204` sin contenido

#### Scenario: Eliminar un guión que ya tiene evidencia
- **WHEN** un usuario autenticado hace `DELETE /guiones/{idGuion}` sobre un guión referenciado por al menos una entrevista
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO` y el guión permanece

#### Scenario: Reemplazar las preguntas de un guión sin entrevistas
- **WHEN** un usuario autenticado hace `PATCH /guiones/{idGuion}` con `preguntas` sobre un guión que ninguna entrevista referencia
- **THEN** el contrato responde `200` con el guión actualizado y su conjunto ordenado reemplazado

#### Scenario: Reemplazar las preguntas de un guión que ya tiene evidencia
- **WHEN** un usuario autenticado hace `PATCH /guiones/{idGuion}` incluyendo `preguntas` sobre un guión referenciado por al menos una entrevista
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO` y las preguntas permanecen sin cambios

#### Scenario: Editar el nombre de un guión que ya tiene evidencia
- **WHEN** un usuario autenticado hace `PATCH /guiones/{idGuion}` con solo `nombre` y/o `descripcion` sobre un guión referenciado por entrevistas
- **THEN** el contrato responde `200` con el guión actualizado, porque esos campos no participan en la evidencia
