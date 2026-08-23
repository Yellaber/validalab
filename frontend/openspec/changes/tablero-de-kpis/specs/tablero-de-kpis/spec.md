## ADDED Requirements

### Requirement: Tablero de KPIs agrupado por los grupos del SRS
El cliente SHALL presentar el tablero de una idea propia consumiendo `GET /ideas/{id}/kpis`, mostrando cada `KpiCalculado` con su nombre legible, su valor, sus umbrales vigentes y su zona de semáforo. Los KPIs SHALL agruparse por su `grupo` en el orden estable del catálogo, mostrando el nombre y el contexto de cada grupo. Un grupo o KPI que no esté en el catálogo local SHALL mostrarse igualmente, degradando a su clave.

#### Scenario: Tablero con KPIs de varios grupos
- **WHEN** el usuario abre el tablero de una idea y la respuesta trae KPIs de distintos grupos
- **THEN** los ve agrupados por grupo, en el orden del catálogo, cada uno con su nombre legible, su valor y sus umbrales

#### Scenario: KPI fuera del catálogo local
- **WHEN** la respuesta trae un KPI cuya clave no está en el catálogo local
- **THEN** el cliente lo muestra degradando a su clave, sin romper la vista

#### Scenario: Error al cargar el tablero
- **WHEN** la carga del tablero falla
- **THEN** el cliente muestra un aviso derivado del `codigo` del error y ofrece reintentar

#### Scenario: Idea ajena
- **WHEN** el servidor responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra el aviso en lugar del contenido y no revela ningún dato de la idea

### Requirement: La zona de semáforo la determina el servidor
El cliente SHALL usar la `zona` que trae cada `KpiCalculado` para representar su estado en el semáforo. El cliente NO SHALL derivar la zona comparando el `valor` con los umbrales por su cuenta, para no crear una segunda fuente de verdad que pueda discrepar del cálculo del servidor.

#### Scenario: La zona recibida manda
- **WHEN** un KPI llega con una `zona` concreta
- **THEN** el cliente lo representa según esa zona, sin recalcularla a partir del valor y los umbrales

### Requirement: Distinción entre falta de evidencia y valor cero
Un KPI con `valor` nulo y `zona` `sin_datos` SHALL presentarse como **falta de evidencia suficiente**, con un tratamiento visual neutro fuera de la escala del semáforo. El cliente NO SHALL representarlo como `0` ni como un resultado negativo.

#### Scenario: KPI sin evidencia
- **WHEN** un KPI llega con `valor` nulo y `zona` `sin_datos`
- **THEN** el cliente indica que aún no hay evidencia suficiente y no muestra un cero

#### Scenario: KPI que vale cero
- **WHEN** un KPI llega con `valor` `0` y una zona del semáforo
- **THEN** el cliente muestra `0` como valor real, distinguible de la falta de evidencia

### Requirement: Transparencia del cálculo con numerador y denominador
Cuando un `KpiCalculado` traiga `numerador` y `denominador`, el cliente SHALL mostrarlos junto al valor, de modo que el número pueda contrastarse con la evidencia que lo origina. Cuando no vengan, el cliente SHALL omitirlos.

#### Scenario: KPI con fracción
- **WHEN** un KPI trae numerador y denominador
- **THEN** el cliente los muestra junto al valor calculado

#### Scenario: KPI de conteo sin fracción
- **WHEN** un KPI no trae numerador ni denominador
- **THEN** el cliente muestra solo el valor, sin dejar hueco

### Requirement: Semáforo de KPIs con y sin zona kill
El cliente SHALL mostrar los umbrales vigentes junto al valor de cada KPI. Cuando `umbralKill` sea nulo, el cliente SHALL indicar que ese KPI **no tiene zona kill** y NO SHALL inventar un umbral ni representar una zona de descarte.

#### Scenario: KPI con tres zonas
- **WHEN** un KPI trae `umbralGo` y `umbralKill`
- **THEN** el cliente muestra ambos umbrales junto al valor

#### Scenario: KPI sin zona kill
- **WHEN** un KPI trae `umbralKill` nulo
- **THEN** el cliente muestra solo el umbral GO e indica que ese KPI no tiene zona kill

### Requirement: Lectura de KPIs coherente con la pantalla de umbrales
El cliente SHALL formatear el valor y los umbrales de cada KPI con **la unidad y la precisión** que ya usa la gestión de umbrales, reutilizando sus utilidades. El cliente NO SHALL duplicar la lógica de formateo.

#### Scenario: Mismo KPI, misma lectura
- **WHEN** un KPI se muestra en el tablero
- **THEN** su valor y sus umbrales se presentan con la misma unidad y precisión con que se presentan en la pantalla de umbrales de esa idea

### Requirement: Resumen global del tablero
El cliente SHALL mostrar el `resumen` que devuelve el servidor —KPIs en zona go, en observación, en zona kill y sin datos, más el total— como lectura de conjunto. El cliente NO SHALL recalcular esos conteos a partir de la lista de KPIs.

#### Scenario: Resumen visible
- **WHEN** el tablero se carga
- **THEN** el cliente muestra el conteo de KPIs por zona tal como lo devolvió el servidor

### Requirement: Listado paginado de alertas de cruce de umbral
El cliente SHALL presentar las alertas de una idea consumiendo `GET /ideas/{id}/alertas` con `pagina` y `porPagina`, mostrando de cada alerta el KPI afectado, el **sentido del cruce** (`go` u `kill`), el valor que lo disparó y el umbral cruzado. El cliente NO SHALL ofrecer crear ni eliminar alertas: las genera el sistema.

#### Scenario: Listado con alertas
- **WHEN** el usuario abre las alertas de una idea y la respuesta trae alertas
- **THEN** ve cada una con su KPI, el sentido del cruce, el valor y el umbral, formateados con la unidad del KPI

#### Scenario: Sin alertas
- **WHEN** la idea no tiene alertas
- **THEN** el cliente muestra un estado vacío, sin mensaje de error

#### Scenario: No se ofrece crear ni eliminar alertas
- **WHEN** el usuario ve el listado de alertas
- **THEN** no dispone de ninguna acción para crear o eliminar una alerta

### Requirement: Filtro por alertas leídas y marcado como leída
El cliente SHALL ofrecer el filtro por `leida` que expone el contrato, enviándolo como parámetro de la petición. El cliente SHALL permitir marcar una alerta como leída mediante `PATCH /ideas/{id}/alertas/{idAlerta}` con un cuerpo limitado a `leida`. Tras marcarla, el cliente SHALL refrescar el listado recargando el recurso.

#### Scenario: Filtrar por no leídas
- **WHEN** el usuario filtra por alertas no leídas
- **THEN** el cliente pide el listado con el parámetro `leida` correspondiente y vuelve a la primera página

#### Scenario: Marcar una alerta como leída
- **WHEN** el usuario marca una alerta como leída
- **THEN** el cliente envía `PATCH` con un cuerpo que contiene únicamente `leida`
- **AND** tras la respuesta recarga el listado

#### Scenario: El cuerpo del marcado no lleva nada más
- **WHEN** el cliente marca una alerta como leída
- **THEN** el cuerpo enviado no contiene `ideaId`, `kpi`, `valor` ni `umbral`
