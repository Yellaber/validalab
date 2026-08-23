# cliente-http-y-errores Specification

## Purpose
TBD - created by archiving change cimientos-y-autenticacion. Update Purpose after archive.
## Requirements
### Requirement: Capa HTTP configurada por entorno
El cliente SHALL enviar toda petición al backend usando una `baseUrl` definida por configuración de entorno, sin URLs absolutas cableadas en los servicios. El `HttpClient` SHALL registrarse con sus interceptores en la configuración de la aplicación.

#### Scenario: La base de la API proviene del entorno
- **WHEN** un servicio del cliente realiza una petición al backend
- **THEN** la URL se construye anteponiendo la `baseUrl` del entorno activo al path del contrato (p. ej. `/usuarios/login`)
- **AND** ningún servicio contiene el host del backend escrito a mano

### Requirement: Traducción del sobre de error del backend
El cliente SHALL convertir toda respuesta de error del backend en un `ErrorApi` tipado que preserve el `codigo` estable del catálogo `CodigoError`, el `mensaje` y los `detalles` campo a campo cuando existan. La UI SHALL poder ramificar su comportamiento sobre `codigo`; el `mensaje` es informativo.

#### Scenario: Error de dominio con sobre estándar
- **WHEN** el backend responde con un error `{ codigo, mensaje, detalles? }`
- **THEN** el interceptor lo entrega a la capa de aplicación como un `ErrorApi` con el mismo `codigo`, `mensaje` y `detalles`
- **AND** el `codigo` es uno de los valores del catálogo `CodigoError`

#### Scenario: Fallo de red o timeout sin sobre del backend
- **WHEN** la petición falla sin una respuesta de error del backend (red caída, timeout, respuesta no interpretable)
- **THEN** el cliente entrega un `ErrorApi` con un `codigo` sintético de red estable (distinto de `ERROR_INTERNO`)
- **AND** la aplicación puede distinguir un fallo de conectividad de un error de servidor

#### Scenario: Los detalles de validación llegan campo a campo
- **WHEN** el backend responde `VALIDACION_FALLIDA` con `detalles` por campo
- **THEN** el `ErrorApi` conserva la lista de `detalles` (`campo`, `problema`) para que la UI la muestre junto al campo correspondiente

