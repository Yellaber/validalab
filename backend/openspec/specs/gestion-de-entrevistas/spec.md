# gestion-de-entrevistas Specification

## Purpose
TBD - created by archiving change registro-de-entrevistas. Update Purpose after archive.
## Requirements
### Requirement: Registrar una entrevista vinculada a idea, contacto y guión
El sistema SHALL permitir a un usuario autenticado registrar una entrevista de una idea propia con `contactoId`, `guionId` y las `respuestas` capturadas (opcionalmente `citas`). El `ideaId` SHALL derivarse del path; el cuerpo NUNCA SHALL aceptar el `score`. El `contactoId` SHALL ser un contacto de la misma idea y el `guionId` un guión del mismo usuario; si el vínculo no es válido, la respuesta SHALL ser `422 ENTREVISTA_SIN_VINCULO`. Crear la entrevista SHALL mover el contacto al estado `entrevistado`; un contacto ya `entrevistado` o `descartado` SHALL responder `409 CONFLICTO`. La entrevista SHALL nacer con `estadoScoring` `pendiente` y sin `score`, y registrarla SHALL disparar el scoring del agente de forma **asíncrona** (el `estadoScoring` evoluciona en segundo plano hacia `procesando` y luego `puntuada` o `fallida`, sin bloquear la respuesta). Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea inexistente `404 RECURSO_NO_ENCONTRADO`; un payload mal formado `VALIDACION_FALLIDA`.

#### Scenario: Creación exitosa mueve el contacto a entrevistado
- **WHEN** un usuario autenticado registra una entrevista sobre una idea suya con un `contactoId` de esa idea, un `guionId` propio y las `respuestas`
- **THEN** la respuesta es `201` con la `Entrevista` vinculada a esa idea y contacto, con `estadoScoring` `pendiente`
- **AND** el contacto queda en estado `entrevistado`
- **AND** el scoring del agente queda disparado en segundo plano

#### Scenario: Sin vínculo válido
- **WHEN** un usuario autenticado registra una entrevista sin un `contactoId` válido de la idea (o con un `guionId` ajeno)
- **THEN** la respuesta es `422` con `codigo` `ENTREVISTA_SIN_VINCULO`

#### Scenario: Contacto ya entrevistado o descartado
- **WHEN** un usuario autenticado registra una entrevista con un `contactoId` ya en estado `entrevistado` o `descartado`
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado registra una entrevista sobre una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Listar y consultar las entrevistas de una idea
El sistema SHALL devolver, paginadas, las entrevistas de una idea propia, con filtros opcionales por `contactoId` y por `estadoScoring` (`pendiente`, `procesando`, `puntuada` o `fallida`), y SHALL devolver una entrevista propia con sus `respuestas`, `citas`, su bloque `score` (o `null`) y su `ajuste` (o `null`). Una idea o entrevista ajena SHALL responder `403 ACCESO_DENEGADO`; un identificador inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado paginado
- **WHEN** un usuario autenticado lista las entrevistas de una idea suya
- **THEN** la respuesta es `200` con una página de `Entrevista` y su bloque `paginacion`

#### Scenario: Filtro por estado de scoring
- **WHEN** un usuario autenticado lista las entrevistas filtrando por `estadoScoring` `puntuada`
- **THEN** la respuesta incluye solo las entrevistas cuyo scoring está `puntuada`

#### Scenario: Consultar una entrevista
- **WHEN** un usuario autenticado consulta una entrevista suya
- **THEN** la respuesta es `200` con la `Entrevista`, incluyendo sus `respuestas` y `citas`

### Requirement: Capturar y editar respuestas y citas de una entrevista
El sistema SHALL permitir capturar `citas` textuales al crear y editar la entrevista, y SHALL permitir editar las `respuestas` y/o `citas` de una entrevista propia. El cuerpo de edición NUNCA SHALL cambiar `ideaId`, `contactoId`, `guionId` ni el bloque `score`. Cambiar las `respuestas` SHALL reiniciar el `estadoScoring` a `pendiente` (invalidando el `score` previo) y SHALL re-disparar el scoring del agente de forma asíncrona; cambiar solo las `citas` NO SHALL afectar el estado del scoring ni disparar el agente. Una idea o entrevista ajena SHALL responder `403 ACCESO_DENEGADO`; un identificador inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `VALIDACION_FALLIDA`.

#### Scenario: Registrar citas al crear
- **WHEN** un usuario autenticado registra una entrevista incluyendo `citas` con su `texto`
- **THEN** la respuesta es `201` con la `Entrevista` que conserva las citas como evidencia, cada una con `id`

#### Scenario: Editar respuestas reinicia el estado de scoring
- **WHEN** un usuario autenticado edita las `respuestas` de una entrevista
- **THEN** la respuesta es `200` con la `Entrevista` cuyo `estadoScoring` vuelve a `pendiente`
- **AND** el scoring del agente queda re-disparado en segundo plano

#### Scenario: Editar solo citas no afecta el scoring
- **WHEN** un usuario autenticado edita solo las `citas` de una entrevista
- **THEN** la respuesta es `200` con la `Entrevista` conservando su `estadoScoring`, sin re-disparar el agente

### Requirement: Eliminar una entrevista
El sistema SHALL permitir eliminar una entrevista propia. La respuesta exitosa SHALL ser `204` sin contenido. Una idea o entrevista ajena SHALL responder `403 ACCESO_DENEGADO`; un `idEntrevista` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado elimina una entrevista suya
- **THEN** la respuesta es `204` sin contenido

### Requirement: Ajustar el score conservando ambos valores
El sistema SHALL permitir registrar un ajuste humano del score con `scoreAjustado` (0–10) y una `nota`. El sistema SHALL conservar ambos valores: el `score` del agente (cuando exista) y el `ajuste` del usuario. Un `scoreAjustado` fuera de `0–10` o sin `nota` SHALL responder `VALIDACION_FALLIDA`. Una idea o entrevista ajena SHALL responder `403 ACCESO_DENEGADO`; un `idEntrevista` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Ajuste exitoso registra el bloque ajuste
- **WHEN** un usuario autenticado ajusta el score de una entrevista suya con `scoreAjustado` `5` y una `nota`
- **THEN** la respuesta es `200` con la `Entrevista` cuyo bloque `ajuste` registra `scoreAjustado` `5` y su `nota`, sin alterar el bloque `score` del agente

#### Scenario: Ajuste fuera de rango
- **WHEN** un usuario autenticado ajusta el score con `scoreAjustado` fuera de `0–10` o sin `nota`
- **THEN** la respuesta es `VALIDACION_FALLIDA`

