## MODIFIED Requirements

### Requirement: Edición del valor de un umbral según la unidad de su KPI
El cliente SHALL ofrecer, en cada fila, controles para editar `umbralGo` y `umbralKill` cuyo formato e introducción correspondan a la `unidad` que trae el `Umbral`. Un KPI de unidad `porcentaje` MUST editarse en **puntos porcentuales** y transportarse como tasa `0–1`.

La presentación del valor vigente MUST ser **fiel al valor del contrato**: el cliente NEVER MUST redondearlo a la precisión de entrada de su unidad al mostrarlo. El redondeo MUST aplicarse **únicamente** al convertir a transporte un valor tecleado por el usuario. El cliente MAY sanear el ruido de coma flotante propio de IEEE-754 (más allá de cualquier precisión con significado para un umbral) sin que eso cuente como redondeo de presentación.

El texto del control MUST estar siempre en **notación decimal legible y reeditable**; el cliente NEVER MUST mostrar notación exponencial. Un KPI cuyo `umbralKill` es `null` (sin zona kill) NO SHALL ofrecer control de umbral kill, y su petición MUST omitir el campo.

#### Scenario: Umbral de porcentaje
- **WHEN** el KPI tiene `unidad: porcentaje` y el valor vigente es `0.25`
- **THEN** el control muestra `25` con indicación de porcentaje, y al guardar `30` el cliente envía `0.3`

#### Scenario: Valor vigente más preciso que la precisión de entrada
- **WHEN** el KPI tiene `unidad: porcentaje` y el valor vigente es `0.3333`
- **THEN** el control muestra `33.33` íntegro, no `33.3`

#### Scenario: Ruido de coma flotante saneado
- **WHEN** el valor vigente llega como `0.30000000000000004`
- **THEN** el control muestra `30`, sin arrastrar los dígitos de ruido

#### Scenario: Nunca notación exponencial
- **WHEN** el valor vigente es tan pequeño que su conversión produciría notación exponencial
- **THEN** el control lo muestra en notación decimal, no como `1e-7`

#### Scenario: KPI sin zona kill
- **WHEN** el `Umbral` de un KPI llega con `umbralKill: null`
- **THEN** la fila no ofrece control de umbral kill y el `PUT` de esa fila no incluye `umbralKill`

### Requirement: Validación local de umbrales alineada con el contrato
El cliente SHALL impedir el envío de una fila cuyo `umbralKill` sea mayor que su `umbralGo`, o cuyo valor **tecleado** no encaje con el rango y la precisión de entrada de su `unidad`, explicando el motivo en la fila.

La validación de encaje con la unidad MUST aplicarse **solo a los campos que el usuario ha editado**. Un valor vigente NEVER MUST dejar su fila bloqueada, por preciso o inesperado que sea: es autoridad del backend, no una entrada del usuario, y bloquear la fila por él impediría corregir el otro campo. Si ese valor fuera inválido, el backend lo rechazará con su `422` al guardar.

La comparación `umbralKill ≤ umbralGo` MUST evaluarse **siempre**, sobre el valor efectivo de cada campo: el tecleado si cambió, el vigente si no. Esta validación MUST espejar la regla que produce el `422` del contrato **sin sustituirla**: un `422 VALIDACION_FALLIDA` recibido del backend MUST mostrarse igualmente campo a campo a partir de `detalles`.

#### Scenario: Umbral kill mayor que el go
- **WHEN** el usuario escribe un `umbralKill` mayor que el `umbralGo` de la misma fila
- **THEN** la fila muestra el motivo, el control de guardado queda deshabilitado y no se emite la petición

#### Scenario: Un valor vigente muy preciso no bloquea su fila
- **WHEN** el valor vigente de un campo excede la precisión de entrada de su unidad y el usuario no lo edita
- **THEN** la fila no muestra error en ese campo y el usuario puede editar y guardar el otro

#### Scenario: Teclear más precisión de la admitida se rechaza
- **WHEN** el usuario teclea en un campo más decimales de los que admite la precisión de entrada de su unidad
- **THEN** la fila explica el límite y el control de guardado queda deshabilitado, en vez de truncar el valor en silencio

#### Scenario: Rechazo del backend
- **WHEN** `PUT /ideas/{id}/umbrales/{kpi}` responde `422 VALIDACION_FALLIDA` con `detalles`
- **THEN** el cliente muestra el error en los campos afectados de esa fila

#### Scenario: KPI fuera del catálogo
- **WHEN** `PUT /ideas/{id}/umbrales/{kpi}` responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente indica que ese KPI no existe, sin romper la vista
