# kpis Specification

## Purpose
TBD - created by archiving change contrato-api-kpis. Update Purpose after archive.
## Requirements
### Requirement: Consultar el tablero de KPIs calculados de una idea
El contrato SHALL definir `GET /ideas/{id}/kpis` (autenticado) que devuelve el tablero (`TableroIdea`) de una idea propia: el conjunto completo de KPIs de la sección 7 del SRS **calculados a partir de las entrevistas de la idea** (RF-11, HU-15). Cada `KpiCalculado` MUST incluir su `kpi`, `grupo`, `unidad`, su `valor` (nullable cuando no hay evidencia suficiente), sus umbrales vigentes (`umbralGo`, `umbralKill` nullable) y su `zona` de semáforo. El cálculo del `score_promedio_entrevista` MUST usar el ajuste del usuario cuando exista (E4). Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`; sin token `401 NO_AUTENTICADO`.

#### Scenario: Consulta del tablero
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/kpis` sobre una idea suya
- **THEN** el contrato responde `200` con el `TableroIdea`, con un `KpiCalculado` por cada KPI del catálogo, su `valor` y su `zona`

#### Scenario: KPI sin evidencia
- **WHEN** la idea aún no tiene entrevistas que alimenten un KPI (denominador cero)
- **THEN** ese `KpiCalculado` tiene `valor` `null` y `zona` `sin_datos`

#### Scenario: El score promedio usa el ajuste del usuario
- **WHEN** una entrevista de la idea tiene un ajuste de score del usuario
- **THEN** el `score_promedio_entrevista` del tablero refleja el valor ajustado, no el del agente

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/kpis` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Sin token
- **WHEN** se hace `GET /ideas/{id}/kpis` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Semáforo de cada KPI contra su umbral
El contrato SHALL exponer, por cada `KpiCalculado`, una `zona` de semáforo que contrasta el `valor` con los umbrales de la idea (RF-12, HU-16): `go` cuando el valor está en zona de avance (`≥ umbralGo`), `kill` cuando está en zona de descarte (`< umbralKill`), `observacion` en la zona intermedia, y `sin_datos` cuando no hay valor. Para los KPIs sin zona kill (p. ej. `volumen_evidencia`, `densidad_citas`), la `zona` MUST poder ser `go`, `observacion` o `sin_datos`, nunca `kill`.

#### Scenario: KPI en zona go
- **WHEN** un KPI tiene `valor` mayor o igual a su `umbralGo`
- **THEN** su `zona` es `go`

#### Scenario: KPI en zona kill
- **WHEN** un KPI con umbral kill tiene `valor` menor que su `umbralKill`
- **THEN** su `zona` es `kill`

#### Scenario: KPI en zona intermedia
- **WHEN** un KPI tiene `valor` entre su `umbralKill` y su `umbralGo`
- **THEN** su `zona` es `observacion`

#### Scenario: KPI sin zona kill
- **WHEN** un KPI sin umbral kill (p. ej. `volumen_evidencia`) tiene `valor` por debajo de su `umbralGo`
- **THEN** su `zona` es `observacion`, nunca `kill`

### Requirement: Listar las alertas de cruce de umbral de una idea
El contrato SHALL definir `GET /ideas/{id}/alertas` (autenticado, paginado) que devuelve las alertas (`AlertaKpi`) de una idea propia generadas **por el sistema** cuando un KPI cruza su umbral kill o go (RF-13, HU-17), con filtro opcional por `leida`. Cada `AlertaKpi` MUST indicar el `kpi`, el `tipo` de cruce (`go` | `kill`), el `valor` que lo disparó, el `umbral` cruzado, la `fecha` y si está `leida`. Las alertas NO se crean desde el cliente. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado de alertas
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/alertas` sobre una idea suya
- **THEN** el contrato responde `200` con una página de `AlertaKpi` y su bloque `paginacion`

#### Scenario: Filtrar alertas no leídas
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/alertas?leida=false`
- **THEN** el contrato responde `200` con solo las alertas sin leer

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/alertas` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Marcar una alerta como leída
El contrato SHALL definir `PATCH /ideas/{id}/alertas/{idAlerta}` (autenticado) que permite marcar una alerta propia como `leida`. El cuerpo (`ActualizarAlertaRequest`) MUST limitarse al campo `leida`. La respuesta exitosa MUST devolver la `AlertaKpi` actualizada. Una idea o alerta ajena MUST devolver `403 ACCESO_DENEGADO`; un `idAlerta` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `422 VALIDACION_FALLIDA`.

#### Scenario: Marcar como leída
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}/alertas/{idAlerta}` con `leida` `true`
- **THEN** el contrato responde `200` con la `AlertaKpi` marcada como leída

#### Scenario: Alerta inexistente
- **WHEN** un usuario autenticado hace `PATCH /ideas/{id}/alertas/{idAlerta}` con un `idAlerta` que no existe en esa idea
- **THEN** el contrato responde `404` con `codigo` `RECURSO_NO_ENCONTRADO`

