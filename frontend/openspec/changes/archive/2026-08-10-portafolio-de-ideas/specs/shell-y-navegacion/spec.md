## MODIFIED Requirements

### Requirement: Shell autenticado con identidad y cierre de sesión
El cliente SHALL presentar, para el usuario autenticado, un shell con un `<router-outlet>` para las rutas de dominio, que muestre la identidad del usuario en sesión (al menos su `nombre` o `email`) y ofrezca la acción de cerrar sesión. La ruta por defecto del shell SHALL renderizar el **listado del portafolio de ideas** (no un marcador de posición). El shell SHALL alojar las rutas hijas protegidas del dominio `ideas` (listado, alta, detalle y edición) con carga diferida, de modo que sus chunks no se carguen para un usuario sin sesión.

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
