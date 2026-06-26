# usuarios

## Purpose

Cuentas y acceso de ValidaLab (épica E0): registro y autenticación de usuarios, renovación de token y cierre de sesión, consulta/edición del perfil propio, gestión de cuentas/roles/estado por administrador (RBAC), y la regla de aislamiento multi-tenant que impide a un usuario ver datos de otro. Esta capacidad se expresa como el detalle del `tag` `usuarios` en el contrato de API único (`contrato-api/openapi.yaml`); su cumplimiento en runtime (auth, hashing, guardas RBAC, persistencia) se aborda en cambios posteriores.

## Requirements

### Requirement: Registro de usuario
El contrato SHALL definir un endpoint público de registro que crea una cuenta nueva con `email`, `nombre` y `password`. El endpoint MUST anular la seguridad global (`security: []`) por ser previo a la autenticación. La respuesta exitosa MUST devolver el recurso `Usuario` (sin credenciales) y MUST asignar por defecto el rol `validador` y el estado `activo`. Un `email` ya registrado MUST devolver `409 CONFLICTO`; un payload inválido MUST devolver `422 VALIDACION_FALLIDA`.

#### Scenario: Registro exitoso
- **WHEN** se hace `POST /usuarios/registro` con `email`, `nombre` y `password` válidos y el email no existe
- **THEN** el contrato responde `201` con un `Usuario` cuyo `rol` es `validador` y `estado` es `activo`
- **AND** la respuesta no incluye la contraseña ni ningún hash

#### Scenario: Email ya registrado
- **WHEN** se hace `POST /usuarios/registro` con un `email` que ya existe
- **THEN** el contrato responde `409` con el sobre `Error` y `codigo` `CONFLICTO`

#### Scenario: Payload inválido
- **WHEN** se hace `POST /usuarios/registro` con un email mal formado o sin contraseña
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA` y el detalle por campo

### Requirement: Autenticación de usuario (login)
El contrato SHALL definir un endpoint público de login que recibe `email` y `password` y, si son correctos, devuelve un `TokenRespuesta` con el JWT de acceso (`accessToken`), el token de renovación (`refreshToken`), su tipo (`Bearer`), su expiración y el `Usuario` autenticado. El endpoint MUST anular la seguridad global (`security: []`). Credenciales inválidas MUST devolver `401 NO_AUTENTICADO`.

#### Scenario: Login exitoso
- **WHEN** se hace `POST /usuarios/login` con `email` y `password` correctos de una cuenta activa
- **THEN** el contrato responde `200` con `TokenRespuesta` que incluye `accessToken`, `refreshToken`, `tokenTipo` `Bearer` y el `Usuario`

#### Scenario: Credenciales inválidas
- **WHEN** se hace `POST /usuarios/login` con contraseña incorrecta o email inexistente
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`
- **AND** la respuesta no distingue si el fallo fue por email o por contraseña

### Requirement: Renovación de token y cierre de sesión
El contrato SHALL definir un endpoint público `POST /usuarios/refresh` que recibe un `refreshToken` válido y devuelve un `TokenRespuesta` nuevo, y un endpoint autenticado `POST /usuarios/logout` que invalida el `refreshToken` de la sesión. `refresh` MUST anular la seguridad global (`security: []`) porque el `accessToken` puede haber expirado; un `refreshToken` inválido o expirado MUST devolver `401 NO_AUTENTICADO`. `logout` MUST requerir `bearerAuth` y responder `204` sin contenido.

#### Scenario: Renovación exitosa del token
- **WHEN** se hace `POST /usuarios/refresh` con un `refreshToken` válido
- **THEN** el contrato responde `200` con un `TokenRespuesta` nuevo (`accessToken` + `refreshToken`)

#### Scenario: Refresh token inválido o expirado
- **WHEN** se hace `POST /usuarios/refresh` con un `refreshToken` inválido o expirado
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

#### Scenario: Cierre de sesión
- **WHEN** un usuario autenticado hace `POST /usuarios/logout` con su `refreshToken`
- **THEN** el contrato responde `204` sin contenido
- **AND** ese `refreshToken` deja de ser válido para renovar

#### Scenario: Logout sin token
- **WHEN** se hace `POST /usuarios/logout` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Perfil del usuario autenticado
El contrato SHALL definir endpoints para que el usuario autenticado consulte (`GET /usuarios/yo`) y actualice (`PATCH /usuarios/yo`) su propio perfil. La identidad MUST derivarse del token (`bearerAuth`), nunca de un parámetro de entrada. Sin token válido MUST devolver `401 NO_AUTENTICADO`. La respuesta MUST ser un `Usuario` sin credenciales.

#### Scenario: Consulta del perfil propio
- **WHEN** un usuario autenticado hace `GET /usuarios/yo`
- **THEN** el contrato responde `200` con su propio `Usuario`, resuelto a partir del token

#### Scenario: Actualización del perfil propio
- **WHEN** un usuario autenticado hace `PATCH /usuarios/yo` con un `nombre` nuevo
- **THEN** el contrato responde `200` con el `Usuario` actualizado
- **AND** el cuerpo no permite cambiar el `rol` ni el `estado` por esta ruta

#### Scenario: Sin token
- **WHEN** se hace `GET /usuarios/yo` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Gestión de cuentas y roles por administrador
El contrato SHALL definir endpoints de administración restringidos al rol `administrador` (RBAC): listar cuentas paginadas (`GET /usuarios`), consultar una cuenta (`GET /usuarios/{id}`), cambiar el rol (`PATCH /usuarios/{id}/rol`) y cambiar el estado de la cuenta (`PATCH /usuarios/{id}/estado`). El listado MUST usar los parámetros `pagina`/`porPagina` y devolver el sobre `RespuestaPaginada` de `Usuario`. Un usuario con rol `validador` que invoque cualquiera de estos endpoints MUST recibir `403 ACCESO_DENEGADO`.

#### Scenario: Administrador lista cuentas
- **WHEN** un `administrador` hace `GET /usuarios?pagina=1&porPagina=20`
- **THEN** el contrato responde `200` con `RespuestaPaginada` cuyos `datos` son `Usuario` y un bloque `paginacion`

#### Scenario: Validador intenta administrar
- **WHEN** un usuario con rol `validador` hace `GET /usuarios` o `PATCH /usuarios/{id}/rol`
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Administrador cambia el rol de una cuenta
- **WHEN** un `administrador` hace `PATCH /usuarios/{id}/rol` con un `rol` válido
- **THEN** el contrato responde `200` con el `Usuario` actualizado

#### Scenario: Cuenta inexistente
- **WHEN** un `administrador` hace `GET /usuarios/{id}` con un `id` que no existe
- **THEN** el contrato responde `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Aislamiento multi-tenant y no exposición de credenciales
El contrato SHALL garantizar que un usuario no pueda acceder a datos de otro: salvo los endpoints de administración (rol `administrador`), ningún endpoint del módulo expone cuentas ajenas; el acceso al perfil es siempre el propio vía `/usuarios/yo` resuelto por token. El schema `Usuario` MUST NOT incluir nunca la contraseña ni su hash en ninguna respuesta.

#### Scenario: El validador no puede leer la cuenta de otro
- **WHEN** un `validador` intenta acceder a la cuenta de otro usuario por una ruta de administración
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO` sin revelar datos de esa cuenta

#### Scenario: La contraseña nunca viaja en la respuesta
- **WHEN** cualquier endpoint del módulo devuelve un `Usuario`
- **THEN** el objeto no contiene campo de contraseña ni hash en ninguna circunstancia
