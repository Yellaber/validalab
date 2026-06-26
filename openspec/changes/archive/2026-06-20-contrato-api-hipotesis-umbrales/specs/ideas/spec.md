## ADDED Requirements

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
