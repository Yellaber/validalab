# tablero-de-kpis Specification

## Purpose
TBD - created by archiving change tablero-de-kpis. Update Purpose after archive.
## Requirements
### Requirement: Calcular el tablero de KPIs de una idea
El sistema SHALL calcular, bajo demanda para una idea propia, el conjunto completo de los 14 KPIs de la sección 7 del SRS a partir de las entrevistas puntuadas y los contactos de la idea, y SHALL exponerlo en `GET /ideas/{id}/kpis` como un `TableroIdea` con `ideaId`, `fechaCalculo`, un `resumen` con el conteo de KPIs por zona, y la lista de `KpiCalculado`. Cada `KpiCalculado` SHALL incluir `kpi`, `grupo`, `unidad`, `valor`, `numerador`/`denominador` (transparencia), los umbrales vigentes de la idea (`umbralGo`, `umbralKill`) y su `zona`. Los KPIs SHALL ser reconstruibles desde las entrevistas (RNF-15), sin materializarse. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una idea inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Tablero completo de una idea propia
- **WHEN** un usuario autenticado consulta el tablero de una idea suya
- **THEN** la respuesta es `200` con un `TableroIdea` que contiene los 14 KPIs, cada uno con su `valor`, sus umbrales vigentes y su `zona`, más el `resumen` por zona

#### Scenario: Los umbrales vigentes son los de la idea
- **WHEN** la idea tiene un override de umbral para un KPI
- **THEN** el `KpiCalculado` de ese KPI trae el umbral override de la idea, no el del catálogo por defecto

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado consulta el tablero de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Derivar la zona de semáforo de cada KPI
El sistema SHALL asignar a cada KPI una `zona` a partir de su `valor` y sus umbrales vigentes: `sin_datos` cuando el `valor` es `null` (evidencia insuficiente / denominador cero); `kill` cuando hay `umbralKill` y el `valor` es menor que él; `go` cuando el `valor` es mayor o igual al `umbralGo`; y `observacion` en el rango intermedio. Un KPI sin zona kill (`umbralKill` nulo) SHALL alternar solo entre `go` y `observacion`.

#### Scenario: KPI en zona kill
- **WHEN** el valor de un KPI con `umbralKill` definido es menor que su `umbralKill`
- **THEN** su `zona` es `kill`

#### Scenario: KPI en zona go
- **WHEN** el valor de un KPI es mayor o igual a su `umbralGo`
- **THEN** su `zona` es `go`

#### Scenario: KPI sin evidencia
- **WHEN** el denominador de un KPI es cero (p. ej. sin contactos contactados)
- **THEN** su `valor` es `null` y su `zona` es `sin_datos`

### Requirement: Promedio de score con el ajuste del usuario
El sistema SHALL calcular `score_promedio_entrevista` usando, por cada entrevista puntuada, el `scoreAjustado` del usuario cuando exista y, si no, el `score` del agente, conservando ambos valores (invariante de E4). El promedio SHALL considerar solo entrevistas puntuadas.

#### Scenario: El ajuste del usuario prevalece en el promedio
- **WHEN** una entrevista tiene `score` del agente y un `ajuste` del usuario
- **THEN** el `score_promedio_entrevista` usa el `scoreAjustado` de esa entrevista, no el `score` del agente

### Requirement: KPIs de señal a partir de las señales estructuradas del agente
El sistema SHALL calcular los KPIs de señal de problema y pago (`tasa_confirmacion_dolor`, `dolor_sin_solucion`, `intensidad_dolor`, `senal_disposicion_pago`) agregando las señales estructuradas del bloque `score` de cada entrevista puntuada. Una entrevista puntuada sin señales estructuradas (rúbrica anterior) SHALL contar como señal ausente (`false`), sin romper el cálculo.

#### Scenario: Agrega las señales de las entrevistas puntuadas
- **WHEN** la idea tiene entrevistas puntuadas con señales estructuradas
- **THEN** `tasa_confirmacion_dolor` es la proporción de entrevistas con `dolorConfirmado` sobre el total de entrevistas puntuadas

#### Scenario: Entrevista sin señales estructuradas
- **WHEN** una entrevista fue puntuada con la rúbrica anterior (sin señales estructuradas)
- **THEN** cuenta como señal ausente en los KPIs de señal, sin provocar error

