## Context

`contrato-api/openapi.yaml` existe como documento único con convenciones transversales (`bearerAuth`, `Error`/`CodigoError`, paginación, `RespuestaPaginada`) pero sin endpoints. Este cambio llena el `tag` `usuarios` (épica E0) como primer módulo del contrato. E0 es el cimiento del MVP: cuentas, autenticación, RBAC y aislamiento multi-tenant (RF-00, RF-02, RF-23, RNF-04/05). Actores del SRS: `Validador` (usuario primario) y `Administrador` (gestión de cuentas y roles).

## Goals / Non-Goals

**Goals:**
- Definir en el contrato los endpoints y schemas del módulo `usuarios` reutilizando las convenciones ya existentes.
- Expresar en el contrato la autenticación JWT, el RBAC (`validador` vs `administrador`) y el aislamiento.
- Mantener el contrato como un único documento (solo se añade bajo el `tag` `usuarios` y en `components.schemas`).

**Non-Goals:**
- **No** se implementa runtime (módulo NestJS, guardas, hashing, persistencia, pantallas Angular).
- **No** se definen otros módulos (`ideas`, `contactos`, …).
- **No** se diseña recuperación/cambio de contraseña en este cambio (se puede añadir luego sin romper lo definido). La renovación de token (refresh) y el cierre de sesión (logout) **sí** entran en alcance.

## Decisions

### Decisión 1: Endpoints del módulo
- Públicos (`security: []`): `POST /usuarios/registro`, `POST /usuarios/login`, `POST /usuarios/refresh`.
- Autenticado (cualquier rol): `GET /usuarios/yo`, `PATCH /usuarios/yo`, `POST /usuarios/logout`.
- Solo `administrador` (RBAC): `GET /usuarios` (paginado), `GET /usuarios/{id}`, `PATCH /usuarios/{id}/rol`, `PATCH /usuarios/{id}/estado`.
- **Por qué `/usuarios/yo` y no `/usuarios/{id}` para el perfil propio:** la identidad sale del token; evita que el cliente pase un `id` y refuerza el aislamiento. `/usuarios/{id}` queda reservado a administración.
- **`POST /usuarios/refresh` es público (`security: []`):** no exige un `accessToken` válido (que puede haber expirado), sino un `refreshToken` válido en el cuerpo; devuelve un `TokenRespuesta` nuevo. Un `refreshToken` inválido/expirado → `401 NO_AUTENTICADO`.
- **`POST /usuarios/logout` es autenticado:** invalida el `refreshToken` de la sesión (lo recibe en el cuerpo) y responde `204` sin contenido. La invalidación efectiva es de runtime (lista de revocación/rotación), fuera de alcance aquí.

### Decisión 2: Roles y estado
- `Rol`: enum `validador` | `administrador`. Registro asigna `validador` por defecto.
- `EstadoUsuario`: enum `activo` | `suspendido`. El administrador lo cambia; una cuenta `suspendido` no debería autenticarse (regla a aplicar en runtime; el contrato expone el estado).
- **Alternativa considerada — RBAC con lista de permisos:** sobredimensionado para E0; dos roles cubren el SRS. Se puede extender el enum sin romper el contrato.

### Decisión 3: Schemas de dominio (en `components.schemas`)
- `Usuario`: `id` (uuid), `email`, `nombre`, `rol`, `estado`, `fechaCreacion`. **Nunca** contraseña/hash.
- Requests: `RegistroUsuarioRequest` (`email`, `nombre`, `password`), `LoginRequest` (`email`, `password`), `RefrescarTokenRequest` (`refreshToken`), `ActualizarPerfilRequest` (`nombre`), `CambiarRolRequest` (`rol`), `CambiarEstadoRequest` (`estado`).
- Response de login y refresh: `TokenRespuesta` (`accessToken`, `refreshToken`, `tokenTipo` = `Bearer`, `expiraEn` en segundos, `usuario`).
- **Por qué un schema `Usuario` único reutilizable:** una sola forma del recurso para todas las respuestas, garantizando que la contraseña nunca aparezca por construcción.

### Decisión 4: Mapeo de errores al catálogo existente
- Email duplicado → `409 CONFLICTO`. Validación → `422 VALIDACION_FALLIDA`. Login fallido / sin token → `401 NO_AUTENTICADO`. Rol insuficiente → `403 ACCESO_DENEGADO`. Recurso ausente → `404 RECURSO_NO_ENCONTRADO`.
- Se reutilizan las `responses` compartidas (`NoAutenticado`, `AccesoDenegado`, `NoEncontrado`, `ValidacionFallida`); no se añaden códigos nuevos al catálogo.

### Decisión 5: Cómo se expresa el RBAC y el aislamiento en OpenAPI
- Todos los endpoints heredan `bearerAuth`; los públicos lo anulan con `security: []`.
- La restricción por rol no es nativa de OpenAPI: se documenta en la `description` de cada endpoint de administración y se cubre con la respuesta `403 ACCESO_DENEGADO`. La verificación real es de runtime (guarda RBAC), fuera de alcance aquí.

## Risks / Trade-offs

- **[OpenAPI no fuerza el RBAC]** El contrato no puede *imponer* el rol, solo describirlo. → Se documenta explícitamente por endpoint + respuesta `403`; el guard de runtime lo hará cumplir en un cambio posterior.
- **[Estado `suspendido` y login]** El contrato expone `estado` pero el bloqueo de login es conductual. → Se nota en la `description`; el escenario de login asume "cuenta activa".
- **[Crecimiento del documento único]** Añadir paths agranda `openapi.yaml`. → Esperado y aceptable: no afecta a `CLAUDE.md` (que solo indexa); la navegación por `tag` lo mantiene manejable.

## Open Questions

- Ninguna pendiente. Resueltas: (1) **sí** se incluye `PATCH /usuarios/{id}/estado` en el contrato ahora (parte de "gestionar cuentas", RF-23), aunque su runtime venga después; (2) **sí** se incluyen `POST /usuarios/refresh` y `POST /usuarios/logout`, con `TokenRespuesta` ampliado con `refreshToken`. Queda fuera solo la recuperación/cambio de contraseña.
