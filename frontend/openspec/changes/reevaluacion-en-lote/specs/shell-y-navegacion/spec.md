## MODIFIED Requirements

### Requirement: Shell autenticado con identidad y cierre de sesión
El cliente SHALL presentar, para el usuario autenticado, un shell con un `<router-outlet>` para las rutas de dominio, que muestre la identidad del usuario en sesión (al menos su `nombre` o `email`) y ofrezca la acción de cerrar sesión. La ruta por defecto del shell SHALL renderizar el **listado del portafolio de ideas** (no un marcador de posición). El shell SHALL alojar las rutas hijas protegidas del dominio `ideas` (listado, alta, detalle, edición, **hipótesis de una idea**, **umbrales de una idea**, **contactos de una idea**, **detalle de un contacto**, las cinco de **entrevistas de una idea** —listado, alta, detalle, edición y **re-evaluación en lote**—, las dos de **KPIs de una idea** —tablero y alertas—, las dos de **veredicto de una idea** —historial y detalle de un veredicto— y el **costo de una idea**) con carga diferida, de modo que sus chunks no se carguen para un usuario sin sesión. El shell SHALL alojar además, con la misma carga diferida, las rutas hijas protegidas de los dominios de primer nivel **`guiones`** (listado, alta, detalle y edición), **`configuracion`** (configuración BYOK del proveedor de IA) y **`costo`** (costo estimado total del usuario), que **no** cuelgan de ninguna idea.

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

#### Scenario: Las rutas de guiones cuelgan del shell
- **WHEN** el usuario autenticado navega al listado de guiones, al alta, al detalle de uno o a su edición
- **THEN** el cliente activa la ruta hija correspondiente dentro del shell cargando su chunk de forma diferida

#### Scenario: Las rutas de entrevistas cuelgan del shell
- **WHEN** el usuario autenticado navega al listado de entrevistas de una idea, al alta, al detalle de una, a su edición o a la re-evaluación en lote
- **THEN** el cliente activa la ruta hija correspondiente dentro del shell cargando su chunk de forma diferida

#### Scenario: Las rutas de KPIs cuelgan del shell
- **WHEN** el usuario autenticado navega al tablero de KPIs de una idea o a sus alertas
- **THEN** el cliente activa la ruta hija correspondiente dentro del shell cargando su chunk de forma diferida

#### Scenario: Las rutas de veredicto cuelgan del shell
- **WHEN** el usuario autenticado navega al historial de veredictos de una idea o al detalle de uno de ellos
- **THEN** el cliente activa la ruta hija correspondiente dentro del shell cargando su chunk de forma diferida

#### Scenario: La ruta de configuración BYOK cuelga del shell
- **WHEN** el usuario autenticado navega a la configuración del proveedor de IA
- **THEN** el cliente activa la ruta hija dentro del shell cargando su chunk de forma diferida

#### Scenario: Las rutas de costo cuelgan del shell
- **WHEN** el usuario autenticado navega al costo total del usuario o al costo de una idea
- **THEN** el cliente activa la ruta hija correspondiente dentro del shell cargando su chunk de forma diferida
