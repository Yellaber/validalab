## ADDED Requirements

### Requirement: Protección de rutas por sesión
El cliente SHALL separar las rutas públicas (`/login`, `/registro`) de las rutas protegidas (el shell autenticado y sus hijos). Una ruta protegida SHALL exigir una sesión válida: sin ella, el cliente SHALL redirigir a `/login`. El chunk de una ruta protegida NO SHALL cargarse para un usuario sin sesión.

#### Scenario: Acceso sin sesión a una ruta protegida
- **WHEN** un usuario no autenticado navega a una ruta protegida
- **THEN** el cliente lo redirige a `/login` y no activa la ruta protegida

#### Scenario: Acceso con sesión válida
- **WHEN** un usuario autenticado navega a una ruta protegida
- **THEN** el cliente activa la ruta y muestra su contenido dentro del shell

### Requirement: Redirección del usuario ya autenticado fuera de las rutas públicas
El cliente SHALL impedir que un usuario con sesión válida permanezca en `/login` o `/registro`, redirigiéndolo al shell autenticado.

#### Scenario: Usuario autenticado abre el login
- **WHEN** un usuario ya autenticado navega a `/login` o `/registro`
- **THEN** el cliente lo redirige a la pantalla de inicio del shell

### Requirement: Shell autenticado con identidad y cierre de sesión
El cliente SHALL presentar, para el usuario autenticado, un shell con un `<router-outlet>` para las rutas de dominio, que muestre la identidad del usuario en sesión (al menos su `nombre` o `email`) y ofrezca la acción de cerrar sesión.

#### Scenario: El shell muestra la identidad y permite cerrar sesión
- **WHEN** el usuario autenticado está en el shell
- **THEN** ve su `nombre` o `email` y un control para cerrar sesión
- **AND** al cerrar sesión se le redirige a la pantalla pública

#### Scenario: Página de inicio de marcador de posición
- **WHEN** el usuario autenticado entra al shell
- **THEN** ve una página de inicio mínima (marcador de posición del futuro portafolio de ideas) renderizada en el `<router-outlet>`
