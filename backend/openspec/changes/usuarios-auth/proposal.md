## Why

La fundación E0 entrega la plomería transversal pero **no hay ningún endpoint de dominio ni forma de autenticarse**: el `JwtAuthGuard` verifica tokens que todavía nadie emite. Sin cuentas y sesiones, ningún otro módulo (`ideas`, `contactos`…) puede existir, porque todo cuelga de un `Usuario` y se aísla por su `owner_id`. Este change abre el camino crítico del MVP entregando el primer corte vertical de dominio: registrarse, autenticarse y gestionar el perfil propio.

## What Changes

- **Entidad `Usuario`** (TypeORM) con `email` único, `nombre`, `rol`, `estado`, `fechaCreacion` y un `passwordHash` que **nunca** se serializa ni se devuelve. Migración de la tabla `usuarios`.
- **Registro** (`POST /usuarios/registro`, público): crea la cuenta con rol `validador` y estado `activo`, hashea la contraseña; email duplicado → `409 CONFLICTO`.
- **Autenticación de sesión**: `login` y `refresh` (públicos) devuelven `TokenRespuesta` (accessToken JWT + refreshToken); `logout` (autenticado) invalida el refreshToken. El **accessToken se firma** con expiración y claims `{ sub, rol }` (estrenando, ahora para firmar, el `JwtModule` que la fundación solo usaba para verificar). Refresh tokens **opacos, almacenados hasheados, con rotación**. Cuenta `suspendido` → no autentica (`401`).
- **Perfil propio** (`GET`/`PATCH /usuarios/yo`, autenticado): consulta y edición limitada (solo `nombre`; nunca `rol`/`estado`), resuelto desde el token.
- **Servicio de hashing de contraseñas** aislado tras una interfaz, para que la librería sea intercambiable.
- **Entorno**: nuevas variables para el secreto/TTL de refresh; `.env.example` actualizado.

**Fuera de alcance** (irá en un segundo change `usuarios-admin`): la gestión administrativa con RBAC — `GET /usuarios`, `GET /usuarios/{id}`, `PATCH /usuarios/{id}/rol`, `PATCH /usuarios/{id}/estado` y el `RolesGuard`.

## Capabilities

### New Capabilities
- `registro-de-cuenta`: alta de una cuenta nueva (rol `validador`, estado `activo`), con hash de contraseña y unicidad de email.
- `autenticacion-de-sesion`: emisión, rotación e invalidación de tokens de sesión — `login`, `refresh` y `logout` — incluyendo el bloqueo de cuentas `suspendido`.
- `perfil-propio`: consulta y edición del perfil del usuario autenticado (`/usuarios/yo`), limitada a `nombre`.

### Modified Capabilities
<!-- Ninguna. Las capacidades de la fundación (autenticacion-multitenant, etc.) no cambian a nivel de requisito: este change AÑADE la emisión de tokens; la verificación ya existente se reutiliza sin modificarse. -->

## Impact

- **Código**: nuevo módulo `src/usuarios/` con el controlador, el servicio, las entidades `Usuario` y `Sesion` (almacén de refresh tokens), DTOs Zod, el servicio de tokens (firma access + emisión/rotación refresh) y el servicio de hashing. Reutiliza el `JwtModule`/guard de la fundación `auth/` **sin modificarla** (salvo el `signOptions` ya añadido para firmar). `AppModule` importa `UsuariosModule`.
- **Dependencias nuevas**: librería de hashing de contraseñas (p. ej. `argon2` o `bcryptjs`).
- **Persistencia**: migraciones para la tabla `usuarios` y para el almacén de refresh tokens (sesiones).
- **Configuración**: variables de entorno para el refresh token (secreto/TTL o expiración de sesión); `.env.example` actualizado.
- **Reutiliza la fundación E0**: DTOs con `createZodDto`, sobre `Error`/`CodigoError` + filtro global, `JwtAuthGuard` global + `@Publico()`, claims `{ sub, rol }`, `@OwnerId()`/`@UsuarioActual()`.
- **Contrato**: implementa la sección `usuarios` (auth + perfil) del OpenAPI. No lo modifica.
