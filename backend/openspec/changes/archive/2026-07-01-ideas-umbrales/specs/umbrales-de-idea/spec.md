## ADDED Requirements

### Requirement: Consultar los umbrales kill/go de una idea
El sistema SHALL devolver, para una idea propia, el conjunto completo de umbrales: un `Umbral` por cada KPI del catálogo (SRS §7), con su `grupo`, su `unidad`, su `umbralGo` y su `umbralKill` vigentes (el override editado por la idea, o el valor por defecto del catálogo si no se ha editado). `umbralKill` SHALL poder ser `null` en los KPIs sin zona kill (p. ej. `volumen_evidencia`, `densidad_citas`). Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta del conjunto de umbrales
- **WHEN** un usuario autenticado consulta los umbrales de una idea suya
- **THEN** la respuesta es `200` con un arreglo de `Umbral`, uno por cada KPI del catálogo, con su `umbralGo` y `umbralKill` vigentes

#### Scenario: KPI sin zona kill
- **WHEN** la respuesta incluye un KPI sin umbral kill definido (p. ej. `volumen_evidencia`)
- **THEN** ese `Umbral` tiene `umbralKill` igual a `null`

#### Scenario: Valores por defecto sin ediciones
- **WHEN** un usuario autenticado consulta los umbrales de una idea que no ha editado ninguno
- **THEN** cada `Umbral` refleja el `umbralGo`/`umbralKill` por defecto del catálogo para ese KPI

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado consulta los umbrales de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Fijar el umbral kill/go de un KPI por idea
El sistema SHALL permitir fijar, de forma idempotente, el `umbralGo` y —cuando aplica— el `umbralKill` de un KPI concreto para una idea propia. El `{kpi}` SHALL ser una clave del catálogo; un valor fuera del catálogo SHALL responder `404 RECURSO_NO_ENCONTRADO`. `umbralGo` SHALL ser requerido; un `umbralKill` mayor que `umbralGo` SHALL responder `VALIDACION_FALLIDA`. La respuesta exitosa SHALL devolver el `Umbral` actualizado. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`.

#### Scenario: Fijar ambos umbrales de un KPI
- **WHEN** un usuario autenticado fija `umbralGo` `0.35` y `umbralKill` `0.15` para un KPI de una idea suya
- **THEN** la respuesta es `200` con el `Umbral` que refleja ambos valores para esa idea
- **AND** una consulta posterior de los umbrales de la idea refleja esos valores para ese KPI

#### Scenario: Idempotencia
- **WHEN** un usuario autenticado fija el mismo umbral de un KPI dos veces seguidas
- **THEN** ambas respuestas son `200` y el estado resultante es el mismo (no se acumulan overrides)

#### Scenario: KPI fuera del catálogo
- **WHEN** un usuario autenticado fija un umbral con un `kpi` que no existe en el catálogo
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`

#### Scenario: Umbrales incoherentes
- **WHEN** un usuario autenticado fija un `umbralKill` mayor que `umbralGo`
- **THEN** la respuesta es `VALIDACION_FALLIDA`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado fija un umbral sobre una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`
