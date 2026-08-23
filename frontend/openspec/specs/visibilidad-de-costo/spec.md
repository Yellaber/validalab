# visibilidad-de-costo Specification

## Purpose
TBD - created by archiving change visibilidad-de-costo. Update Purpose after archive.
## Requirements
### Requirement: Servicio de recurso del costo contra el contrato
El cliente SHALL exponer un servicio inyectable de costo que encapsule las llamadas HTTP de solo lectura del tag `proveedores` relativas al costo estimado (`GET /costo`, `GET /ideas/{id}/costo`, `GET /proveedores/precios`). El servicio MUST derivar los tipos del contrato (`CostoUsuario`, `CostoIdea`, `DesgloseCostoTarea`, `CostoIdeaResumen`, `PrecioModelo`) y NUNCA MUST derivar ni recalcular costos: los presenta tal como los calcula el servidor. El servicio MUST apoyarse en la plomería HTTP del E0 (interceptor de autorización y traducción del sobre `Error` a `ErrorApi`) sin reimplementarla.

#### Scenario: Las operaciones usan las rutas del contrato
- **WHEN** un componente invoca el costo del usuario, el de una idea o la tabla de precios
- **THEN** el servicio emite la petición HTTP a la ruta y método correspondientes del tag `proveedores`

### Requirement: Ver el costo estimado total del usuario
El cliente SHALL presentar el costo estimado total del usuario consumiendo `GET /costo`, mostrando el `costoEstimadoTotal` con su `moneda`, el desglose `costoPorIdea` (cada idea enlazada a su costo detallado) y la tabla de precios (`GET /proveedores/precios`) como referencia. El cliente MUST comunicar los estados de carga y error, ramificando por el `codigo` estable del `ErrorApi`.

#### Scenario: Costo total con desglose por idea
- **WHEN** el usuario abre la vista de costo
- **THEN** el cliente hace `GET /costo` y muestra el total y el costo por idea, cada uno enlazado a su detalle

#### Scenario: La tabla de precios se muestra como referencia
- **WHEN** el usuario abre la vista de costo
- **THEN** el cliente muestra la tabla de precios por modelo (entrada, salida y, si aplica, entrada cacheada) con su moneda

#### Scenario: Fallo al cargar el costo
- **WHEN** `GET /costo` falla
- **THEN** el cliente muestra un estado de error con opción de reintentar, sin romper la vista

### Requirement: Ver el costo estimado de una idea
El cliente SHALL presentar el costo estimado de una idea propia consumiendo `GET /ideas/{id}/costo`, mostrando el `costoEstimadoTotal` y el desglose por tarea (`scoring`/`veredicto`) con sus llamadas, tokens de entrada/salida y costo, con el nombre legible de cada tarea. Un `403 ACCESO_DENEGADO` MUST mostrarse como acceso denegado sin revelar datos; un `404 RECURSO_NO_ENCONTRADO` como idea inexistente.

#### Scenario: Costo de una idea con desglose por tarea
- **WHEN** el usuario abre el costo de una idea suya
- **THEN** el cliente hace `GET /ideas/{id}/costo` y muestra el total y el desglose por tarea

#### Scenario: Idea ajena
- **WHEN** `GET /ideas/{id}/costo` responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra un mensaje de acceso denegado sin revelar datos de la idea

### Requirement: Comunicar que el costo es un estimado, no el saldo
El cliente SHALL presentar el costo siempre como un **estimado del consumo vía ValidaLab**, NUNCA como el saldo de la cuenta del proveedor (RNF-17), mostrando la `aclaracion` normativa que acompaña al costo. Cuando exista `urlFacturacion`, el cliente MUST ofrecer un enlace al panel de facturación del proveedor para recargar saldo (RF-22g), dejando claro que el saldo solo es visible allí.

#### Scenario: Se muestra la aclaración normativa
- **WHEN** el cliente presenta el costo del usuario o de una idea
- **THEN** muestra la `aclaracion` que aclara que es un estimado del consumo vía ValidaLab, no el saldo

#### Scenario: Enlace para recargar en el proveedor
- **WHEN** el costo trae `urlFacturacion`
- **THEN** el cliente ofrece un enlace al panel de facturación del proveedor para recargar saldo

