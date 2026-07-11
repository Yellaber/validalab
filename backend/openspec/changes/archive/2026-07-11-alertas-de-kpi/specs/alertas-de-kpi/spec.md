## ADDED Requirements

### Requirement: Generar alertas de cruce de umbral al completar un scoring
Tras completar con éxito el scoring de una entrevista, el sistema SHALL reevaluar el tablero de KPIs de la idea y, comparando la zona de cada KPI contra su última zona conocida (persistida por idea y KPI), SHALL crear una `AlertaKpi` cuando un KPI cruce hacia zona `go` o `kill`. La alerta SHALL registrar el `kpi`, el `tipo` (`go`/`kill` según la zona alcanzada), el `valor` del KPI, el `umbral` cruzado (umbralGo o umbralKill según el tipo), la `fecha` y `leida` en `false`. El sistema NO SHALL crear una alerta si la zona del KPI no cambió respecto a la última conocida, ni cuando la zona pasa a `observacion` o `sin_datos`. En la primera evaluación de un KPI de la idea (sin zona previa) el sistema SHALL registrar la zona sin generar alerta. Un fallo al generar alertas NO SHALL afectar el resultado del scoring.

#### Scenario: Un KPI que cruza a zona kill genera una alerta
- **WHEN** tras un scoring el valor de un KPI entra en zona `kill` estando antes en otra zona
- **THEN** el sistema crea una `AlertaKpi` de `tipo` `kill` con el `valor` y el `umbral` cruzados, `leida` en `false`

#### Scenario: No se duplica la alerta si la zona no cambió
- **WHEN** tras un nuevo scoring un KPI sigue en la misma zona `kill` que en la evaluación anterior
- **THEN** el sistema no crea una nueva alerta para ese KPI

#### Scenario: La primera evaluación no alerta
- **WHEN** se evalúa por primera vez un KPI de la idea y cae en zona `go`
- **THEN** el sistema registra la zona conocida sin crear alerta (no hay zona previa desde la cual cruzar)

#### Scenario: Un fallo de alertas no rompe el scoring
- **WHEN** la evaluación de alertas falla tras un scoring exitoso
- **THEN** la entrevista permanece `puntuada` con su `score`, sin propagar el error

### Requirement: Listar las alertas de una idea
El sistema SHALL devolver, paginadas, las alertas de una idea propia (recientes primero), con filtro opcional por `leida`. Las alertas NO SHALL crearse desde el cliente. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado paginado de alertas
- **WHEN** un usuario autenticado lista las alertas de una idea suya
- **THEN** la respuesta es `200` con una página de `AlertaKpi` y su bloque `paginacion`

#### Scenario: Filtro por leídas
- **WHEN** un usuario autenticado lista las alertas filtrando por `leida` en `false`
- **THEN** la respuesta incluye solo las alertas no leídas

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado lista las alertas de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Marcar una alerta como leída
El sistema SHALL permitir marcar una alerta propia como `leida` mediante `PATCH /ideas/{id}/alertas/{idAlerta}`, con el cuerpo limitado al campo `leida`. Una alerta de otra idea u owner SHALL responder `403 ACCESO_DENEGADO`; una alerta inexistente `404 RECURSO_NO_ENCONTRADO`; un cuerpo inválido `VALIDACION_FALLIDA`.

#### Scenario: Marcar leída
- **WHEN** un usuario autenticado marca una alerta suya con `leida` en `true`
- **THEN** la respuesta es `200` con la `AlertaKpi` cuyo `leida` es `true`

#### Scenario: Alerta inexistente
- **WHEN** un usuario autenticado marca una alerta que no existe en la idea
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`
