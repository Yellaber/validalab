# guiones-de-entrevista Specification

## Purpose
TBD - created by archiving change guiones-de-entrevista. Update Purpose after archive.
## Requirements
### Requirement: Listado paginado de los guiones propios
El cliente SHALL presentar el listado de los guiones del usuario autenticado consumiendo `GET /guiones` con los parámetros `pagina` y `porPagina` del contrato, mostrando de cada guión su `nombre`, su `descripcion` cuando exista y su número de preguntas. El número de preguntas SHALL derivarse de la longitud de `preguntas`, sin campo de recuento propio. El cliente NO SHALL ofrecer filtro ni búsqueda sobre esta colección, porque el contrato no los expone.

#### Scenario: Listado con guiones
- **WHEN** el usuario autenticado abre el listado de guiones y la respuesta trae guiones
- **THEN** ve cada guión con su `nombre`, su `descripcion` si la tiene y cuántas preguntas contiene

#### Scenario: Paginación del listado
- **WHEN** el usuario avanza de página
- **THEN** el cliente pide `GET /guiones` con la `pagina` nueva y renderiza los controles de paginación a partir del bloque `paginacion` de la respuesta

#### Scenario: Listado vacío
- **WHEN** el usuario no tiene ningún guión
- **THEN** el cliente muestra un estado vacío que invita a crear el primero, sin mensaje de error

#### Scenario: Error al cargar el listado
- **WHEN** la carga del listado falla
- **THEN** el cliente muestra un aviso derivado del `codigo` del error y ofrece reintentar

### Requirement: Alta de un guión con al menos una pregunta
El cliente SHALL permitir crear un guión mediante `POST /guiones` con `nombre` obligatorio, `descripcion` opcional y una lista de `preguntas` con **al menos una** entrada, conforme al `minItems: 1` del contrato. El formulario de alta SHALL presentar ya una fila de pregunta vacía. El cuerpo enviado NO SHALL incluir `ownerId`, que el servidor deriva del token. El cliente SHALL omitir del cuerpo la `descripcion` cuando esté vacía.

#### Scenario: Alta válida
- **WHEN** el usuario introduce un `nombre` y al menos una pregunta con texto y confirma
- **THEN** el cliente envía `POST /guiones` con `nombre` y las `preguntas`, sin `ownerId`
- **AND** al recibir el `201` navega al detalle del guión creado

#### Scenario: El formulario de alta arranca con una pregunta
- **WHEN** el usuario abre el alta de guión
- **THEN** ve ya una fila de pregunta vacía, sin tener que añadirla

#### Scenario: Alta bloqueada mientras falte lo obligatorio
- **WHEN** el `nombre` está vacío, o no hay ninguna pregunta con texto
- **THEN** el cliente mantiene deshabilitada la acción de guardar y no envía la petición

#### Scenario: Descripción vacía omitida del cuerpo
- **WHEN** el usuario deja la `descripcion` en blanco
- **THEN** el cuerpo enviado no incluye la propiedad `descripcion`

#### Scenario: Validación rechazada por el servidor
- **WHEN** el servidor responde `422 VALIDACION_FALLIDA`
- **THEN** el cliente reparte los `detalles` campo a campo sobre el formulario, señalando la fila concreta cuando el error apunta a una pregunta

### Requirement: Orden de las preguntas derivado de la posición
El cliente SHALL derivar el `orden` de cada pregunta de su posición en la lista, asignando enteros **contiguos y base 1** en el momento de construir el cuerpo de la petición. El cliente NO SHALL ofrecer el `orden` como campo editable ni permitir que el usuario lo teclee. El `orden` enviado SHALL coincidir siempre con el orden visible en pantalla.

#### Scenario: Orden asignado al enviar
- **WHEN** el guión tiene tres preguntas en pantalla y el usuario guarda
- **THEN** el cuerpo enviado lleva esas preguntas con `orden` 1, 2 y 3 en el mismo orden en que se muestran

#### Scenario: Orden recalculado tras eliminar una pregunta
- **WHEN** el usuario elimina la pregunta intermedia de tres y guarda
- **THEN** el cuerpo enviado lleva las dos preguntas restantes con `orden` 1 y 2, sin huecos

#### Scenario: No hay control de orden en la interfaz
- **WHEN** el usuario edita las preguntas de un guión
- **THEN** no encuentra ningún campo para escribir el `orden` de una pregunta

### Requirement: Editor de preguntas ordenadas
El cliente SHALL permitir, dentro del formulario de guión, añadir una pregunta, editar su texto, eliminarla y moverla arriba o abajo. El reordenamiento SHALL ofrecerse mediante controles operables por teclado, deshabilitados en los extremos (la primera no sube, la última no baja). El cliente SHALL retirar la acción de eliminar cuando solo quede una pregunta, explicando que un guión no puede quedarse sin preguntas. Cada fila del editor SHALL identificarse con una clave local del cliente, que NO SHALL enviarse en ninguna petición.

#### Scenario: Añadir una pregunta
- **WHEN** el usuario añade una pregunta
- **THEN** aparece una fila nueva y vacía al final de la lista

#### Scenario: Mover una pregunta
- **WHEN** el usuario mueve hacia arriba la segunda pregunta
- **THEN** esa pregunta pasa a mostrarse en primera posición y la anterior primera queda segunda

#### Scenario: Los controles de movimiento se deshabilitan en los extremos
- **WHEN** la lista tiene varias preguntas
- **THEN** la primera tiene deshabilitado el control de subir y la última el de bajar

#### Scenario: La última pregunta no se puede eliminar
- **WHEN** el guión tiene una sola pregunta
- **THEN** el cliente no ofrece la acción de eliminarla y explica que un guión necesita al menos una pregunta

#### Scenario: La clave local nunca se envía
- **WHEN** el cliente construye el cuerpo de un alta o de una edición
- **THEN** cada pregunta enviada lleva solo `texto` y `orden`, sin la clave local del editor ni ningún `id`

### Requirement: Consulta del detalle de un guión propio
El cliente SHALL presentar el detalle de un guión consumiendo `GET /guiones/{idGuion}`, mostrando su `nombre`, su `descripcion` cuando exista y sus preguntas **en el orden del contrato**, junto a las acciones de editar y eliminar.

#### Scenario: Detalle de un guión
- **WHEN** el usuario abre el detalle de un guión propio
- **THEN** ve su `nombre`, su `descripcion` si la tiene y sus preguntas listadas por `orden` ascendente

#### Scenario: Guión inexistente
- **WHEN** el servidor responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente indica que el guión no existe y ofrece volver al listado

### Requirement: Edición de un guión reemplazando el conjunto ordenado
El cliente SHALL permitir editar el `nombre`, la `descripcion` y las preguntas de un guión propio mediante `PATCH /guiones/{idGuion}`. Cuando el usuario modifique las preguntas, el cliente SHALL enviar **el conjunto ordenado completo**, no un subconjunto ni un delta, conforme a la semántica de reemplazo del contrato. El formulario de edición SHALL inicializarse con el guión cargado. El cuerpo NO SHALL incluir `ownerId`.

#### Scenario: Edición del texto de una pregunta
- **WHEN** el usuario cambia el texto de una sola pregunta de un guión de tres y guarda
- **THEN** el cuerpo enviado incluye las tres preguntas con su `orden` recalculado, no solo la modificada

#### Scenario: El formulario de edición parte del guión cargado
- **WHEN** el usuario abre la edición de un guión existente
- **THEN** el formulario muestra su `nombre`, su `descripcion` y sus preguntas en orden, listas para modificarse

#### Scenario: Edición guardada
- **WHEN** el servidor responde `200`
- **THEN** el cliente navega al detalle del guión y muestra el contenido actualizado

### Requirement: Eliminación de un guión con confirmación en línea
El cliente SHALL permitir eliminar un guión propio mediante `DELETE /guiones/{idGuion}`, exigiendo una confirmación **en línea** de dos pasos dentro de la propia vista. El cliente NO SHALL usar `window.confirm` ni ningún diálogo nativo del navegador. Tras el `204` el cliente SHALL volver al listado.

#### Scenario: Eliminación confirmada
- **WHEN** el usuario pide eliminar un guión y confirma en línea
- **THEN** el cliente envía el `DELETE` y, tras el `204`, vuelve al listado sin ese guión

#### Scenario: Eliminación cancelada
- **WHEN** el usuario pide eliminar un guión y cancela la confirmación
- **THEN** el cliente no envía ninguna petición y el guión permanece

### Requirement: Aislamiento de los guiones por propietario
El cliente NO SHALL enviar `ownerId` en ninguna petición de guiones: el servidor lo deriva del token. Ante un `403 ACCESO_DENEGADO` sobre un guión ajeno, el cliente SHALL mostrar el aviso **en lugar** del contenido y NO SHALL revelar ningún dato del guión, ni siquiera su nombre o su número de preguntas.

#### Scenario: Ningún request lleva ownerId
- **WHEN** el cliente crea o edita un guión
- **THEN** el cuerpo enviado no contiene la propiedad `ownerId`

#### Scenario: Guión ajeno alcanzado por URL directa
- **WHEN** el usuario navega al detalle de un guión que no le pertenece y el servidor responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra el aviso de acceso denegado y no renderiza ningún dato del guión

