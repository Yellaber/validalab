## ADDED Requirements

### Requirement: Listado paginado de las entrevistas de una idea
El cliente SHALL presentar el listado de las entrevistas de una idea propia consumiendo `GET /ideas/{id}/entrevistas` con `pagina` y `porPagina`, mostrando de cada entrevista el **nombre** del contacto entrevistado, el **nombre** del guión usado, su fecha y su `estadoScoring`. El cliente NO SHALL mostrar identificadores en crudo: SHALL resolver `contactoId` y `guionId` a nombres, y cuando un nombre no pueda resolverse SHALL mostrar un texto neutro en lugar del identificador.

#### Scenario: Listado con entrevistas
- **WHEN** el usuario abre el listado de entrevistas de una idea y la respuesta trae entrevistas
- **THEN** ve cada una con el nombre de su contacto, el nombre de su guión, su fecha y su estado de scoring

#### Scenario: Nombre no resoluble
- **WHEN** una entrevista referencia un contacto que no aparece entre los cargados
- **THEN** el cliente muestra un texto neutro en esa fila y no renderiza el identificador

#### Scenario: Paginación del listado
- **WHEN** el usuario avanza de página
- **THEN** el cliente pide el listado con la `pagina` nueva y renderiza los controles a partir del bloque `paginacion`

#### Scenario: Listado vacío
- **WHEN** la idea no tiene entrevistas registradas
- **THEN** el cliente muestra un estado vacío que invita a registrar la primera, sin mensaje de error

#### Scenario: Error al cargar el listado
- **WHEN** la carga del listado falla
- **THEN** el cliente muestra un aviso derivado del `codigo` del error y ofrece reintentar

### Requirement: Filtro por contacto y por estado de scoring
El cliente SHALL ofrecer los dos filtros que expone el contrato para esta colección, `contactoId` y `estadoScoring`, enviándolos como parámetros de la petición. Filtrar SHALL provocar una petición nueva y NO SHALL recortarse en cliente. El filtro de estado SHALL ofrecer los cuatro valores de `EstadoScoring`.

#### Scenario: Filtrar por contacto
- **WHEN** el usuario elige un contacto en el filtro
- **THEN** el cliente pide el listado con el parámetro `contactoId` y vuelve a la primera página

#### Scenario: Filtrar por estado de scoring
- **WHEN** el usuario elige un estado en el filtro
- **THEN** el cliente pide el listado con el parámetro `estadoScoring` y vuelve a la primera página

#### Scenario: Ambos filtros a la vez
- **WHEN** el usuario tiene activos el filtro de contacto y el de estado
- **THEN** el cliente envía ambos parámetros en la misma petición

### Requirement: Registro de una entrevista contra las preguntas de un guión
El cliente SHALL permitir registrar una entrevista mediante `POST /ideas/{id}/entrevistas` eligiendo un **contacto** de la idea y un **guión** propio, y capturando **una respuesta por cada pregunta del guión elegido**, presentadas en el orden del guión. El cuerpo enviado SHALL incluir `contactoId`, `guionId` y `respuestas` con su `preguntaId`, y NO SHALL incluir `ideaId`, `ownerId` ni `score`.

#### Scenario: Los campos de respuesta los define el guión
- **WHEN** el usuario elige un guión con tres preguntas
- **THEN** el formulario presenta tres entradas de respuesta, una por pregunta, en el orden del guión, cada una junto al texto de su pregunta

#### Scenario: Alta válida
- **WHEN** el usuario elige contacto y guión, responde las preguntas y confirma
- **THEN** el cliente envía `POST` con `contactoId`, `guionId` y una respuesta por pregunta con su `preguntaId`
- **AND** al recibir el `201` navega al detalle de la entrevista creada

#### Scenario: Alta bloqueada sin lo obligatorio
- **WHEN** falta el contacto, falta el guión o no hay ninguna respuesta con texto
- **THEN** el cliente mantiene deshabilitada la acción de guardar y no envía la petición

#### Scenario: El cuerpo no lleva campos derivados
- **WHEN** el cliente construye el cuerpo del alta
- **THEN** no contiene `ideaId`, `ownerId` ni `score`

### Requirement: Cambio de guión con respuestas escritas confirmado en línea
Cuando el usuario cambie de guión y **existan respuestas con texto**, el cliente SHALL pedir confirmación **en línea** antes de descartarlas, sin usar `window.confirm`. Cuando todas las respuestas estén vacías, el cambio SHALL aplicarse sin confirmación.

#### Scenario: Cambio con respuestas escritas
- **WHEN** el usuario ha escrito alguna respuesta y elige otro guión
- **THEN** el cliente pide confirmación explicando que se perderán las respuestas, y solo al confirmar sustituye las preguntas

#### Scenario: Cambio sin respuestas escritas
- **WHEN** todas las respuestas están vacías y el usuario elige otro guión
- **THEN** el cliente sustituye las preguntas de inmediato, sin pedir confirmación

#### Scenario: Cambio cancelado
- **WHEN** el usuario cancela la confirmación
- **THEN** el guión seleccionado y las respuestas escritas permanecen sin cambios

### Requirement: Selector de contactos limitado a los entrevistables
El selector de contacto SHALL ofrecer únicamente contactos de la misma idea que **no estén** en estado `entrevistado` ni `descartado`, porque el contrato los rechaza con `409 CONFLICTO`. Cuando no exista ningún contacto entrevistable, el cliente SHALL indicarlo y ofrecer el acceso al CRM de contactos en lugar de un desplegable vacío.

#### Scenario: Contactos no entrevistables excluidos
- **WHEN** la idea tiene contactos en estado `entrevistado` y `descartado` junto a otros disponibles
- **THEN** el selector ofrece solo los disponibles y no los dos primeros

#### Scenario: Sin contactos entrevistables
- **WHEN** ningún contacto de la idea puede entrevistarse
- **THEN** el cliente lo explica y ofrece ir a los contactos de la idea, sin mostrar un selector vacío

### Requirement: Captura de citas textuales
El cliente SHALL permitir añadir y eliminar citas, cada una con `texto` obligatorio y `contexto` opcional. Las citas SHALL poder ser **cero**: el contrato no las exige. El cliente NO SHALL asignarles orden. Cada fila SHALL identificarse con una clave local del cliente que NO SHALL enviarse en ninguna petición.

#### Scenario: Añadir una cita
- **WHEN** el usuario añade una cita
- **THEN** aparece una fila nueva con su campo de texto y su contexto opcional

#### Scenario: Eliminar cualquier cita, incluida la última
- **WHEN** el usuario elimina la única cita presente
- **THEN** la fila desaparece y el formulario sigue siendo válido, porque las citas son opcionales

#### Scenario: Las citas viajan sin clave local
- **WHEN** el cliente construye el cuerpo con citas
- **THEN** cada cita enviada lleva solo `texto` y, si lo tiene, `contexto`, sin la clave local ni ningún `id`

#### Scenario: Citas vacías omitidas
- **WHEN** el usuario deja una fila de cita sin texto y guarda
- **THEN** esa fila no se envía en el cuerpo

### Requirement: Consulta del detalle de una entrevista
El cliente SHALL presentar el detalle de una entrevista consumiendo `GET /ideas/{id}/entrevistas/{idEntrevista}`, mostrando el nombre del contacto, el nombre del guión, **cada respuesta junto al texto de la pregunta que contesta**, las citas y el `estadoScoring`.

#### Scenario: Detalle con respuestas legibles
- **WHEN** el usuario abre el detalle de una entrevista propia
- **THEN** ve cada respuesta acompañada del texto de su pregunta, en el orden del guión, más las citas y el estado del scoring

#### Scenario: Entrevista inexistente
- **WHEN** el servidor responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente indica que la entrevista no existe y ofrece volver al listado

#### Scenario: Entrevista ajena
- **WHEN** el servidor responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra el aviso en lugar del contenido y no revela ningún dato de la entrevista

### Requirement: Edición de respuestas y citas con aviso de invalidación del score
El cliente SHALL permitir editar mediante `PATCH` únicamente las `respuestas` y las `citas` de una entrevista. El formulario de edición NO SHALL ofrecer control para cambiar el contacto ni el guión, porque el contrato no lo permite. Cuando el usuario haya modificado alguna respuesta, el cliente SHALL advertir **antes de guardar** que se invalidará el score del agente y se re-disparará el scoring. Cuando solo hayan cambiado las citas, NO SHALL mostrar esa advertencia.

#### Scenario: La edición no ofrece cambiar contacto ni guión
- **WHEN** el usuario abre la edición de una entrevista
- **THEN** ve las respuestas y las citas editables, y ningún selector de contacto o de guión

#### Scenario: Aviso al modificar una respuesta
- **WHEN** el usuario cambia el texto de alguna respuesta
- **THEN** el cliente advierte que guardar invalidará el score del agente y volverá a puntuar la entrevista

#### Scenario: Sin aviso al cambiar solo citas
- **WHEN** el usuario modifica únicamente las citas
- **THEN** el cliente no muestra la advertencia de invalidación

#### Scenario: Edición guardada
- **WHEN** el usuario confirma la edición y el servidor responde `200`
- **THEN** el cliente navega al detalle de la entrevista con el contenido actualizado

### Requirement: Eliminación de una entrevista con confirmación en línea
El cliente SHALL permitir eliminar una entrevista mediante `DELETE`, exigiendo una confirmación **en línea** de dos pasos dentro de la vista. El cliente NO SHALL usar `window.confirm`. Tras el `204` SHALL volver al listado.

#### Scenario: Eliminación confirmada
- **WHEN** el usuario pide eliminar una entrevista y confirma en línea
- **THEN** el cliente envía el `DELETE` y, tras el `204`, vuelve al listado sin esa entrevista

#### Scenario: Eliminación cancelada
- **WHEN** el usuario cancela la confirmación
- **THEN** el cliente no envía ninguna petición y la entrevista permanece

### Requirement: Traducción de los errores propios del registro
El cliente SHALL ramificar los errores por su `codigo` y NO SHALL mostrar el `mensaje` del backend. `ENTREVISTA_SIN_VINCULO` SHALL explicarse como que el contacto o la idea no forman un vínculo válido; `CONFLICTO` SHALL explicarse como que el contacto ya fue entrevistado o está descartado. El mensaje SHALL depender de la operación que lo provocó.

#### Scenario: Vínculo inválido
- **WHEN** el servidor responde `422` con `codigo` `ENTREVISTA_SIN_VINCULO`
- **THEN** el cliente explica que ese contacto no pertenece a esta idea, sin mostrar el mensaje del backend

#### Scenario: Contacto ya entrevistado o descartado
- **WHEN** el servidor responde `409` con `codigo` `CONFLICTO` al registrar
- **THEN** el cliente explica que ese contacto ya fue entrevistado o está descartado

#### Scenario: Validación campo a campo
- **WHEN** el servidor responde `422` con `codigo` `VALIDACION_FALLIDA` y `detalles`
- **THEN** el cliente reparte los detalles sobre los campos del formulario

### Requirement: Frontera con el scoring del agente
El cliente SHALL mostrar el `estadoScoring` como etiqueta en el listado y en el detalle, y ofrecerlo como filtro. El cliente NO SHALL, en esta capacidad, renderizar el bloque `score` ni el `ajuste`, consultar repetidamente el estado para detectar su avance, ni ofrecer acciones de re-puntuado o de ajuste del score.

#### Scenario: El estado se muestra sin interpretarse
- **WHEN** el usuario ve una entrevista con `estadoScoring` `procesando`
- **THEN** el cliente muestra esa etiqueta y no ofrece ninguna acción sobre el scoring

#### Scenario: El bloque de score no se renderiza
- **WHEN** la entrevista trae un bloque `score` con su justificación y señales
- **THEN** el detalle no muestra ese contenido, que corresponde a la capacidad de scoring y ajuste
