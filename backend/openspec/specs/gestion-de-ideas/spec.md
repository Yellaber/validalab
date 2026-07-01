# gestion-de-ideas Specification

## Purpose
TBD - created by archiving change ideas-portafolio. Update Purpose after archive.
## Requirements
### Requirement: Crear una idea
El sistema SHALL permitir a un usuario autenticado crear una idea con `titulo`, `problema` y, opcionalmente, `descripcion` y `segmentoBeachhead`. La idea SHALL asociarse al usuario autenticado (`ownerId` derivado del token, nunca aceptado en el cuerpo) y SHALL crearse en estado `borrador`. El cuerpo de creación NUNCA SHALL admitir `estado` ni `ownerId`.

#### Scenario: Creación válida
- **WHEN** un usuario autenticado envía `titulo` y `problema` no vacíos (con `descripcion`/`segmentoBeachhead` opcionales)
- **THEN** la respuesta es `201` con la `Idea` creada en estado `borrador`
- **AND** el `ownerId` de la idea es el del usuario autenticado, no un valor del cuerpo

#### Scenario: Datos inválidos
- **WHEN** la creación llega sin `titulo` o sin `problema`
- **THEN** la respuesta es `VALIDACION_FALLIDA` con el detalle del campo inválido

#### Scenario: Sin token
- **WHEN** se intenta crear una idea sin `Authorization: Bearer`
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Listar las ideas propias
El sistema SHALL devolver, paginadas, únicamente las ideas del usuario autenticado, con su `estado`. SHALL aceptar los parámetros `pagina`/`porPagina` y responder con el sobre `RespuestaPaginada`. SHALL aceptar un filtro opcional por `estado`. El listado NUNCA SHALL incluir ideas de otro usuario.

#### Scenario: Listado paginado
- **WHEN** un usuario autenticado lista sus ideas con `pagina`/`porPagina`
- **THEN** la respuesta es `200` con `RespuestaPaginada` cuyos `datos` son ideas propias y un bloque `paginacion`

#### Scenario: Filtro por estado
- **WHEN** un usuario autenticado lista sus ideas filtrando por `estado`
- **THEN** la respuesta incluye solo sus ideas en ese `estado`

#### Scenario: Aislamiento del listado
- **WHEN** un usuario autenticado lista sus ideas
- **THEN** el resultado no incluye ninguna idea cuyo `ownerId` sea de otro usuario

### Requirement: Consultar una idea propia
El sistema SHALL devolver una idea por su `id` solo si pertenece al usuario autenticado. Una idea de otro propietario SHALL responder `403 ACCESO_DENEGADO` sin revelar datos; un `id` inexistente SHALL responder `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta de idea propia
- **WHEN** un usuario autenticado consulta una idea suya por `id`
- **THEN** la respuesta es `200` con la `Idea`

#### Scenario: Idea de otro usuario
- **WHEN** un usuario autenticado consulta una idea cuyo `ownerId` es otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO` sin revelar datos de esa idea

#### Scenario: Idea inexistente
- **WHEN** un usuario autenticado consulta un `id` que no existe
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Editar el contenido de una idea propia
El sistema SHALL permitir editar el contenido de una idea propia (`titulo`, `descripcion`, `problema`, `segmentoBeachhead`). El cuerpo de edición NUNCA SHALL permitir fijar el `estado` (en particular `go`, `pivote` o `kill`) ni cambiar el `ownerId`: esas transiciones provienen del veredicto aprobado (E6). Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `VALIDACION_FALLIDA`.

#### Scenario: Edición de contenido
- **WHEN** un usuario autenticado edita el `problema` de una idea suya
- **THEN** la respuesta es `200` con la `Idea` actualizada

#### Scenario: La edición no puede fijar el veredicto
- **WHEN** se inspecciona el cuerpo aceptado por la edición
- **THEN** no existe ningún campo para fijar el `estado` a `go`, `pivote` o `kill`

#### Scenario: Edición de idea ajena
- **WHEN** un usuario autenticado edita una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

