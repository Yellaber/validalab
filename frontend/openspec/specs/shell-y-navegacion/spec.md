# shell-y-navegacion Specification

## Purpose
Estructura de navegación del cliente Angular: la separación entre rutas públicas (`/login`, `/registro`) y protegidas, el shell autenticado que las aloja, y la protección de acceso por sesión. Define qué exige una ruta protegida (sesión válida, o redirección a `/login`), que sus chunks no se carguen para un usuario sin sesión, que un usuario ya autenticado no permanezca en las rutas públicas, y que el shell muestre la identidad en sesión y ofrezca cerrar sesión. Es el armazón sobre el que cuelgan las rutas de dominio con carga diferida; el **contenido** de cada pantalla lo especifican sus propias capacidades (`portafolio-de-ideas`, `hipotesis-y-umbrales`). La mecánica de la sesión (tokens, renovación, rehidratación) vive en `sesion-cliente`.

## Requirements
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
El cliente SHALL presentar, para el usuario autenticado, un shell con un `<router-outlet>` para las rutas de dominio, que muestre la identidad del usuario en sesión (al menos su `nombre` o `email`) y ofrezca la acción de cerrar sesión. La ruta por defecto del shell SHALL renderizar el **listado del portafolio de ideas** (no un marcador de posición). El shell SHALL alojar las rutas hijas protegidas del dominio `ideas` (listado, alta, detalle, edición, **hipótesis de una idea**, **umbrales de una idea**, **contactos de una idea** y **detalle de un contacto**) con carga diferida, de modo que sus chunks no se carguen para un usuario sin sesión.

#### Scenario: El shell muestra la identidad y permite cerrar sesión
- **WHEN** el usuario autenticado está en el shell
- **THEN** ve su `nombre` o `email` y un control para cerrar sesión
- **AND** al cerrar sesión se le redirige a la pantalla pública

#### Scenario: La ruta por defecto es el portafolio de ideas
- **WHEN** el usuario autenticado entra al shell por su ruta por defecto
- **THEN** ve el listado de su portafolio de ideas renderizado en el `<router-outlet>`, no un marcador de posición

#### Scenario: Las rutas de ideas cuelgan del shell con carga diferida
- **WHEN** el usuario autenticado navega a una ruta del dominio `ideas` (p. ej. alta o detalle)
- **THEN** el cliente activa la ruta hija dentro del shell cargando su chunk de forma diferida

#### Scenario: Las rutas anidadas de una idea cuelgan del shell
- **WHEN** el usuario autenticado navega a las hipótesis o a los umbrales de una idea
- **THEN** el cliente activa la ruta hija correspondiente dentro del shell cargando su chunk de forma diferida

#### Scenario: Las rutas de contactos cuelgan del shell
- **WHEN** el usuario autenticado navega al listado de contactos de una idea o al detalle de uno de ellos
- **THEN** el cliente activa la ruta hija correspondiente dentro del shell cargando su chunk de forma diferida

