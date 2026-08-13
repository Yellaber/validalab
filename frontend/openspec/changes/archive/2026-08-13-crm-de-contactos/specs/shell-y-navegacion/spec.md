## MODIFIED Requirements

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
