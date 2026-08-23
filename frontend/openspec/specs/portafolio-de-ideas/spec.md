# portafolio-de-ideas Specification

## Purpose
Portafolio de ideas en el cliente Angular (épica E1): crear, listar (paginado y filtrado por estado), consultar, editar, archivar y desarchivar las ideas propias del usuario autenticado, con sus estados de carga/vacío/error y la traducción de los errores del contrato ramificada por `codigo`. Consume el tag `ideas` del contrato de API único, **solo los endpoints de la entidad `Idea`**: las colecciones que cuelgan de ella —hipótesis y umbrales kill/go (E2)— son competencia de `hipotesis-y-umbrales`, y las transiciones de veredicto `go`/`pivote`/`kill` (E6) quedan fuera. Desde el detalle de una idea se ofrece el acceso a su criterio de validación, pero su gestión no vive aquí. Se apoya en la plomería HTTP y de sesión del E0 (`cliente-http-y-errores`, `sesion-cliente`, `shell-y-navegacion`).
## Requirements
### Requirement: Servicio de recurso de ideas contra el contrato
El cliente SHALL exponer un servicio inyectable de ideas que encapsule las llamadas HTTP del tag `ideas` del contrato (`POST /ideas`, `GET /ideas`, `GET /ideas/{id}`, `PATCH /ideas/{id}`, `POST /ideas/{id}/archivar`, `POST /ideas/{id}/desarchivar`). El servicio MUST derivar los tipos de petición/respuesta del contrato (`Idea`, `CrearIdeaRequest`, `ActualizarIdeaRequest`, `RespuestaPaginada<Idea>`) y NUNCA MUST enviar `ownerId` en el cuerpo ni en el query: el aislamiento por propietario lo gobierna el backend. El servicio MUST apoyarse en la plomería HTTP del E0 (interceptor de autorización que adjunta el `Bearer` y renueva ante `401`, y traducción del sobre `Error` a `ErrorApi`) sin reimplementarla.

#### Scenario: Las operaciones usan las rutas del contrato
- **WHEN** un componente invoca crear, listar, consultar, editar, archivar o desarchivar
- **THEN** el servicio emite la petición HTTP a la ruta y método correspondientes del tag `ideas`

#### Scenario: El cliente nunca envía ownerId
- **WHEN** el servicio construye la petición de crear o editar una idea
- **THEN** el cuerpo no incluye `ownerId` ni ningún filtro de propietario

### Requirement: Listado paginado del portafolio con filtro por estado
El cliente SHALL presentar las ideas propias consumiendo `GET /ideas` con `pagina`/`porPagina`, renderizando cada idea con su `titulo` y su `estado` de validación. La lista MUST ofrecer un control de **filtro por `estado`** que reemite la consulta con el parámetro `estado`, y controles de **paginación** que reflejen el bloque `paginacion` del sobre `RespuestaPaginada` (página actual y total de páginas). El estado que la vista lee MUST ser reactivo por signals (zoneless).

#### Scenario: Listado inicial paginado
- **WHEN** el usuario autenticado abre el portafolio
- **THEN** el cliente pide `GET /ideas` con `pagina`/`porPagina` y muestra sus ideas con su `estado`, junto a los controles de paginación derivados de `paginacion`

#### Scenario: Filtrar por estado
- **WHEN** el usuario elige un `estado` en el filtro
- **THEN** el cliente reemite `GET /ideas?estado=<valor>` y muestra solo las ideas propias en ese estado

#### Scenario: Cambio de página
- **WHEN** el usuario avanza a la página siguiente
- **THEN** el cliente reemite `GET /ideas` con la nueva `pagina` y actualiza la lista y los controles

### Requirement: Estados de carga, vacío y error del listado
El cliente SHALL comunicar visualmente el ciclo de vida de la carga del listado: un indicador mientras la petición está en vuelo, un estado **vacío** distinguible cuando el usuario no tiene ideas (o ninguna coincide con el filtro), y un estado de **error** cuando la petición falla, ramificando por el `codigo` estable del `ErrorApi` y nunca por el `mensaje`.

#### Scenario: Portafolio vacío
- **WHEN** `GET /ideas` responde una página sin ideas
- **THEN** el cliente muestra un estado vacío que invita a crear la primera idea, no una lista en blanco ni un error

#### Scenario: Fallo de red al listar
- **WHEN** `GET /ideas` falla con `ERROR_RED`
- **THEN** el cliente muestra un estado de error con opción de reintentar, sin romper la vista

### Requirement: Alta de una idea
El cliente SHALL ofrecer un formulario de creación con **Signal Forms** que exija `titulo` y `problema` no vacíos y admita `descripcion` y `segmentoBeachhead` opcionales, y que al enviar haga `POST /ideas`. La validación local MUST bloquear el envío mientras el formulario sea inválido. Un `422 VALIDACION_FALLIDA` del backend MUST mostrarse **campo a campo** a partir de `detalles`. Tras una creación exitosa el cliente MUST navegar a la idea creada (o al listado) reflejando que nace en estado `borrador`.

#### Scenario: Creación exitosa
- **WHEN** el usuario envía el formulario con `titulo` y `problema` válidos
- **THEN** el cliente hace `POST /ideas` y, al recibir `201`, navega mostrando la idea creada en estado `borrador`

#### Scenario: Validación local bloquea el envío
- **WHEN** el `titulo` o el `problema` están vacíos
- **THEN** el control de envío queda deshabilitado y no se emite la petición

#### Scenario: Error de validación del backend
- **WHEN** `POST /ideas` responde `422 VALIDACION_FALLIDA` con `detalles` por campo
- **THEN** el cliente muestra el error asociado a cada campo afectado

### Requirement: Consultar el detalle de una idea propia
El cliente SHALL presentar el detalle de una idea consumiendo `GET /ideas/{id}`, mostrando `titulo`, `descripcion`, `problema`, `segmentoBeachhead` y `estado`. Un `403 ACCESO_DENEGADO` (idea ajena) MUST mostrarse como acceso denegado sin revelar datos; un `404 RECURSO_NO_ENCONTRADO` MUST mostrarse como idea inexistente. Desde el detalle el cliente MUST ofrecer las acciones disponibles según el `estado` (editar, archivar o desarchivar). El detalle MUST ofrecer además el acceso a las **hipótesis**, a los **umbrales kill/go**, a los **contactos**, a las **entrevistas** y al **tablero de KPIs** de esa idea, como puntos de entrada a la definición de su criterio de validación, al descubrimiento que la alimenta y a la lectura de conjunto de su evidencia.

#### Scenario: Detalle de idea propia
- **WHEN** el usuario abre una idea suya
- **THEN** el cliente hace `GET /ideas/{id}` y muestra su contenido y su `estado`

#### Scenario: Idea ajena
- **WHEN** `GET /ideas/{id}` responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra un mensaje de acceso denegado sin revelar contenido de la idea

#### Scenario: Idea inexistente
- **WHEN** `GET /ideas/{id}` responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente muestra un estado de idea no encontrada

#### Scenario: Acceso a las hipótesis y los umbrales de la idea
- **WHEN** el usuario ve el detalle de una idea suya
- **THEN** dispone de accesos a las hipótesis y a los umbrales de esa idea, junto a las acciones de editar, archivar o desarchivar

#### Scenario: Acceso a los contactos de la idea
- **WHEN** el usuario ve el detalle de una idea suya
- **THEN** dispone también del acceso a los contactos de esa idea

#### Scenario: Acceso a las entrevistas de la idea
- **WHEN** el usuario ve el detalle de una idea suya
- **THEN** dispone también del acceso a las entrevistas de esa idea

#### Scenario: Acceso al tablero de KPIs de la idea
- **WHEN** el usuario ve el detalle de una idea suya
- **THEN** dispone también del acceso al tablero de KPIs de esa idea

### Requirement: Editar el contenido de una idea propia
El cliente SHALL permitir editar `titulo`, `descripcion`, `problema` y `segmentoBeachhead` de una idea propia mediante `PATCH /ideas/{id}`, reutilizando el formulario de Signal Forms con los valores actuales. El formulario NO SHALL exponer ningún control para fijar el `estado` a `go`, `pivote` o `kill`: esas transiciones provienen del veredicto aprobado (E6). Un `422 VALIDACION_FALLIDA` MUST mostrarse campo a campo; un `403 ACCESO_DENEGADO` como acceso denegado.

#### Scenario: Edición de contenido
- **WHEN** el usuario guarda cambios en el `problema` de una idea suya
- **THEN** el cliente hace `PATCH /ideas/{id}` y refleja la idea actualizada

#### Scenario: El veredicto no es editable
- **WHEN** el usuario está en el formulario de edición
- **THEN** no existe ningún control para fijar el `estado` a `go`, `pivote` o `kill`

### Requirement: Archivar una idea conservando su evidencia
El cliente SHALL ofrecer, sobre una idea propia activa, la acción de archivar vía `POST /ideas/{id}/archivar`, tras la cual la idea MUST reflejarse en estado `archivada`. La acción MUST comunicar que no elimina la idea ni su evidencia. Un `403 ACCESO_DENEGADO` MUST mostrarse como acceso denegado.

#### Scenario: Archivado exitoso
- **WHEN** el usuario archiva una idea suya
- **THEN** el cliente hace `POST /ideas/{id}/archivar` y muestra la idea en estado `archivada`

### Requirement: Reabrir (desarchivar) una idea archivada
El cliente SHALL ofrecer, sobre una idea `archivada`, la acción de desarchivar vía `POST /ideas/{id}/desarchivar`, tras la cual la idea MUST reflejarse en un estado activo (`borrador`). La acción de desarchivar SHALL ofrecerse **solo** cuando la idea está `archivada`. Un `409 CONFLICTO` (la idea no estaba archivada) MUST traducirse a un mensaje claro sin romper la vista; un `403 ACCESO_DENEGADO` como acceso denegado.

#### Scenario: Reapertura exitosa
- **WHEN** el usuario desarchiva una idea suya en estado `archivada`
- **THEN** el cliente hace `POST /ideas/{id}/desarchivar` y muestra la idea en estado `borrador`

#### Scenario: La idea no estaba archivada
- **WHEN** `POST /ideas/{id}/desarchivar` responde `409 CONFLICTO`
- **THEN** el cliente muestra un mensaje que explica que la idea no está archivada, sin romper la vista

