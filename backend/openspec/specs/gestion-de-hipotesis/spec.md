# gestion-de-hipotesis Specification

## Purpose
TBD - created by archiving change ideas-hipotesis. Update Purpose after archive.
## Requirements
### Requirement: Registrar una hipótesis tipificada de una idea
El sistema SHALL permitir a un usuario autenticado crear una hipótesis sobre una idea propia con `tipo` (`problema` | `mercado` | `pago`) y `enunciado`. La hipótesis SHALL quedar vinculada a la idea del path (`ideaId` derivado del path, nunca aceptado en el cuerpo) y SHALL crearse en estado `pendiente`. El cuerpo NUNCA SHALL admitir `ideaId` ni `estado`. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `VALIDACION_FALLIDA`.

#### Scenario: Creación válida
- **WHEN** un usuario autenticado crea una hipótesis sobre una idea suya con `tipo` `pago` y un `enunciado` no vacío
- **THEN** la respuesta es `201` con la `Hipotesis` en estado `pendiente`
- **AND** su `ideaId` es el de la idea del path, no un valor del cuerpo

#### Scenario: Tipo inválido
- **WHEN** la creación llega con un `tipo` fuera de `problema`/`mercado`/`pago`
- **THEN** la respuesta es `VALIDACION_FALLIDA`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado crea una hipótesis sobre una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Sin token
- **WHEN** se crea una hipótesis sin `Authorization: Bearer`
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Listar las hipótesis de una idea
El sistema SHALL devolver las hipótesis de una idea propia como un arreglo (sin paginar). Cada elemento SHALL incluir su `tipo` y su `estado`. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado de hipótesis propias
- **WHEN** un usuario autenticado lista las hipótesis de una idea suya
- **THEN** la respuesta es `200` con un arreglo de `Hipotesis`, cada una con su `tipo` y `estado`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado lista las hipótesis de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO` sin revelar datos

### Requirement: Editar una hipótesis y marcar su estado de aprendizaje
El sistema SHALL permitir editar el `tipo` y/o el `enunciado` de una hipótesis propia y marcar su `estado` como `confirmada`, `refutada` o `pendiente`. El cuerpo NUNCA SHALL permitir cambiar el `ideaId`. Una idea u hipótesis ajena SHALL responder `403`/`404` según corresponda; una `idHipotesis` que no existe en esa idea `404 RECURSO_NO_ENCONTRADO`; un payload inválido `VALIDACION_FALLIDA`.

#### Scenario: Marcar una hipótesis como confirmada
- **WHEN** un usuario autenticado marca el `estado` de una hipótesis suya como `confirmada`
- **THEN** la respuesta es `200` con la `Hipotesis` en estado `confirmada`

#### Scenario: Editar el enunciado
- **WHEN** un usuario autenticado edita el `enunciado` de una hipótesis suya
- **THEN** la respuesta es `200` con la `Hipotesis` actualizada

#### Scenario: Hipótesis inexistente en la idea
- **WHEN** un usuario autenticado edita una `idHipotesis` que no existe en esa idea
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Eliminar una hipótesis
El sistema SHALL permitir eliminar una hipótesis propia registrada por error. La respuesta exitosa SHALL ser `204` sin contenido. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una `idHipotesis` inexistente en la idea `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado elimina una hipótesis suya
- **THEN** la respuesta es `204` sin contenido

#### Scenario: Eliminar sobre una idea ajena
- **WHEN** un usuario autenticado elimina una hipótesis de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

