## ADDED Requirements

### Requirement: Gestionar guiones de entrevista reutilizables
El contrato SHALL definir un recurso `/guiones` (autenticado, nivel de usuario) para el guión de entrevista reutilizable **entre ideas** (RF-08, HU-11), con `POST /guiones` (crear), `GET /guiones` (listar paginado), `GET /guiones/{idGuion}` (consultar), `PATCH /guiones/{idGuion}` (editar) y `DELETE /guiones/{idGuion}` (eliminar). Un guión MUST contener `preguntas` ordenadas. El `ownerId` MUST derivarse del token; un guión ajeno MUST devolver `403 ACCESO_DENEGADO`; un `idGuion` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

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

### Requirement: Registrar una entrevista vinculada a idea y contacto
El contrato SHALL definir `POST /ideas/{id}/entrevistas` (autenticado) que crea una entrevista de una idea propia (HU-13, RF-09), con `contactoId`, `guionId` y las `respuestas` capturadas (y opcionalmente `citas`). El `ideaId` MUST derivarse del path y el `ownerId` del token; el cuerpo MUST NOT permitir asignar el `score`. El `contactoId` MUST ser un contacto de la misma idea y el `guionId` un guión del mismo usuario; si la idea o el contacto no son válidos o no pertenecen al usuario, el contrato MUST responder `422 ENTREVISTA_SIN_VINCULO` (RNF-14). Crear la entrevista MUST mover el contacto al estado `entrevistado`; un contacto ya `entrevistado` o `descartado` MUST responder `409 CONFLICTO`. La respuesta exitosa MUST devolver el recurso `Entrevista`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` de idea inexistente `404 RECURSO_NO_ENCONTRADO`; un payload mal formado `422 VALIDACION_FALLIDA`.

#### Scenario: Creación exitosa
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/entrevistas` sobre una idea suya con un `contactoId` de esa idea en estado `agendado`, un `guionId` propio y las `respuestas`
- **THEN** el contrato responde `201` con la `Entrevista` creada vinculada a esa idea y contacto
- **AND** el contacto queda en estado `entrevistado`

#### Scenario: Sin idea o contacto válidos
- **WHEN** un usuario autenticado intenta `POST /ideas/{id}/entrevistas` sin un `contactoId` válido de la idea (o con uno ajeno)
- **THEN** el contrato responde `422` con `codigo` `ENTREVISTA_SIN_VINCULO`

#### Scenario: Contacto ya entrevistado o descartado
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/entrevistas` con un `contactoId` ya en estado `entrevistado` o `descartado`
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/entrevistas` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Listar y consultar las entrevistas de una idea
El contrato SHALL definir `GET /ideas/{id}/entrevistas` (autenticado, paginado) que devuelve las entrevistas de una idea propia, con filtros opcionales por `contactoId` y por `estadoScoring`, y `GET /ideas/{id}/entrevistas/{idEntrevista}` que devuelve una entrevista propia con sus `respuestas`, `citas`, su bloque `score` del agente y su `ajuste` del usuario si existe. Una idea o entrevista ajena MUST devolver `403 ACCESO_DENEGADO`; un identificador inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado paginado de entrevistas propias
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/entrevistas` sobre una idea suya
- **THEN** el contrato responde `200` con una página de `Entrevista` y su bloque `paginacion`

#### Scenario: Filtro por estado de scoring
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/entrevistas?estadoScoring=pendiente`
- **THEN** el contrato responde `200` con solo las entrevistas cuyo scoring está `pendiente`

#### Scenario: Consultar una entrevista con su score
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/entrevistas/{idEntrevista}` sobre una entrevista suya ya puntuada
- **THEN** el contrato responde `200` con la `Entrevista`, incluyendo su bloque `score` del agente

### Requirement: Scoring automático de la entrevista por el agente
El contrato SHALL especificar que registrar una entrevista dispara el **scoring automático del agente** (RF-09b, HU-12), sin que el usuario asigne el score. La entrevista MUST exponer `estadoScoring` (`pendiente` | `puntuada` | `fallida`) y, cuando esté `puntuada`, el bloque `score` con `score` (0–10), `justificacion`, `senales` y `confianza` (0–100), más `proveedor`, `modelo` y `rubricaVersion` para trazabilidad. El contrato SHALL definir la acción `POST /ideas/{id}/entrevistas/{idEntrevista}/puntuar` para (re)disparar el scoring (p. ej. tras un `estadoScoring` `fallida`). El bloque `score` MUST ser de solo lectura (lo produce el agente, nunca el cliente). Si la salida del agente no cumple su esquema tras reintentos, el `estadoScoring` MUST quedar `fallida` (`SALIDA_AGENTE_INVALIDA`), sin romper el flujo. Una idea o entrevista ajena MUST devolver `403 ACCESO_DENEGADO`; un identificador inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: El agente puntúa al registrar
- **WHEN** un usuario autenticado registra una entrevista con sus respuestas
- **THEN** el contrato dispara el scoring del agente y la entrevista expone su `estadoScoring` y, al completarse, el bloque `score` con `score`, `justificacion`, `senales` y `confianza`

#### Scenario: Re-disparar el scoring
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/entrevistas/{idEntrevista}/puntuar` sobre una entrevista propia
- **THEN** el contrato responde `200` con la `Entrevista` y su `estadoScoring` actualizado

#### Scenario: El cliente no puede fijar el score
- **WHEN** un usuario autenticado crea o edita una entrevista
- **THEN** el contrato no contempla recibir el bloque `score` en el cuerpo (lo asigna el agente)

### Requirement: Editar las respuestas y citas de una entrevista
El contrato SHALL definir `PATCH /ideas/{id}/entrevistas/{idEntrevista}` (autenticado) que permite editar las `respuestas` y `citas` de una entrevista propia. El cuerpo MUST NOT permitir cambiar `ideaId`, `contactoId` ni `guionId` (la trazabilidad del vínculo es fija) ni el bloque `score`. Cambiar las `respuestas` MUST invalidar el score previo (la entrevista vuelve a `estadoScoring` `pendiente` y se re-dispara el scoring); cambiar solo las `citas` no afecta el scoring. Una idea o entrevista ajena MUST devolver `403 ACCESO_DENEGADO`; un identificador inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

#### Scenario: Editar respuestas re-dispara el scoring
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}/entrevistas/{idEntrevista}` cambiando las `respuestas`
- **THEN** el contrato responde `200` con la `Entrevista` cuyo `estadoScoring` vuelve a `pendiente` para re-puntuarse

#### Scenario: Editar solo citas no afecta el score
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}/entrevistas/{idEntrevista}` cambiando solo las `citas`
- **THEN** el contrato responde `200` con la `Entrevista` conservando su `score` y `estadoScoring`

### Requirement: Eliminar una entrevista
El contrato SHALL definir `DELETE /ideas/{id}/entrevistas/{idEntrevista}` (autenticado) que elimina una entrevista propia. La respuesta exitosa MUST ser `204` sin contenido. Una idea o entrevista ajena MUST devolver `403 ACCESO_DENEGADO`; un `idEntrevista` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/entrevistas/{idEntrevista}` sobre una entrevista suya
- **THEN** el contrato responde `204` sin contenido

### Requirement: Ajustar el score del agente conservando ambos valores
El contrato SHALL definir `POST /ideas/{id}/entrevistas/{idEntrevista}/ajuste-score` (autenticado) que permite al usuario ajustar el score del agente registrando `scoreAjustado` (0–10) y una `nota` con el motivo (RF-09c, HU-12b). El contrato MUST conservar **ambos** valores: el `score` original del agente y el `ajuste` del usuario. El `ajuste` MUST ser el valor que prevalece en el cálculo de los KPIs (E5). La respuesta exitosa MUST devolver la `Entrevista` con su bloque `score` original intacto y su bloque `ajuste`. Una idea o entrevista ajena MUST devolver `403 ACCESO_DENEGADO`; un `idEntrevista` inexistente `404 RECURSO_NO_ENCONTRADO`; un `scoreAjustado` fuera de rango o sin `nota` `422 VALIDACION_FALLIDA`.

#### Scenario: Ajuste exitoso conserva ambos valores
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/entrevistas/{idEntrevista}/ajuste-score` con `scoreAjustado` `5` y una `nota`, sobre una entrevista que el agente puntuó con `8`
- **THEN** el contrato responde `200` con la `Entrevista` que conserva el `score` del agente (`8`) y registra el `ajuste` (`5`) con su `nota`

#### Scenario: Ajuste fuera de rango
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/entrevistas/{idEntrevista}/ajuste-score` con `scoreAjustado` fuera de `0–10` o sin `nota`
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA`

### Requirement: Capturar citas textuales de la entrevista
El contrato SHALL permitir capturar `citas` textuales del entrevistado asociadas a una entrevista (RF-10, HU-14), como colección embebida en el recurso `Entrevista`, capturables al crear (`CrearEntrevistaRequest`) y al editar (`ActualizarEntrevistaRequest`). Cada cita MUST conservar su `texto`; MAY incluir un `contexto`.

#### Scenario: Registrar citas al crear la entrevista
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/entrevistas` incluyendo `citas` con su `texto`
- **THEN** el contrato responde `201` con la `Entrevista` que conserva las citas como evidencia cualitativa

#### Scenario: Consultar las citas de una entrevista
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/entrevistas/{idEntrevista}` sobre una entrevista con citas
- **THEN** el contrato responde `200` con la `Entrevista` y su colección `citas`
