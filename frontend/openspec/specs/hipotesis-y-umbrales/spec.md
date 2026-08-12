# hipotesis-y-umbrales Specification

## Purpose
Gestión en el cliente Angular de las hipótesis de una idea (listar, crear, editar su `tipo` y su `enunciado`, marcar su estado de aprendizaje y eliminarlas) y de sus umbrales kill/go por KPI (consultar el conjunto agrupado por `KpiGrupo` y fijar `umbralGo`/`umbralKill` de cada KPI), correspondiente a la épica E2 del SRS. Consume los endpoints de hipótesis y umbrales del tag `ideas` del contrato de API único; el cálculo de KPIs (E5) y el veredicto del agente (E6) quedan fuera. Se apoya en la plomería del E0 (`cliente-http-y-errores`, `sesion-cliente`, `shell-y-navegacion`) y en `portafolio-de-ideas` (E1).

## Requirements

### Requirement: Servicio de recurso de hipótesis contra el contrato
El cliente SHALL exponer un servicio inyectable de hipótesis que encapsule las llamadas HTTP de hipótesis del tag `ideas` del contrato (`POST /ideas/{id}/hipotesis`, `GET /ideas/{id}/hipotesis`, `PATCH /ideas/{id}/hipotesis/{idHipotesis}`, `DELETE /ideas/{id}/hipotesis/{idHipotesis}`). El servicio MUST derivar los tipos de petición/respuesta del contrato (`Hipotesis`, `CrearHipotesisRequest`, `ActualizarHipotesisRequest`, `HipotesisLista`) y MUST interpolar el `ideaId` en el **path**. El servicio NEVER MUST enviar `ideaId` ni `ownerId` en el cuerpo de la petición. El servicio MUST apoyarse en la plomería HTTP del E0 (interceptor de autorización y traducción del sobre `Error` a `ErrorApi`) sin reimplementarla.

#### Scenario: Las operaciones usan las rutas anidadas del contrato
- **WHEN** un componente invoca listar, crear, editar o eliminar una hipótesis de la idea `X`
- **THEN** el servicio emite la petición al path anidado bajo `/ideas/X/hipotesis` con el método correspondiente del contrato

#### Scenario: El identificador de idea nunca viaja en el cuerpo
- **WHEN** el servicio construye la petición de crear o editar una hipótesis
- **THEN** el cuerpo no incluye `ideaId` ni `ownerId`

### Requirement: Listado de las hipótesis de una idea
El cliente SHALL presentar las hipótesis de una idea propia consumiendo `GET /ideas/{id}/hipotesis`, mostrando de cada una su `tipo`, su `enunciado` y su `estado`. La respuesta MUST tratarse como un **arreglo sin paginar**: la vista NO SHALL ofrecer controles de paginación para esta colección. El estado que la vista lee MUST ser reactivo por signals (zoneless).

#### Scenario: Listado de hipótesis
- **WHEN** el usuario autenticado abre las hipótesis de una idea suya
- **THEN** el cliente hace `GET /ideas/{id}/hipotesis` y muestra cada hipótesis con su `tipo`, `enunciado` y `estado`

#### Scenario: La colección no se pagina
- **WHEN** la vista de hipótesis se renderiza con resultados
- **THEN** no se muestran controles de paginación ni se envían parámetros `pagina`/`porPagina`

### Requirement: Estados de carga, vacío y error de las hipótesis
El cliente SHALL comunicar visualmente el ciclo de vida de la carga de hipótesis: un indicador mientras la petición está en vuelo, un estado **vacío** distinguible cuando la idea aún no tiene hipótesis, y un estado de **error** cuando la petición falla, ramificando por el `codigo` estable del `ErrorApi` y nunca por el `mensaje`.

#### Scenario: Idea sin hipótesis
- **WHEN** `GET /ideas/{id}/hipotesis` responde un arreglo vacío
- **THEN** el cliente muestra un estado vacío que invita a registrar la primera hipótesis, no una lista en blanco ni un error

#### Scenario: Idea ajena
- **WHEN** `GET /ideas/{id}/hipotesis` responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra un mensaje de acceso denegado sin revelar contenido de la idea ni de sus hipótesis

#### Scenario: Fallo de red al listar hipótesis
- **WHEN** `GET /ideas/{id}/hipotesis` falla con `ERROR_RED`
- **THEN** el cliente muestra un estado de error con opción de reintentar, sin romper la vista

### Requirement: Alta de una hipótesis tipificada
El cliente SHALL ofrecer un formulario de alta con **Signal Forms** que exija un `tipo` del catálogo (`problema`, `mercado`, `pago`) y un `enunciado` no vacío, y que al enviar haga `POST /ideas/{id}/hipotesis`. La validación local MUST bloquear el envío mientras el formulario sea inválido. El formulario NO SHALL exponer control alguno para fijar el `estado`: la hipótesis nace `pendiente`. Un `422 VALIDACION_FALLIDA` MUST mostrarse **campo a campo** a partir de `detalles`. Tras un alta exitosa la lista MUST reflejar la nueva hipótesis en estado `pendiente`.

#### Scenario: Alta exitosa
- **WHEN** el usuario envía el formulario con un `tipo` válido y un `enunciado` no vacío
- **THEN** el cliente hace `POST /ideas/{id}/hipotesis` y, al recibir `201`, muestra la hipótesis en la lista en estado `pendiente`

#### Scenario: Validación local bloquea el envío
- **WHEN** el `enunciado` está vacío
- **THEN** el control de envío queda deshabilitado y no se emite la petición

#### Scenario: El estado inicial no es elegible
- **WHEN** el usuario está en el formulario de alta
- **THEN** no existe ningún control para fijar el `estado` de la hipótesis

#### Scenario: Error de validación del backend al crear
- **WHEN** `POST /ideas/{id}/hipotesis` responde `422 VALIDACION_FALLIDA` con `detalles` por campo
- **THEN** el cliente muestra el error asociado a cada campo afectado

### Requirement: Edición del tipo y el enunciado de una hipótesis
El cliente SHALL permitir editar el `tipo` y el `enunciado` de una hipótesis propia mediante `PATCH /ideas/{id}/hipotesis/{idHipotesis}`, reutilizando el formulario de Signal Forms inicializado con los valores actuales. El cuerpo enviado NO SHALL incluir `ideaId`. Un `422 VALIDACION_FALLIDA` MUST mostrarse campo a campo; un `403 ACCESO_DENEGADO` como acceso denegado; un `404 RECURSO_NO_ENCONTRADO` como hipótesis inexistente.

#### Scenario: Edición del enunciado
- **WHEN** el usuario guarda un `enunciado` corregido de una hipótesis suya
- **THEN** el cliente hace `PATCH /ideas/{id}/hipotesis/{idHipotesis}` y refleja la hipótesis actualizada en la lista

#### Scenario: La hipótesis ya no existe
- **WHEN** `PATCH /ideas/{id}/hipotesis/{idHipotesis}` responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente indica que la hipótesis ya no existe y refresca la lista, sin romper la vista

### Requirement: Marcado manual del estado de aprendizaje de una hipótesis
El cliente SHALL ofrecer, sobre cada hipótesis propia, la acción directa de marcarla como `confirmada`, `refutada` o de devolverla a `pendiente`, emitiendo un `PATCH /ideas/{id}/hipotesis/{idHipotesis}` que cambie únicamente el `estado`. La acción MUST presentarse como una **anotación del usuario**: la UI NEVER MUST sugerir que el sistema o el agente determinan el estado por sí solos. El nuevo `estado` MUST reflejarse en la lista al completarse.

#### Scenario: Marcar una hipótesis como confirmada
- **WHEN** el usuario marca como `confirmada` una hipótesis `pendiente`
- **THEN** el cliente hace `PATCH /ideas/{id}/hipotesis/{idHipotesis}` con solo el `estado` y muestra la hipótesis como `confirmada`

#### Scenario: Devolver una hipótesis a pendiente
- **WHEN** el usuario devuelve a `pendiente` una hipótesis `refutada`
- **THEN** el cliente emite el `PATCH` correspondiente y la lista muestra la hipótesis como `pendiente`

### Requirement: Eliminación confirmada de una hipótesis
El cliente SHALL permitir eliminar una hipótesis propia registrada por error mediante `DELETE /ideas/{id}/hipotesis/{idHipotesis}`. Por ser la única operación irreversible del alcance, la eliminación MUST exigir una **confirmación explícita en la propia interfaz** antes de emitir la petición; NEVER SHALL emitirse con un solo clic. Tras un `204` la hipótesis MUST desaparecer de la lista.

#### Scenario: Eliminación confirmada
- **WHEN** el usuario pide eliminar una hipótesis y confirma la acción
- **THEN** el cliente hace `DELETE /ideas/{id}/hipotesis/{idHipotesis}` y la hipótesis desaparece de la lista

#### Scenario: Eliminación cancelada
- **WHEN** el usuario pide eliminar una hipótesis y cancela en el paso de confirmación
- **THEN** no se emite ninguna petición y la hipótesis permanece en la lista

### Requirement: Servicio de recurso de umbrales contra el contrato
El cliente SHALL exponer un servicio inyectable de umbrales que encapsule `GET /ideas/{id}/umbrales` y `PUT /ideas/{id}/umbrales/{kpi}`, derivando los tipos del contrato (`Umbral`, `UmbralesIdea`, `ActualizarUmbralRequest`, y los catálogos `Kpi`, `KpiGrupo`, `UnidadKpi`). El `ideaId` y la clave del `kpi` MUST viajar en el **path**; el cuerpo del `PUT` MUST contener únicamente `umbralGo` y, cuando aplique, `umbralKill`. El servicio NEVER MUST enviar `ownerId`, `grupo` ni `unidad`, que son campos informativos de solo lectura.

#### Scenario: Consulta del conjunto de umbrales
- **WHEN** un componente pide los umbrales de la idea `X`
- **THEN** el servicio emite `GET /ideas/X/umbrales` y devuelve el arreglo de `Umbral`

#### Scenario: Fijación idempotente de un umbral
- **WHEN** un componente fija el umbral del KPI `tasa_respuesta` de la idea `X`
- **THEN** el servicio emite `PUT /ideas/X/umbrales/tasa_respuesta` con un cuerpo que contiene `umbralGo` y, si aplica, `umbralKill`, y ningún campo de solo lectura

### Requirement: Presentación de los umbrales agrupados por grupo de KPI
El cliente SHALL presentar el conjunto completo de umbrales de una idea consumiendo `GET /ideas/{id}/umbrales`, mostrando **una fila por cada KPI devuelto** y agrupándolas por el `grupo` que trae cada `Umbral` en la respuesta. El cliente MUST derivar el agrupamiento y la unidad de la **respuesta del contrato**, y NEVER MUST cablear localmente la correspondencia KPI→grupo o KPI→unidad. Un KPI cuya clave el cliente no sepa etiquetar MUST renderizarse igualmente, degradando a su clave cruda. El estado que la vista lee MUST ser reactivo por signals.

#### Scenario: Umbrales agrupados
- **WHEN** el usuario autenticado abre los umbrales de una idea suya
- **THEN** el cliente hace `GET /ideas/{id}/umbrales` y muestra las filas agrupadas bajo su `grupo` (`outreach`, `calidad_descubrimiento`, `senal_problema`, `senal_mercado_pago`)

#### Scenario: KPI desconocido para el cliente
- **WHEN** la respuesta incluye un `kpi` para el que el cliente no tiene etiqueta legible
- **THEN** la fila se renderiza igualmente mostrando la clave del KPI, sin romper la vista ni omitir la fila

#### Scenario: Fallo al cargar los umbrales
- **WHEN** `GET /ideas/{id}/umbrales` falla con `ERROR_RED`
- **THEN** el cliente muestra un estado de error con opción de reintentar, sin romper la vista

### Requirement: Edición del valor de un umbral según la unidad de su KPI
El cliente SHALL ofrecer, en cada fila, controles para editar `umbralGo` y `umbralKill` cuyo formato e introducción correspondan a la `unidad` que trae el `Umbral`. Un KPI de unidad `porcentaje` MUST editarse en **puntos porcentuales** y transportarse como tasa `0–1`, convirtiendo en ambos sentidos con redondeo explícito a la precisión mostrada. Un KPI cuyo `umbralKill` es `null` (sin zona kill) NO SHALL ofrecer control de umbral kill, y su petición MUST omitir el campo.

#### Scenario: Umbral de porcentaje
- **WHEN** el KPI tiene `unidad: porcentaje` y el valor vigente es `0.25`
- **THEN** el control muestra `25` con indicación de porcentaje, y al guardar `30` el cliente envía `0.3`

#### Scenario: KPI sin zona kill
- **WHEN** el `Umbral` de un KPI llega con `umbralKill: null`
- **THEN** la fila no ofrece control de umbral kill y el `PUT` de esa fila no incluye `umbralKill`

### Requirement: Guardado independiente de cada umbral
El cliente SHALL guardar los umbrales **fila por fila**: cada fila emite su propio `PUT /ideas/{id}/umbrales/{kpi}` y el resultado MUST afectar únicamente a esa fila. El control de guardado de una fila MUST permanecer deshabilitado mientras la fila no tenga cambios o sea localmente inválida. Un error en una fila NEVER MUST bloquear ni descartar la edición de las demás. El `Umbral` devuelto por el `PUT` MUST reemplazar el valor mostrado de esa fila.

#### Scenario: Guardado de una fila
- **WHEN** el usuario modifica el `umbralGo` de un KPI y guarda esa fila
- **THEN** el cliente emite el `PUT` de ese KPI y muestra la fila con el `Umbral` devuelto, sin recargar el resto de filas

#### Scenario: Un fallo no contamina las demás filas
- **WHEN** el `PUT` de un KPI falla
- **THEN** el error se muestra en esa fila y las ediciones pendientes de las demás filas se conservan intactas

#### Scenario: Sin cambios no hay petición
- **WHEN** una fila no ha sido modificada respecto al valor vigente
- **THEN** su control de guardado está deshabilitado y no se emite ninguna petición

### Requirement: Validación local de umbrales alineada con el contrato
El cliente SHALL impedir el envío de una fila cuyo `umbralKill` sea mayor que su `umbralGo`, o cuyo `umbralGo` no sea un número válido dentro del rango de su `unidad`, explicando el motivo en la fila. Esta validación MUST espejar la regla que produce el `422` del contrato **sin sustituirla**: un `422 VALIDACION_FALLIDA` recibido del backend MUST mostrarse igualmente campo a campo a partir de `detalles`.

#### Scenario: Umbral kill mayor que el go
- **WHEN** el usuario escribe un `umbralKill` mayor que el `umbralGo` de la misma fila
- **THEN** la fila muestra el motivo, el control de guardado queda deshabilitado y no se emite la petición

#### Scenario: Rechazo del backend
- **WHEN** `PUT /ideas/{id}/umbrales/{kpi}` responde `422 VALIDACION_FALLIDA` con `detalles`
- **THEN** el cliente muestra el error en los campos afectados de esa fila

#### Scenario: KPI fuera del catálogo
- **WHEN** `PUT /ideas/{id}/umbrales/{kpi}` responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente indica que ese KPI no existe, sin romper la vista

### Requirement: Los umbrales se fijan pero no se evalúan
La vista de umbrales SHALL limitarse a **fijar el criterio**: NEVER MUST mostrar el valor calculado de un KPI, su comparación contra el umbral, ni un dictamen `go`/`pivote`/`kill` derivado de ellos, que corresponden al cálculo de KPIs y al veredicto del agente de épicas posteriores. La vista TAMPOCO MUST ofrecer restablecer un umbral a su valor por defecto ni distinguir un umbral editado de uno por defecto, porque el contrato no expone esa procedencia ni esa operación.

#### Scenario: No se muestran valores medidos
- **WHEN** el usuario está en la vista de umbrales de una idea
- **THEN** solo ve los valores de umbral configurables, sin ningún valor de KPI calculado ni veredicto asociado

#### Scenario: No se ofrece restablecer al valor por defecto
- **WHEN** el usuario está en la vista de umbrales de una idea
- **THEN** no existe ningún control para restablecer un umbral a su valor por defecto ni una marca que lo señale como editado
