## ADDED Requirements

### Requirement: Servicio de recurso de contactos contra el contrato
El cliente SHALL exponer un servicio inyectable que encapsule las operaciones del tag `contactos` (`POST` y `GET /ideas/{id}/contactos`, `GET`/`PATCH`/`DELETE /ideas/{id}/contactos/{idContacto}`, `POST .../estado` y `POST .../toques`). El servicio MUST derivar los tipos del contrato (`Contacto`, `CrearContactoRequest`, `ActualizarContactoRequest`, `TransicionEstadoRequest`, `RegistrarToqueRequest`, `RespuestaPaginada<Contacto>`) y MUST interpolar el `ideaId` y el `idContacto` en el **path**. El cuerpo NEVER MUST incluir `ideaId`, `ownerId`, `estado` ni las fechas de toque: el `estado` se mueve con la acción de transición y las fechas se fijan con la de toque.

#### Scenario: Las operaciones usan las rutas del contrato
- **WHEN** un componente invoca listar, crear, consultar, editar, eliminar, transicionar o registrar un toque
- **THEN** el servicio emite la petición a la ruta y el método correspondientes del tag `contactos`

#### Scenario: El cuerpo nunca lleva campos derivados ni de solo lectura
- **WHEN** el servicio construye la petición de crear o editar un contacto
- **THEN** el cuerpo no incluye `ideaId`, `ownerId`, `estado`, `primerToqueEn` ni `segundoToqueEn`

### Requirement: Listado paginado del embudo con filtro por estado
El cliente SHALL presentar los contactos de una idea propia consumiendo `GET /ideas/{id}/contactos` con `pagina`/`porPagina`, mostrando de cada uno su `nombre`, su `perfil` cuando exista, su `canal`, su posición en el embudo y cuántos toques lleva. La lista MUST ofrecer un **filtro por `estado`** que reemita la consulta con el parámetro del contrato, y controles de paginación derivados del bloque `paginacion`. El filtro MUST ofrecer los seis estados del catálogo, **incluido `entrevistado`**, porque un contacto puede estar en él aunque no se pueda transicionar allí manualmente. El estado que la vista lee MUST ser reactivo por signals.

#### Scenario: Listado inicial paginado
- **WHEN** el usuario autenticado abre los contactos de una idea suya
- **THEN** el cliente pide `GET /ideas/{id}/contactos` con `pagina`/`porPagina` y muestra cada contacto con su estado del embudo y su número de toques

#### Scenario: Filtrar por estado del embudo
- **WHEN** el usuario elige un `estado` en el filtro
- **THEN** el cliente reemite la consulta con el parámetro `estado` y muestra solo los contactos en ese estado

#### Scenario: El filtro incluye entrevistado
- **WHEN** el usuario despliega el filtro de estado
- **THEN** `entrevistado` figura entre las opciones, aunque no sea un destino de transición manual

### Requirement: Estados de carga, vacío y error del listado de contactos
El cliente SHALL comunicar el ciclo de vida de la carga: un indicador mientras la petición está en vuelo, un estado **vacío** distinguible cuando la idea no tiene contactos (o ninguno coincide con el filtro), y un estado de **error** cuando falla, ramificando por el `codigo` estable del `ErrorApi` y nunca por el `mensaje`.

#### Scenario: Idea sin contactos
- **WHEN** el listado responde una página sin contactos
- **THEN** el cliente muestra un estado vacío que invita a registrar el primer contacto, no una lista en blanco ni un error

#### Scenario: Fallo de red al listar
- **WHEN** el listado falla con `ERROR_RED`
- **THEN** el cliente muestra un estado de error con opción de reintentar, sin romper la vista

### Requirement: Alta de un contacto
El cliente SHALL ofrecer un formulario de alta con **Signal Forms** que exija `nombre` no vacío y admita `perfil`, `enlace` y `notas` opcionales, más `canal` y `origen` elegidos de sus catálogos. Al enviar hace `POST /ideas/{id}/contactos`. La validación local MUST bloquear el envío mientras el formulario sea inválido. El formulario NO SHALL exponer control alguno de `estado` ni de fechas de toque: el contacto nace `por_contactar` y sin toques. Un `422 VALIDACION_FALLIDA` MUST mostrarse **campo a campo** desde `detalles`.

#### Scenario: Alta exitosa
- **WHEN** el usuario envía el formulario con un `nombre` válido
- **THEN** el cliente hace `POST /ideas/{id}/contactos` y, al recibir `201`, muestra el contacto en estado `por_contactar` y sin toques

#### Scenario: Validación local bloquea el envío
- **WHEN** el `nombre` está vacío
- **THEN** el control de envío queda deshabilitado y no se emite la petición

#### Scenario: Ni el estado ni los toques son elegibles al crear
- **WHEN** el usuario está en el formulario de alta
- **THEN** no existe ningún control para fijar el `estado` del embudo ni las fechas de toque

### Requirement: Detalle de un contacto propio
El cliente SHALL presentar el detalle de un contacto consumiendo `GET /ideas/{id}/contactos/{idContacto}`, mostrando su contenido (`nombre`, `perfil`, `enlace`, `canal`, `origen`, `notas`), quién lo refirió cuando `referidoPorId` no es nulo, su posición en el embudo y el historial de toques con sus fechas. Desde el detalle el cliente MUST ofrecer las acciones disponibles: editar, transicionar, registrar toque y eliminar.

#### Scenario: Detalle de contacto propio
- **WHEN** el usuario abre un contacto suyo
- **THEN** el cliente hace `GET /ideas/{id}/contactos/{idContacto}` y muestra su contenido, su estado del embudo y sus toques

#### Scenario: Contacto inexistente
- **WHEN** el detalle responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente muestra un estado de contacto no encontrado

### Requirement: Un contacto ajeno no revela ningún dato
El `Contacto` es información personal. Ante un `403 ACCESO_DENEGADO`, en el listado o en el detalle, el cliente SHALL mostrar únicamente el aviso de acceso denegado y NEVER MUST renderizar dato alguno del contacto: ni `nombre`, ni `perfil`, ni `enlace`, ni recuento de toques. El estado de error MUST renderizarse **en lugar** del contenido, nunca junto a él.

#### Scenario: Detalle de un contacto ajeno alcanzado por URL directa
- **WHEN** el usuario navega al detalle de un contacto que no le pertenece y el backend responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra el aviso de acceso denegado y ningún dato del contacto

### Requirement: Edición del contenido de un contacto
El cliente SHALL permitir editar `nombre`, `perfil`, `enlace`, `canal`, `origen`, `referidoPorId` y `notas` mediante `PATCH /ideas/{id}/contactos/{idContacto}`, reutilizando el formulario de Signal Forms con los valores actuales. El formulario NO SHALL exponer control para cambiar el `estado` del embudo ni las fechas de toque: esas superficies tienen sus propias acciones. Un `422 VALIDACION_FALLIDA` MUST mostrarse campo a campo.

#### Scenario: Edición de contenido
- **WHEN** el usuario guarda cambios en el `perfil` de un contacto suyo
- **THEN** el cliente hace `PATCH /ideas/{id}/contactos/{idContacto}` y refleja el contacto actualizado

#### Scenario: El estado del embudo no es editable como contenido
- **WHEN** el usuario está en el formulario de edición
- **THEN** no existe ningún control para cambiar el `estado` ni las fechas de toque

### Requirement: Vínculo de referido dentro de la misma idea
Cuando el `origen` de un contacto es `referido`, el cliente SHALL ofrecer elegir el `referidoPorId` entre **contactos de la misma idea**, y NEVER MUST ofrecer el propio contacto que se está editando como su referidor. El selector SHALL poblarse solo cuando el `origen` es `referido`. El detalle MUST mostrar quién refirió al contacto cuando `referidoPorId` no es nulo.

#### Scenario: Elegir quién refirió al contacto
- **WHEN** el usuario marca el `origen` como `referido`
- **THEN** el cliente ofrece elegir el referidor entre los contactos de esa idea, sin incluir el contacto que se está editando

#### Scenario: Origen distinto de referido
- **WHEN** el `origen` no es `referido`
- **THEN** no se ofrece selector de referidor y el cuerpo no envía `referidoPorId`

### Requirement: Transición del contacto por el embudo de outreach
El cliente SHALL ofrecer, sobre un contacto propio, mover su posición en el embudo mediante `POST /ideas/{id}/contactos/{idContacto}/estado`. Solo SHALL ofrecer los destinos **alcanzables desde el estado actual** según el orden del embudo (`por_contactar → contactado → respondio → agendado`), más `descartado` desde cualquier estado no terminal. El cliente NEVER MUST ofrecer `entrevistado` como destino: ese estado solo lo origina el registro de una entrevista, y la UI MUST explicarlo en lugar de limitarse a omitirlo. Un `409 CONFLICTO` MUST traducirse a un mensaje que explique que esa transición no está permitida, sin romper la vista.

#### Scenario: Avanzar en el embudo
- **WHEN** el usuario mueve a `contactado` un contacto en `por_contactar`
- **THEN** el cliente hace `POST .../estado` con el estado destino y refleja la nueva posición del contacto

#### Scenario: Entrevistado no se ofrece
- **WHEN** el usuario ve las acciones de embudo de un contacto en `agendado`
- **THEN** `entrevistado` no figura entre los destinos ofrecidos, y la vista explica que ese estado lo fija el registro de una entrevista

#### Scenario: Transición rechazada por el backend
- **WHEN** `POST .../estado` responde `409 CONFLICTO`
- **THEN** el cliente explica que esa transición no está permitida, sin romper la vista

### Requirement: Registro de toques con el límite de dos
El cliente SHALL ofrecer registrar un toque de outreach mediante `POST /ideas/{id}/contactos/{idContacto}/toques`, admitiendo una `fecha` opcional que MUST omitirse del cuerpo cuando el usuario no la indica, de modo que el momento lo fije el servidor. El número de toques MUST derivarse de `primerToqueEn` y `segundoToqueEn`, sin contador local. Cuando el contacto ya tiene **dos** toques, el cliente NO SHALL ofrecer la acción, y MUST explicar que dos es el límite del método, no un fallo. Un `409 CONFLICTO` MUST traducirse en ese mismo sentido.

#### Scenario: Primer toque
- **WHEN** el usuario registra un toque en un contacto sin toques previos
- **THEN** el cliente hace `POST .../toques` sin `fecha` en el cuerpo y el contacto pasa a mostrar un toque con su fecha

#### Scenario: Toque con fecha indicada
- **WHEN** el usuario indica una fecha para el toque
- **THEN** el cuerpo incluye esa `fecha`

#### Scenario: Límite alcanzado
- **WHEN** el contacto ya tiene `primerToqueEn` y `segundoToqueEn`
- **THEN** la acción de registrar toque no se ofrece y la vista explica que el límite de dos toques es parte del método

#### Scenario: Tercer toque rechazado por el backend
- **WHEN** `POST .../toques` responde `409 CONFLICTO`
- **THEN** el cliente explica que el contacto ya alcanzó el límite de dos toques, sin romper la vista

### Requirement: Los dos conflictos del tag se explican por la acción que los provocó
El código `CONFLICTO` cubre en este tag dos reglas distintas —transición no permitida y límite de toques—. El cliente SHALL elegir el mensaje según la **operación invocada**, no únicamente según el `codigo`, y NEVER MUST mostrar el `mensaje` del backend ni un texto genérico que obligue al usuario a deducir cuál de las dos reglas se aplicó.

#### Scenario: Mismo código, mensajes distintos
- **WHEN** una transición y un tercer toque responden ambos `409 CONFLICTO`
- **THEN** el cliente muestra en cada caso el mensaje propio de esa regla, no el mismo texto

### Requirement: Eliminación confirmada de un contacto
El cliente SHALL permitir eliminar un contacto propio mediante `DELETE /ideas/{id}/contactos/{idContacto}`. Por ser irreversible, la eliminación MUST exigir una **confirmación explícita en la propia interfaz** antes de emitir la petición; NEVER SHALL emitirse con un solo clic. Tras un `204` el cliente MUST volver al listado, donde el contacto ya no figura.

#### Scenario: Eliminación confirmada
- **WHEN** el usuario pide eliminar un contacto y confirma
- **THEN** el cliente hace `DELETE /ideas/{id}/contactos/{idContacto}` y vuelve al listado sin ese contacto

#### Scenario: Eliminación cancelada
- **WHEN** el usuario pide eliminar un contacto y cancela en el paso de confirmación
- **THEN** no se emite ninguna petición y el contacto permanece
