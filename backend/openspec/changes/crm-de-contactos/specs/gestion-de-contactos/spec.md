## ADDED Requirements

### Requirement: Registrar un contacto de una idea
El sistema SHALL permitir a un usuario autenticado crear un contacto sobre una idea propia con `nombre` y, opcionalmente, `perfil`, `enlace`, `canal`, `origen` y `referidoPorId`. El contacto SHALL quedar vinculado a la idea del path (`ideaId` derivado del path, nunca del cuerpo) y SHALL nacer en estado `por_contactar`. El cuerpo NUNCA SHALL admitir `ideaId`, `estado` ni fechas de toque. Si `referidoPorId` viene, SHALL referenciar a otro contacto de la misma idea (si no, `VALIDACION_FALLIDA`). Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `VALIDACION_FALLIDA`.

#### Scenario: Creación exitosa
- **WHEN** un usuario autenticado crea un contacto sobre una idea suya con `nombre` y `canal` `linkedin`
- **THEN** la respuesta es `201` con el `Contacto` en estado `por_contactar`
- **AND** su `ideaId` es el de la idea del path, no un valor del cuerpo

#### Scenario: Registrar un referido
- **WHEN** un usuario autenticado crea un contacto con `origen` `referido` y `referidoPorId` igual al `id` de otro contacto de la misma idea
- **THEN** la respuesta es `201` con el `Contacto` cuyo `referidoPorId` traza la cadena de referidos

#### Scenario: Canal inválido
- **WHEN** la creación llega con un `canal` fuera del catálogo `CanalContacto`
- **THEN** la respuesta es `VALIDACION_FALLIDA`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado crea un contacto sobre una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Listar los contactos de una idea
El sistema SHALL devolver los contactos de una idea propia en el sobre paginado, con `pagina` y `porPagina`, y SHALL admitir un filtro opcional por `estado` del embudo. Solo SHALL devolver contactos de la idea del usuario autenticado. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado paginado de contactos propios
- **WHEN** un usuario autenticado lista los contactos de una idea suya
- **THEN** la respuesta es `200` con una página de `Contacto` y su bloque `paginacion`

#### Scenario: Filtro por estado del embudo
- **WHEN** un usuario autenticado lista los contactos filtrando por `estado` `agendado`
- **THEN** la respuesta incluye solo los contactos en estado `agendado`

#### Scenario: Aislamiento del listado
- **WHEN** un usuario autenticado lista los contactos de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO` sin revelar datos

### Requirement: Consultar un contacto
El sistema SHALL devolver un contacto propio por su `id` con su `perfil`, `canal`, `origen`, `estado` y fechas de toque. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; un `idContacto` inexistente en la idea `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta exitosa
- **WHEN** un usuario autenticado consulta un contacto suyo
- **THEN** la respuesta es `200` con el `Contacto` solicitado

#### Scenario: Contacto inexistente
- **WHEN** un usuario autenticado consulta un `idContacto` que no existe en esa idea
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Editar el contenido de un contacto
El sistema SHALL permitir editar el contenido de un contacto propio (`nombre`, `perfil`, `enlace`, `canal`, `origen`, `referidoPorId`, `notas`). El cuerpo NUNCA SHALL permitir cambiar el `ideaId` ni el `estado` del embudo (que se cambia con la transición) ni las fechas de toque. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `VALIDACION_FALLIDA`.

#### Scenario: Edición exitosa
- **WHEN** un usuario autenticado edita el `perfil` y las `notas` de un contacto suyo
- **THEN** la respuesta es `200` con el `Contacto` actualizado

#### Scenario: La edición no cambia el estado del embudo
- **WHEN** se inspecciona el cuerpo aceptado por la edición
- **THEN** no existe ningún campo para cambiar el `estado` del embudo

### Requirement: Eliminar un contacto
El sistema SHALL permitir eliminar un contacto propio registrado por error. La respuesta exitosa SHALL ser `204` sin contenido. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado elimina un contacto suyo
- **THEN** la respuesta es `204` sin contenido

#### Scenario: Contacto sobre idea ajena
- **WHEN** un usuario autenticado elimina un contacto de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`
