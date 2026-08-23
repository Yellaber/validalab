## ADDED Requirements

### Requirement: Presentación del juicio del agente
El cliente SHALL mostrar, en el detalle de una entrevista `puntuada`, el bloque `score` del agente: el `score` (0–10), la `justificacion`, las `senales` detectadas y la `confianza` (0–100). Cuando la entrevista no tenga `score`, el cliente NO SHALL renderizar el bloque ni sustituirlo por valores por defecto.

#### Scenario: Entrevista puntuada
- **WHEN** el usuario abre una entrevista con `estadoScoring` `puntuada` y su bloque `score`
- **THEN** ve el score, su justificación, las señales detectadas y la confianza del agente

#### Scenario: Entrevista sin score todavía
- **WHEN** la entrevista tiene `estadoScoring` `pendiente` y `score` nulo
- **THEN** el cliente no renderiza el bloque de score ni muestra un score de relleno

#### Scenario: Scoring fallido
- **WHEN** la entrevista tiene `estadoScoring` `fallida`
- **THEN** el cliente explica que el agente no pudo puntuarla y ofrece reintentar

### Requirement: Trazabilidad del score
El cliente SHALL mostrar, cuando vengan en el bloque `score`, el `proveedor`, el `modelo`, la `rubricaVersion` y la `fechaScoring`, como datos de auditoría del juicio. Los campos ausentes NO SHALL renderizarse vacíos.

#### Scenario: Score con trazabilidad completa
- **WHEN** el bloque `score` trae proveedor, modelo, versión de rúbrica y fecha
- **THEN** el cliente los muestra como información de auditoría del score

#### Scenario: Score sin datos de trazabilidad
- **WHEN** el bloque `score` no trae proveedor ni modelo
- **THEN** el cliente omite esos campos en lugar de mostrarlos vacíos

### Requirement: Señales estructuradas distinguiendo ausencia de negativo
El cliente SHALL mostrar las cuatro señales estructuradas (`dolorConfirmado`, `dolorUrgente`, `sinSolucionActual`, `disposicionPago`) cuando el bloque `score` las traiga. Cuando **no** vengan, el cliente SHALL declarar que esa versión de la rúbrica no las clasificó, y NO SHALL representarlas como negativas.

#### Scenario: Señales estructuradas presentes
- **WHEN** el score trae las cuatro señales con sus valores
- **THEN** el cliente muestra cada una indicando si el agente la detectó o no

#### Scenario: Señales estructuradas ausentes
- **WHEN** el score no incluye `senalesEstructuradas`
- **THEN** el cliente indica que esa versión de la rúbrica no las clasificó
- **AND** no muestra las cuatro señales como no detectadas

### Requirement: Costo del scoring presentado como consumo, no como saldo
El cliente SHALL mostrar `tokensEntrada`, `tokensSalida` y `costoEstimado` cuando vengan en el bloque `score`, etiquetados como **estimación del consumo** de esa puntuación. El cliente NO SHALL presentarlos como saldo, crédito ni cuota disponible del proveedor.

#### Scenario: Score con datos de costo
- **WHEN** el score trae tokens y costo estimado
- **THEN** el cliente los muestra como coste estimado de esa puntuación

#### Scenario: El costo no se confunde con el saldo
- **WHEN** el cliente muestra el costo estimado
- **THEN** el texto no afirma ni sugiere que sea el saldo o el crédito disponible de la cuenta del proveedor

#### Scenario: Score sin datos de costo
- **WHEN** el score no trae tokens ni costo
- **THEN** el cliente omite el bloque de costo

### Requirement: Seguimiento del scoring asíncrono con polling acotado
Mientras el `estadoScoring` de la entrevista abierta sea `pendiente` o `procesando`, el cliente SHALL volver a consultarla periódicamente hasta un **número limitado de intentos**. El cliente SHALL detener las consultas en cuanto el estado sea `puntuada` o `fallida`. Agotados los intentos, el cliente SHALL detenerse, explicar que el scoring está tardando más de lo normal y ofrecer un refresco manual. El cliente SHALL cancelar el seguimiento al abandonar la vista, y NO SHALL consultar periódicamente desde el listado.

#### Scenario: El scoring termina durante el seguimiento
- **WHEN** el usuario abre una entrevista en `procesando` y el scoring termina
- **THEN** el cliente detecta el cambio, muestra el bloque de score y deja de consultar

#### Scenario: Una entrevista ya puntuada no se consulta de nuevo
- **WHEN** el usuario abre una entrevista con `estadoScoring` `puntuada`
- **THEN** el cliente no emite ninguna consulta periódica

#### Scenario: Se agotan los intentos
- **WHEN** el estado sigue en `procesando` tras agotar los intentos
- **THEN** el cliente deja de consultar, explica que está tardando más de lo normal y ofrece refrescar a mano

#### Scenario: Refresco manual tras agotarse
- **WHEN** el usuario usa el refresco manual
- **THEN** el cliente vuelve a consultar la entrevista

#### Scenario: El seguimiento se cancela al salir
- **WHEN** el usuario abandona el detalle mientras el scoring está en curso
- **THEN** el cliente no emite más consultas

### Requirement: Re-disparar el scoring del agente
El cliente SHALL ofrecer, desde el detalle, la acción de (re)disparar el scoring mediante `POST /ideas/{id}/entrevistas/{idEntrevista}/puntuar`. La acción SHALL presentarse como **reintento** cuando el estado sea `fallida` y como **re-puntuado** cuando sea `puntuada`. El cliente SHALL advertir que puntuar consume del proveedor configurado antes de disparar.

#### Scenario: Reintento tras un scoring fallido
- **WHEN** el usuario reintenta el scoring de una entrevista `fallida`
- **THEN** el cliente envía `POST .../puntuar` y refleja el estado devuelto

#### Scenario: Re-puntuar una entrevista ya puntuada
- **WHEN** el usuario vuelve a puntuar una entrevista `puntuada`
- **THEN** el cliente envía `POST .../puntuar` tras advertir del consumo

#### Scenario: El seguimiento arranca tras disparar
- **WHEN** la respuesta devuelve la entrevista en `pendiente` o `procesando`
- **THEN** el cliente comienza el seguimiento acotado sin intervención del usuario

### Requirement: Ajuste humano del score conservando ambos valores
El cliente SHALL permitir registrar el ajuste humano mediante `POST /ideas/{id}/entrevistas/{idEntrevista}/ajuste-score` con `scoreAjustado` (0–10) y una `nota` obligatoria con contenido. Registrado el ajuste, el cliente SHALL mostrar **ambos** valores —el del agente y el del usuario— y SHALL señalar que el ajuste es el que prevalece en el cálculo de los KPIs. El cliente NO SHALL ocultar ni tachar la justificación del agente al ajustar, y NO SHALL enviar el bloque `score` en ninguna petición.

#### Scenario: Ajuste registrado
- **WHEN** el usuario introduce un `scoreAjustado` y una `nota` y confirma
- **THEN** el cliente envía `POST .../ajuste-score` con ambos campos y refleja la entrevista devuelta

#### Scenario: Ambos valores visibles
- **WHEN** la entrevista tiene `score` del agente y `ajuste` del usuario
- **THEN** el cliente muestra los dos y señala que el ajuste es el que cuenta para los KPIs

#### Scenario: La justificación del agente sobrevive al ajuste
- **WHEN** el usuario ajusta el score
- **THEN** la justificación del agente sigue mostrándose

#### Scenario: Ajuste bloqueado sin nota
- **WHEN** el usuario introduce un score ajustado pero deja la nota vacía
- **THEN** el cliente mantiene deshabilitada la confirmación y no envía la petición

#### Scenario: Score ajustado fuera de rango
- **WHEN** el usuario introduce un `scoreAjustado` fuera del rango 0–10
- **THEN** el cliente lo señala y no envía la petición

#### Scenario: Validación rechazada por el servidor
- **WHEN** el servidor responde `422 VALIDACION_FALLIDA` con `detalles`
- **THEN** el cliente reparte los detalles sobre los campos del formulario de ajuste

### Requirement: El bloque de score es de solo lectura
El cliente NO SHALL enviar el bloque `score` ni ninguno de sus campos en ninguna petición: lo produce el agente. El único valor de puntuación que el cliente envía SHALL ser el `scoreAjustado` del ajuste humano.

#### Scenario: Ningún cuerpo lleva el score del agente
- **WHEN** el cliente registra un ajuste o dispara el scoring
- **THEN** el cuerpo enviado no contiene `score`, `justificacion`, `senales`, `confianza` ni datos de trazabilidad
