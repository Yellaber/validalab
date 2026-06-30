# registro-de-cuenta Specification

## Purpose
TBD - created by archiving change usuarios-auth. Update Purpose after archive.
## Requirements
### Requirement: Alta de una cuenta nueva
El sistema SHALL permitir registrar una cuenta mediante un endpoint público con `email`, `nombre` y `password`. La cuenta nueva SHALL crearse con rol `validador` y estado `activo`. La contraseña SHALL almacenarse únicamente como hash; el sistema NUNCA SHALL persistir ni devolver la contraseña en claro. El `email` SHALL ser único entre las cuentas.

#### Scenario: Registro válido
- **WHEN** se envía un registro con email no usado, nombre no vacío y contraseña de al menos 8 caracteres
- **THEN** la respuesta es `201` con el recurso `Usuario` (rol `validador`, estado `activo`)
- **AND** el cuerpo no contiene la contraseña ni su hash

#### Scenario: Email ya registrado
- **WHEN** se intenta registrar un email que ya existe
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`

#### Scenario: Datos inválidos
- **WHEN** el registro llega con email mal formado, nombre vacío o contraseña de menos de 8 caracteres
- **THEN** la respuesta es `VALIDACION_FALLIDA` con el detalle del campo inválido

### Requirement: La cuenta nunca expone su credencial
El sistema NUNCA SHALL incluir el hash ni la contraseña de la cuenta en ninguna respuesta de la API, en ningún endpoint.

#### Scenario: El recurso Usuario está libre de credenciales
- **WHEN** cualquier endpoint devuelve un recurso `Usuario`
- **THEN** el objeto contiene `id`, `email`, `nombre`, `rol`, `estado` y `fechaCreacion`, y no contiene ningún campo de contraseña o hash

