## 1. Schemas de dominio del módulo usuarios

- [x] 1.1 Añadir a `components.schemas` el schema `Usuario` (`id` uuid, `email`, `nombre`, `rol`, `estado`, `fechaCreacion`) sin campo de contraseña/hash
- [x] 1.2 Añadir los enums `Rol` (`validador`|`administrador`) y `EstadoUsuario` (`activo`|`suspendido`)
- [x] 1.3 Añadir los requests: `RegistroUsuarioRequest`, `LoginRequest`, `RefrescarTokenRequest`, `ActualizarPerfilRequest`, `CambiarRolRequest`, `CambiarEstadoRequest`
- [x] 1.4 Añadir el response `TokenRespuesta` (`accessToken`, `refreshToken`, `tokenTipo`, `expiraEn`, `usuario`)

## 2. Endpoints públicos y de sesión (registro, login, refresh, logout)

- [x] 2.1 Definir `POST /usuarios/registro` con `security: []`, tag `usuarios`, `201` → `Usuario`, errores `409`/`422`
- [x] 2.2 Definir `POST /usuarios/login` con `security: []`, tag `usuarios`, `200` → `TokenRespuesta`, error `401`
- [x] 2.3 Definir `POST /usuarios/refresh` con `security: []`, `RefrescarTokenRequest` → `200` `TokenRespuesta`, error `401`
- [x] 2.4 Definir `POST /usuarios/logout` (autenticado, `RefrescarTokenRequest`) → `204` sin contenido, `401` sin token

## 3. Endpoints del perfil propio

- [x] 3.1 Definir `GET /usuarios/yo` (autenticado) → `200` `Usuario`, `401` sin token
- [x] 3.2 Definir `PATCH /usuarios/yo` con `ActualizarPerfilRequest` → `200` `Usuario` (no permite cambiar rol/estado)

## 4. Endpoints de administración (RBAC administrador)

- [x] 4.1 Definir `GET /usuarios` paginado (`pagina`/`porPagina`) → `RespuestaPaginada` de `Usuario`, con nota RBAC y `403`
- [x] 4.2 Definir `GET /usuarios/{id}` → `200` `Usuario`, `404`, `403`
- [x] 4.3 Definir `PATCH /usuarios/{id}/rol` con `CambiarRolRequest` → `200` `Usuario`, `403`, `404`
- [x] 4.4 Definir `PATCH /usuarios/{id}/estado` con `CambiarEstadoRequest` → `200` `Usuario`, `403`, `404`
- [x] 4.5 Documentar en la `description` de cada endpoint de administración la restricción de rol `administrador`

## 5. Verificación

- [x] 5.1 Validar que el OpenAPI sigue siendo válido y parseable tras los cambios
- [x] 5.2 Confirmar que ningún response del módulo expone contraseña/hash (schema `Usuario` sin ese campo)
- [x] 5.3 Confirmar que los endpoints públicos llevan `security: []` y el resto heredan `bearerAuth`
- [x] 5.4 Confirmar que sigue siendo un único documento (solo se tocó `paths` del tag `usuarios` y `components.schemas`)
