## Why

El contrato de API (`contrato-api/openapi.yaml`) tiene la estructura y las convenciones transversales, pero `paths: {}` está vacío. El camino crítico del MVP empieza por la épica **E0 (cuentas y aislamiento)**: sin registro, autenticación y RBAC no hay sobre quién colgar ideas, contactos ni entrevistas. Definir primero el contrato del módulo `usuarios` desbloquea a frontend y backend para construir E0 contra una misma definición, sin acoplarse entre sí.

## What Changes

- **Definir el contrato del módulo `usuarios`** dentro del documento único, bajo el `tag` `usuarios`: endpoints de registro, login, **renovación de token (refresh) y cierre de sesión (logout)**, perfil propio (`/usuarios/yo`) y gestión de cuentas/roles/estado por administrador.
- **Añadir los schemas de dominio** del módulo a `components.schemas`: `Usuario` (sin credenciales), `Rol`, `EstadoUsuario`, y los payloads de request/response (`RegistroUsuarioRequest`, `LoginRequest`, `TokenRespuesta` —con `accessToken` y `refreshToken`—, `RefrescarTokenRequest`, `ActualizarPerfilRequest`, `CambiarRolRequest`, `CambiarEstadoRequest`).
- **Reflejar el aislamiento multi-tenant (RNF-04/05, RF-02)** en el contrato: el `owner_id`/identidad sale del token; un `validador` solo accede a su propio perfil; el listado y la gestión de cuentas requieren rol `administrador` (RBAC).
- **Respetar las convenciones ya definidas:** `bearerAuth` global (con endpoints públicos marcados `security: []`), sobre `Error`/`CodigoError`, paginación `pagina`/`porPagina`, nombres en español camelCase y rutas en plural kebab-case.

## Capabilities

### New Capabilities
- `usuarios`: Cuentas y acceso de ValidaLab (épica E0) — registro y autenticación de usuarios, consulta/edición del perfil propio, gestión de cuentas y roles por administrador (RBAC), y la regla de aislamiento multi-tenant que impide a un usuario ver datos de otro. La expresión de esta capacidad es el detalle del `tag` `usuarios` en el contrato de API.

### Modified Capabilities
<!-- `contrato-api` no cambia: este detalle se añade respetando sus reglas, no las modifica. -->

## Impact

- **`contrato-api/openapi.yaml`:** se llenan los `paths` del `tag` `usuarios` y se añaden los schemas de dominio del módulo. No se tocan otros módulos.
- **Convenciones:** se reutilizan los componentes existentes (`bearerAuth`, `Error`, `CodigoError`, parámetros de paginación); este cambio no introduce convenciones nuevas.
- **Equipos:** frontend (pantallas de registro/login/cuenta) y backend (módulo NestJS `usuarios`, auth, guardas RBAC) ya pueden desarrollar E0 contra el contrato.
- **Fuera de alcance:** no se implementa código de runtime (NestJS/Angular); el cableado de auth, hashing de contraseñas y persistencia se hará en cambios posteriores.
