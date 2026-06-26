# ideas

## Purpose

Portafolio de ideas de ValidaLab (épicas E1 y E2): alta, consulta, edición y listado de las ideas propias con su estado de validación, archivado de ideas descartadas conservando su evidencia, y reapertura (desarchivado) para retomarlas (E1); además, por cada idea, la gestión de hipótesis tipificadas (problema/mercado/pago, con estado de aprendizaje confirmada/refutada/pendiente) y de umbrales kill/go por KPI editables (E2). La `Idea` es entidad raíz del dominio (junto a `Usuario`) y todo queda aislado por usuario (`owner_id` derivado del token). Esta capacidad se expresa como el detalle del `tag` `ideas` en el contrato de API único (`contrato-api/openapi.yaml`); las transiciones a `go`/`pivote`/`kill` provienen del veredicto aprobado (E6) y no se editan en E1, y los umbrales son el criterio que el agente pondera, no la decisión (su cálculo es E5). Su cumplimiento en runtime (módulo NestJS, persistencia, guardas) se aborda en cambios posteriores.

## Requirements

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

### Requirement: Registrar hipótesis tipificadas de una idea
El contrato SHALL definir `POST /ideas/{id}/hipotesis` (autenticado) que crea una hipótesis asociada a una idea propia, con `tipo` (`problema` | `mercado` | `pago`) y `enunciado` (afirmación falsable). La hipótesis creada MUST iniciar en estado `pendiente` y MUST quedar vinculada a la idea por el path (`ideaId` derivado de la idea, nunca recibido en el cuerpo). La respuesta exitosa MUST devolver el recurso `Hipotesis`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` de idea inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

#### Scenario: Creación exitosa
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/hipotesis` sobre una idea suya con `tipo` `pago` y un `enunciado` válido
- **THEN** el contrato responde `201` con la `Hipotesis` creada en estado `pendiente`
- **AND** su `ideaId` es el de la idea del path, no un valor del cuerpo

#### Scenario: Tipo inválido
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/hipotesis` con un `tipo` fuera de `problema`/`mercado`/`pago`
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/hipotesis` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Sin token
- **WHEN** se hace `POST /ideas/{id}/hipotesis` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Listar las hipótesis de una idea
El contrato SHALL definir `GET /ideas/{id}/hipotesis` (autenticado) que devuelve las hipótesis de una idea propia como un arreglo `HipotesisLista` (sin paginar, por ser una colección pequeña). Cada elemento MUST incluir su `tipo` y su `estado`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado de hipótesis propias
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/hipotesis` sobre una idea suya
- **THEN** el contrato responde `200` con un arreglo de `Hipotesis`, cada una con su `tipo` y `estado`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/hipotesis` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO` sin revelar datos

### Requirement: Editar una hipótesis y marcar su estado de aprendizaje
El contrato SHALL definir `PATCH /ideas/{id}/hipotesis/{idHipotesis}` (autenticado) que permite editar el `tipo` y/o `enunciado` de una hipótesis propia y marcar su `estado` como `confirmada`, `refutada` o `pendiente` (HU-06). El cuerpo MUST NOT permitir cambiar el `ideaId`. Una hipótesis o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idHipotesis` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

#### Scenario: Marcar una hipótesis como confirmada
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}/hipotesis/{idHipotesis}` con `estado` `confirmada`
- **THEN** el contrato responde `200` con la `Hipotesis` en estado `confirmada`

#### Scenario: Editar el enunciado
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}/hipotesis/{idHipotesis}` con un `enunciado` nuevo
- **THEN** el contrato responde `200` con la `Hipotesis` actualizada

#### Scenario: Hipótesis inexistente
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}/hipotesis/{idHipotesis}` con un `idHipotesis` que no existe en esa idea
- **THEN** el contrato responde `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Eliminar una hipótesis
El contrato SHALL definir `DELETE /ideas/{id}/hipotesis/{idHipotesis}` (autenticado) que elimina una hipótesis propia registrada por error. La respuesta exitosa MUST ser `204` sin contenido. Una hipótesis o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idHipotesis` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/hipotesis/{idHipotesis}` sobre una hipótesis suya
- **THEN** el contrato responde `204` sin contenido

#### Scenario: Hipótesis ajena
- **WHEN** un usuario autenticado hace `DELETE /ideas/{id}/hipotesis/{idHipotesis}` sobre una hipótesis de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Consultar los umbrales kill/go de una idea
El contrato SHALL definir `GET /ideas/{id}/umbrales` (autenticado) que devuelve el conjunto `UmbralesIdea`: un `Umbral` por cada KPI del catálogo (SRS §7), con su `grupo`, su `unidad`, su `umbralGo` y su `umbralKill` vigentes (los editados por la idea, o los valores por defecto del SRS si no se han editado). `umbralKill` MUST poder ser `null` para los KPIs sin zona kill (p. ej. `volumen_evidencia`, `densidad_citas`). Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta del conjunto de umbrales
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/umbrales` sobre una idea suya
- **THEN** el contrato responde `200` con un arreglo de `Umbral`, uno por cada KPI del catálogo, con su `umbralGo` y `umbralKill` vigentes

#### Scenario: KPI sin zona kill
- **WHEN** la respuesta incluye un KPI sin umbral kill definido (p. ej. `volumen_evidencia`)
- **THEN** ese `Umbral` tiene `umbralKill` igual a `null`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/umbrales` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Editar el umbral kill/go de un KPI por idea
El contrato SHALL definir `PUT /ideas/{id}/umbrales/{kpi}` (autenticado, idempotente) que fija el `umbralGo` y, cuando aplica, el `umbralKill` de un KPI concreto para una idea propia (RF-04, HU-05). El `{kpi}` MUST ser una clave del catálogo `Kpi`; un valor fuera del catálogo MUST devolver `404 RECURSO_NO_ENCONTRADO`. La respuesta exitosa MUST devolver el `Umbral` actualizado. Un `umbralGo` ausente, o un `umbralKill` mayor que `umbralGo`, MUST devolver `422 VALIDACION_FALLIDA`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`.

#### Scenario: Fijar ambos umbrales de un KPI
- **WHEN** un usuario autenticado hace `PUT /ideas/{id}/umbrales/senal_disposicion_pago` con `umbralGo` `0.35` y `umbralKill` `0.15`
- **THEN** el contrato responde `200` con el `Umbral` que refleja ambos valores asociados a esa idea

#### Scenario: KPI fuera del catálogo
- **WHEN** un usuario autenticado hace `PUT /ideas/{id}/umbrales/{kpi}` con un `kpi` que no existe en el catálogo
- **THEN** el contrato responde `404` con `codigo` `RECURSO_NO_ENCONTRADO`

#### Scenario: Umbrales incoherentes
- **WHEN** un usuario autenticado hace `PUT /ideas/{id}/umbrales/{kpi}` con `umbralKill` mayor que `umbralGo`
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `PUT /ideas/{id}/umbrales/{kpi}` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`
