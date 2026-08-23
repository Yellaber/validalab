## ADDED Requirements

### Requirement: Registro de una cuenta desde el cliente
El cliente SHALL ofrecer un formulario de registro que envíe `email`, `nombre` y `password` a `POST /usuarios/registro`. Antes de enviar, el cliente SHALL validar que el email tenga formato válido, el nombre no esté vacío y la contraseña tenga al menos 8 caracteres. Un registro correcto SHALL dejar al usuario en condición de iniciar sesión.

#### Scenario: Registro válido
- **WHEN** el usuario envía un email bien formado, un nombre no vacío y una contraseña de al menos 8 caracteres
- **THEN** el cliente llama a `POST /usuarios/registro` y, ante `201`, informa el alta y encamina al login (o autentica) al usuario

#### Scenario: Email ya registrado
- **WHEN** el backend responde `409 CONFLICTO` al registrar
- **THEN** el formulario muestra que el email ya está en uso, sin perder los demás datos introducidos

#### Scenario: Validación local previa al envío
- **WHEN** algún campo no cumple (email inválido, nombre vacío o contraseña < 8)
- **THEN** el botón de envío permanece deshabilitado o el envío se bloquea, y se señala el campo inválido, sin llamar al backend

### Requirement: Autenticación e inicio de sesión
El cliente SHALL ofrecer un formulario de login que envíe `email` y `password` a `POST /usuarios/login` con las credenciales de cookie habilitadas. Ante una respuesta `200` con `TokenRespuesta`, el cliente SHALL guardar el `accessToken` **en memoria**, poblar el estado de sesión con el `usuario` devuelto y dar acceso a las rutas protegidas. El refresh token NO SHALL manejarse en el cliente: viaja en la cookie `HttpOnly` que fija el backend.

#### Scenario: Credenciales válidas
- **WHEN** el login responde `200` con `accessToken` y `usuario` (sin `refreshToken` en el cuerpo) y una cookie `HttpOnly` de refresh
- **THEN** el cliente guarda el `accessToken` en memoria, expone `estaAutenticado` como verdadero y el `usuario` en el estado de sesión
- **AND** el cliente no lee ni almacena el refresh token (lo gestiona el navegador como cookie `HttpOnly`)

#### Scenario: Credenciales inválidas o cuenta suspendida
- **WHEN** el login responde `401 NO_AUTENTICADO`
- **THEN** el formulario muestra que las credenciales no son válidas y no se guarda ningún token ni estado de sesión

### Requirement: Adjuntar el token y renovarlo de forma transparente
El cliente SHALL enviar sus peticiones al backend con las credenciales de cookie habilitadas (para que la cookie de refresh viaje) y SHALL adjuntar `Authorization: Bearer <accessToken>` cuando haya access token en memoria, sin adjuntarlo a los endpoints públicos (`registro`, `login`). Cuando una petición autenticada falle con `401` por token expirado, el cliente SHALL intentar **una sola** renovación vía `POST /usuarios/refresh` (sin cuerpo; la cookie `HttpOnly` viaja automáticamente) y reintentar la petición original; si la renovación falla, SHALL cerrar la sesión.

#### Scenario: Access token expirado se renueva y la petición se reintenta
- **WHEN** una petición autenticada recibe `401`
- **THEN** el cliente llama a `POST /usuarios/refresh` (sin cuerpo, con la cookie), y ante `200` guarda el nuevo `accessToken` en memoria y reintenta la petición original con él

#### Scenario: Cookie de refresh inválida cierra la sesión
- **WHEN** la renovación responde `401` (cookie ausente, expirada o revocada)
- **THEN** el cliente descarta el access token en memoria, vacía el estado de sesión y queda listo para redirigir al login

#### Scenario: Peticiones concurrentes comparten una renovación
- **WHEN** varias peticiones autenticadas reciben `401` casi a la vez
- **THEN** se ejecuta una única renovación y todas las peticiones se reintentan con el token renovado

### Requirement: Rehidratación de la sesión por silent refresh
El cliente NO SHALL persistir tokens en almacenamiento accesible por JavaScript (`localStorage`/`sessionStorage`): el access token vive solo en memoria y se pierde al recargar la página. Para que la sesión sobreviva al refresco, al arrancar la aplicación el cliente SHALL intentar un **silent refresh** (`POST /usuarios/refresh`, sin cuerpo, con la cookie `HttpOnly`) **antes** de activar las rutas; ante `200` SHALL restaurar el `accessToken` en memoria y el `usuario`; ante `401` SHALL tratar al usuario como no autenticado.

#### Scenario: La sesión sobrevive al refresco de página
- **WHEN** el usuario recarga la página teniendo la cookie de refresh vigente
- **THEN** el cliente obtiene, vía silent refresh al arrancar, un `accessToken` nuevo y el `usuario`, y mantiene el acceso sin volver a pedir credenciales

#### Scenario: Sin cookie válida al arrancar
- **WHEN** al arrancar, el silent refresh responde `401` (sin cookie o expirada)
- **THEN** el cliente no establece sesión y trata al usuario como no autenticado

#### Scenario: Ninguna credencial queda accesible a JavaScript
- **WHEN** la sesión está activa
- **THEN** ni el access token ni el refresh token se guardan en `localStorage`/`sessionStorage` (el access token está en memoria; el refresh token, en la cookie `HttpOnly`)

### Requirement: Cierre de sesión
El cliente SHALL ofrecer una acción de cierre de sesión que llame a `POST /usuarios/logout` (sin cuerpo, con la cookie), tras lo cual el backend invalida el refresh token y limpia la cookie. El cliente SHALL descartar el access token en memoria, vaciar el estado de sesión y encaminar al usuario a la pantalla pública.

#### Scenario: Cierre de sesión explícito
- **WHEN** el usuario cierra sesión
- **THEN** el cliente llama a `POST /usuarios/logout`, descarta el access token en memoria, `estaAutenticado` pasa a falso y se redirige a la pantalla pública
- **AND** aunque la llamada de logout falle en el servidor, el estado local de sesión se limpia igualmente
