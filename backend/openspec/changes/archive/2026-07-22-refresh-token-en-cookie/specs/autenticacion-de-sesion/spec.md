## MODIFIED Requirements

### Requirement: Inicio de sesión y emisión de tokens
El sistema SHALL autenticar con `email` y `password` mediante un endpoint público y, si las credenciales son válidas y la cuenta está `activo`, SHALL devolver un `TokenRespuesta` con `accessToken` (JWT con claims `sub` = id del usuario y `rol`), `tokenTipo` `Bearer`, `expiraEn` en segundos y el `Usuario`. El `refreshToken` NO SHALL incluirse en el cuerpo: SHALL entregarse en una cookie `HttpOnly; Secure; SameSite=Strict` con `Path` acotado a las rutas de sesión. Las credenciales inválidas NO SHALL revelar si falló el email o la contraseña.

#### Scenario: Credenciales válidas
- **WHEN** se hace login con email y contraseña correctos de una cuenta activa
- **THEN** la respuesta es `200` con `accessToken`, `tokenTipo: "Bearer"`, `expiraEn` y el `Usuario`
- **AND** el cuerpo NO contiene `refreshToken`
- **AND** la respuesta incluye una cabecera `Set-Cookie` con el refresh token marcado `HttpOnly`, `Secure` (según configuración) y `SameSite=Strict`
- **AND** el `accessToken` es aceptado por el guard de autenticación en peticiones protegidas

#### Scenario: Credenciales inválidas
- **WHEN** se hace login con un email inexistente o una contraseña incorrecta
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`, sin distinguir cuál de los dos falló
- **AND** no se emite ninguna cookie de sesión

#### Scenario: Cuenta suspendida
- **WHEN** una cuenta con estado `suspendido` intenta iniciar sesión con credenciales correctas
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Renovación con rotación del refresh token
El sistema SHALL intercambiar el refresh token de la **cookie** por un `TokenRespuesta` nuevo mediante un endpoint público, sin recibir cuerpo, y SHALL **rotar** el refresh token: el token usado queda invalidado y se emite uno nuevo, entregado en una `Set-Cookie` rotada. Una cookie ausente, o un refresh token inválido, expirado o ya revocado, SHALL producir `401`.

#### Scenario: Refresh válido
- **WHEN** se hace `POST /usuarios/refresh` con la cookie de un refresh token válido y vigente
- **THEN** la respuesta es `200` con un `TokenRespuesta` nuevo (sin `refreshToken` en el cuerpo)
- **AND** la respuesta incluye una `Set-Cookie` con el refresh token rotado
- **AND** el refresh token anterior deja de ser válido para futuras renovaciones

#### Scenario: Refresh sin cookie o inválido
- **WHEN** se hace `POST /usuarios/refresh` sin cookie de refresh, o con una inexistente, expirada o ya revocada
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Cierre de sesión
El sistema SHALL permitir cerrar sesión leyendo el refresh token de la **cookie**, sin recibir cuerpo y sin exigir un access token válido (endpoint basado en la cookie). El refresh token revocado NO SHALL volver a servir para renovar, y la cookie SHALL limpiarse en la respuesta. La operación SHALL ser idempotente.

#### Scenario: Logout válido
- **WHEN** se hace `POST /usuarios/logout` con la cookie de un refresh token vigente
- **THEN** la respuesta es `204`
- **AND** ese refresh token ya no puede renovarse en `/usuarios/refresh`
- **AND** la respuesta limpia la cookie de refresh (expiración inmediata)

#### Scenario: Logout sin sesión válida
- **WHEN** se hace `POST /usuarios/logout` sin cookie de refresh o con una ya revocada
- **THEN** la respuesta es `204` igualmente y la cookie queda limpiada
