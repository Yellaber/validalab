## ADDED Requirements

### Requirement: Inicio de sesión y emisión de tokens
El sistema SHALL autenticar con `email` y `password` mediante un endpoint público y, si las credenciales son válidas y la cuenta está `activo`, SHALL devolver un `TokenRespuesta` con `accessToken` (JWT con claims `sub` = id del usuario y `rol`), `refreshToken`, `tokenTipo` `Bearer`, `expiraEn` en segundos y el `Usuario`. Las credenciales inválidas NO SHALL revelar si falló el email o la contraseña.

#### Scenario: Credenciales válidas
- **WHEN** se hace login con email y contraseña correctos de una cuenta activa
- **THEN** la respuesta es `200` con `accessToken`, `refreshToken`, `tokenTipo: "Bearer"`, `expiraEn` y el `Usuario`
- **AND** el `accessToken` es aceptado por el guard de autenticación en peticiones protegidas

#### Scenario: Credenciales inválidas
- **WHEN** se hace login con un email inexistente o una contraseña incorrecta
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`, sin distinguir cuál de los dos falló

#### Scenario: Cuenta suspendida
- **WHEN** una cuenta con estado `suspendido` intenta iniciar sesión con credenciales correctas
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Renovación con rotación del refresh token
El sistema SHALL intercambiar un `refreshToken` válido por un `TokenRespuesta` nuevo mediante un endpoint público, y SHALL **rotar** el refresh token: el token usado queda invalidado y se emite uno nuevo. Un `refreshToken` inválido, expirado o ya revocado SHALL producir `401`.

#### Scenario: Refresh válido
- **WHEN** se envía un `refreshToken` válido y vigente a `/usuarios/refresh`
- **THEN** la respuesta es `200` con un `TokenRespuesta` nuevo
- **AND** el `refreshToken` anterior deja de ser válido para futuras renovaciones

#### Scenario: Refresh inválido
- **WHEN** se envía un `refreshToken` inexistente, expirado o ya revocado
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Almacenamiento seguro de los refresh tokens
El sistema SHALL almacenar los refresh tokens de forma que un volcado de la base de datos no permita reutilizarlos: NO SHALL guardar el token en claro, sino una representación irreversible (hash). El token en claro solo SHALL entregarse al cliente en el momento de su emisión.

#### Scenario: El refresh token no se guarda en claro
- **WHEN** se emite un refresh token en login o refresh
- **THEN** en la base de datos solo queda almacenado su hash, no el valor en claro

### Requirement: Cierre de sesión
El sistema SHALL permitir cerrar sesión a un usuario autenticado invalidando el `refreshToken` presentado, que NO SHALL volver a servir para renovar.

#### Scenario: Logout válido
- **WHEN** un usuario autenticado hace logout enviando un `refreshToken` vigente
- **THEN** la respuesta es `204`
- **AND** ese `refreshToken` ya no puede renovarse en `/usuarios/refresh`
