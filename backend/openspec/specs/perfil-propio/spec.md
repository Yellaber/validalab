# perfil-propio Specification

## Purpose
TBD - created by archiving change usuarios-auth. Update Purpose after archive.
## Requirements
### Requirement: Consultar el perfil propio
El sistema SHALL permitir a un usuario autenticado consultar su propio perfil sin recibir un `id`: el usuario se resuelve a partir del token. La respuesta SHALL ser el recurso `Usuario` del solicitante.

#### Scenario: Perfil del usuario autenticado
- **WHEN** un usuario autenticado solicita `GET /usuarios/yo`
- **THEN** la respuesta es `200` con el `Usuario` correspondiente al `sub` del token

#### Scenario: Sin autenticación
- **WHEN** se solicita `GET /usuarios/yo` sin token válido
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Editar el perfil propio
El sistema SHALL permitir a un usuario autenticado actualizar únicamente su `nombre`. El sistema NO SHALL permitir cambiar el `rol` ni el `estado` por esta vía. La respuesta SHALL ser el `Usuario` actualizado.

#### Scenario: Cambio de nombre válido
- **WHEN** un usuario autenticado envía `PATCH /usuarios/yo` con un `nombre` no vacío
- **THEN** la respuesta es `200` con el `Usuario` y el `nombre` actualizado

#### Scenario: Intento de cambiar rol o estado
- **WHEN** la petición de edición de perfil incluye `rol` o `estado`
- **THEN** esos campos se ignoran y el `rol`/`estado` del usuario no cambian

#### Scenario: Nombre inválido
- **WHEN** se envía `PATCH /usuarios/yo` con un `nombre` vacío
- **THEN** la respuesta es `VALIDACION_FALLIDA`

