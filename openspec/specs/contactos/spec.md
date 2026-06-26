# contactos Specification

## Purpose
TBD - created by archiving change contrato-api-contactos. Update Purpose after archive.
## Requirements
### Requirement: Registrar contactos de una idea
El contrato SHALL definir `POST /ideas/{id}/contactos` (autenticado) que crea un contacto asociado a una idea propia, con `nombre`, `perfil`, `canal` (`CanalContacto`) y `origen` (`OrigenContacto`) (RF-05, HU-07). El contacto creado MUST iniciar en estado `por_contactar` y MUST quedar vinculado a la idea por el path (`ideaId` derivado de la idea, nunca recibido en el cuerpo). El cuerpo MUST NOT permitir fijar el `estado` ni las fechas de toque. Cuando `origen` es `referido`, el cuerpo MAY incluir `referidoPorId` apuntando a otro contacto de la misma idea (HU-10). La respuesta exitosa MUST devolver el recurso `Contacto`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` de idea inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

#### Scenario: Creación exitosa
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos` sobre una idea suya con `nombre`, `canal` `linkedin` y `origen` `busqueda_directa`
- **THEN** el contrato responde `201` con el `Contacto` creado en estado `por_contactar`
- **AND** su `ideaId` es el de la idea del path, no un valor del cuerpo

#### Scenario: Registrar un referido
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos` con `origen` `referido` y `referidoPorId` igual al `id` de otro contacto de la misma idea
- **THEN** el contrato responde `201` con el `Contacto` cuyo `referidoPorId` traza la cadena de referidos

#### Scenario: Canal inválido
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos` con un `canal` fuera del catálogo `CanalContacto`
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Sin token
- **WHEN** se hace `POST /ideas/{id}/contactos` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Listar los contactos de una idea
El contrato SHALL definir `GET /ideas/{id}/contactos` (autenticado) que devuelve los contactos de una idea propia en el sobre paginado `ContactosPaginados`, con los parámetros `pagina` y `porPagina`. MUST admitir un filtro opcional por `estado` del embudo de outreach. Solo MUST devolver contactos de la idea del usuario autenticado. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado paginado de contactos propios
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/contactos` sobre una idea suya
- **THEN** el contrato responde `200` con una página de `Contacto` y su bloque `paginacion`

#### Scenario: Filtro por estado del embudo
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/contactos?estado=agendado`
- **THEN** el contrato responde `200` con solo los contactos en estado `agendado`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/contactos` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO` sin revelar datos

### Requirement: Consultar un contacto
El contrato SHALL definir `GET /ideas/{id}/contactos/{idContacto}` (autenticado) que devuelve un contacto propio con su `perfil`, `canal`, `origen`, `estado` del embudo y fechas de toque. Un contacto o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta exitosa
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/contactos/{idContacto}` sobre un contacto suyo
- **THEN** el contrato responde `200` con el `Contacto` solicitado

#### Scenario: Contacto inexistente
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/contactos/{idContacto}` con un `idContacto` que no existe en esa idea
- **THEN** el contrato responde `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Editar el contenido de un contacto
El contrato SHALL definir `PATCH /ideas/{id}/contactos/{idContacto}` (autenticado) que permite editar el contenido de un contacto propio (`nombre`, `perfil`, `enlace`, `canal`, `origen`, `referidoPorId`, `notas`). El cuerpo MUST NOT permitir cambiar el `ideaId` ni el `estado` del embudo (el `estado` se cambia con la acción de transición, y las fechas de toque con la acción de toque). Un contacto o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

#### Scenario: Edición exitosa
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}/contactos/{idContacto}` con un `perfil` y `notas` nuevos
- **THEN** el contrato responde `200` con el `Contacto` actualizado

#### Scenario: El cuerpo no acepta estado
- **WHEN** un usuario autenticado intenta `PATCH /ideas/{id}/contactos/{idContacto}` con un campo `estado`
- **THEN** el contrato no contempla cambiar el `estado` por esta vía (el cambio de estado se hace con la acción de transición del embudo)

### Requirement: Eliminar un contacto
El contrato SHALL definir `DELETE /ideas/{id}/contactos/{idContacto}` (autenticado) que elimina un contacto propio registrado por error. La respuesta exitosa MUST ser `204` sin contenido. Un contacto o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/contactos/{idContacto}` sobre un contacto suyo
- **THEN** el contrato responde `204` sin contenido

#### Scenario: Contacto ajeno
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/contactos/{idContacto}` sobre un contacto de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Transicionar un contacto por el embudo de outreach
El contrato SHALL definir `POST /ideas/{id}/contactos/{idContacto}/estado` (autenticado) que mueve un contacto propio entre los estados del embudo `por_contactar → contactado → respondio → agendado → entrevistado → descartado` (RF-06, HU-08). El cuerpo MUST llevar el `estado` destino (`TransicionEstadoRequest`). El estado `descartado` MUST ser alcanzable desde cualquier estado no terminal. El estado `entrevistado` MUST NOT ser alcanzable por esta vía: solo se asigna al registrar una entrevista (E4). Una transición inválida (p. ej. saltar de `por_contactar` a `agendado`, o avanzar desde un estado terminal) MUST devolver `409 CONFLICTO`. La respuesta exitosa MUST devolver el `Contacto` con su nuevo `estado`. Un contacto o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`; un `estado` fuera del catálogo `EstadoOutreach` `422 VALIDACION_FALLIDA`.

#### Scenario: Avance válido en el embudo
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/estado` con `estado` `contactado` sobre un contacto en `por_contactar`
- **THEN** el contrato responde `200` con el `Contacto` en estado `contactado`

#### Scenario: Descartar un contacto
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/estado` con `estado` `descartado` sobre un contacto en `contactado`
- **THEN** el contrato responde `200` con el `Contacto` en estado `descartado`

#### Scenario: Transición inválida
- **WHEN** un usuario autenticado intenta una transición no permitida del embudo (p. ej. de `por_contactar` directamente a `agendado`)
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`

#### Scenario: Marcar entrevistado manualmente no permitido
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/estado` con `estado` `entrevistado`
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`, porque ese estado solo se alcanza al registrar una entrevista (E4)

### Requirement: Registrar toques de outreach con límite de dos
El contrato SHALL definir `POST /ideas/{id}/contactos/{idContacto}/toques` (autenticado) que registra un toque de outreach sobre un contacto propio, con su fecha (RF-07, HU-09). El primer toque MUST fijar `primerToqueEn` y el segundo (único follow-up) `segundoToqueEn`. El cuerpo (`RegistrarToqueRequest`) MAY incluir la `fecha` del toque; si se omite, se asume el momento del registro. Un tercer toque MUST devolver `409 CONFLICTO` por exceder el límite de dos toques por contacto. La respuesta exitosa MUST devolver el `Contacto` con la fecha de toque registrada. Un contacto o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Primer toque
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/toques` sobre un contacto sin toques previos
- **THEN** el contrato responde `200` con el `Contacto` cuyo `primerToqueEn` queda registrado

#### Scenario: Segundo toque (follow-up)
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/toques` sobre un contacto que ya tiene `primerToqueEn`
- **THEN** el contrato responde `200` con el `Contacto` cuyo `segundoToqueEn` queda registrado

#### Scenario: Tercer toque excede el límite
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/toques` sobre un contacto que ya tiene dos toques
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`

