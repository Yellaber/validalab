## Context

Sobre la fundación E0 (config validada, TypeORM + migraciones, filtro de errores → sobre `Error`/`CodigoError`, `JwtAuthGuard` global + `@Publico()`, validación Zod). El contrato (`../contrato-api/openapi.yaml`, tag `usuarios`) fija la superficie:

- `Usuario { id(uuid), email, nombre, rol, estado, fechaCreacion }` — **nunca** expone password ni hash.
- `Rol`: `validador` | `administrador`. `EstadoUsuario`: `activo` | `suspendido` (suspendido no autentica).
- `TokenRespuesta { accessToken, refreshToken, tokenTipo: 'Bearer', expiraEn(seg), usuario }`.
- Requests: registro `{ email, nombre(≥1), password(≥8) }`, login `{ email, password }`, refresh `{ refreshToken }`, perfil `{ nombre(≥1) }`.

La fundación ya define los claims `{ sub = ownerId(uuid), rol }`; el `JwtModule` actual solo se configuró con `secret` para **verificar**.

## Goals / Non-Goals

**Goals:**
- Permitir registro, login, refresh, logout y gestión del perfil propio, exactamente como define el contrato.
- Emitir accessTokens JWT compatibles con el guard de la fundación (claims `{ sub, rol }`).
- Soportar logout y rotación de refresh tokens de forma segura.
- Dejar la base de identidad sobre la que el resto de dominios se aíslan por `owner_id`.

**Non-Goals:**
- Gestión administrativa con RBAC (listar/ver/cambiar rol/estado) y `RolesGuard` → change `usuarios-admin`.
- Recuperación de contraseña, verificación de email, MFA, OAuth social.
- Revocación de accessTokens ya emitidos (se aceptan hasta su expiración corta; la revocación efectiva se hace vía refresh).

## Decisions

### D1 — Hash de contraseña tras un servicio aislado
Se define `ServicioDeHashing` (interfaz `hash(plano)` / `verificar(plano, hash)`); el dominio nunca llama a la librería directamente. **Decisión: `bcryptjs`** (JS puro, sin `node-gyp`) — evita todo riesgo de build nativo en Windows y permite arrancar de inmediato; suficiente y battle-tested. Por aislarse tras la interfaz, migrar a `argon2` más adelante es trivial si se requiere mayor robustez.

### D2 — Emisión del accessToken (firma)
El `login`/`refresh` firman un accessToken JWT con claims `{ sub: usuario.id, rol: usuario.rol }`, expiración `JWT_ACCESS_TTL` y el `JWT_ACCESS_SECRET` ya existentes. `expiraEn` del `TokenRespuesta` = ese TTL en **segundos**. `tokenTipo` = `'Bearer'` constante. El `JwtModule` de `AuthModule` se amplía con `signOptions` (la fundación solo tenía `secret`); el guard sigue verificando igual.

### D3 — Refresh tokens opacos, hasheados y rotados
El refreshToken es un **token opaco aleatorio** (p. ej. 32+ bytes base64url), **no** un JWT. Se almacena solo su **hash** en una tabla `sesiones` (o `refresh_tokens`) junto a `usuarioId`, `expiraEn`, `revocadoEn`. Flujo:
- `login`: crea una sesión, devuelve el token en claro una sola vez.
- `refresh`: valida el token (hash + no expirado + no revocado), **rota** (revoca el actual y emite uno nuevo) y devuelve `TokenRespuesta` nuevo.
- `logout`: revoca la sesión del refreshToken presentado (`204`).
Ventajas: logout/rotación reales, robo de BD no expone tokens usables, revocación inmediata. *Alternativa considerada*: JWT de refresh con `JWT_REFRESH_SECRET` — más simple pero la invalidación/rotación obliga igualmente a una lista en BD, así que el token opaco es más limpio.

### D4 — Entorno
Con refresh opaco (D3) **no** hace falta secreto JWT de refresh; se añade `REFRESH_TOKEN_TTL` (vigencia de la sesión, p. ej. `30d`). Se valida con el esquema Zod de la fundación y se actualiza `.env.example`. (Si en `apply` se eligiera JWT de refresh, se añadirían `JWT_REFRESH_SECRET`/`JWT_REFRESH_TTL`.)

### D5 — Entidad `Usuario` y mapeo a la respuesta
Entidad TypeORM `usuarios`: `id uuid (gen_random_uuid)`, `email citext/único`, `nombre`, `passwordHash`, `rol`, `estado`, `fechaCreacion`. El `passwordHash` se excluye de toda serialización (no se mapea al DTO de respuesta `Usuario`). Un mapeador `aUsuarioDto(entidad)` produce el recurso del contrato. El `email` es único (índice); el alta con email existente → `CONFLICTO`.

### D6 — Reglas de autenticación y errores (vía fundación)
- `registro`: valida con Zod; email duplicado → `ConflictoException` (409). Password se hashea (D1).
- `login`: si no existe el email o la contraseña no verifica → `NoAutenticadoException` (401) **sin distinguir** cuál de los dos falló. Cuenta `suspendido` → `401` igualmente (no se revela el motivo).
- `refresh`: token inválido/expirado/revocado → `401`.
- Todo se traduce al sobre `Error` por el filtro global; nunca se filtra el hash ni la existencia de cuentas.

### D7 — Rutas públicas vs protegidas
`registro`, `login`, `refresh` → `@Publico()`. `logout`, `GET/PATCH /yo` → protegidas por el guard global; el usuario se resuelve con `@UsuarioActual()`/`@OwnerId()` (el `sub` del token), nunca por `id` del cliente.

## Risks / Trade-offs

- **Build nativo de `argon2` en Windows** (node-gyp) → Mitigación: el aislamiento de D1 permite usar `bcryptjs` (JS puro) si el build falla; se decide en `apply`.
- **Tabla de sesiones crece** con tokens revocados/expirados → Mitigación: índice por `usuarioId` y limpieza diferida (job futuro); fuera de alcance aquí.
- **`citext` requiere extensión** para email case-insensitive → Mitigación alternativa: normalizar email a minúsculas en la app antes de persistir/buscar (evita la extensión).
- **accessTokens no revocables hasta expirar** → Mitigación: TTL corto (p. ej. 15m) + refresh revocable; aceptado.

## Migration Plan

1. Añadir la librería de hashing y (si aplica) variables de entorno; actualizar `.env.example`.
2. Migraciones: tabla `usuarios` (email único) y tabla `sesiones` (hash de refresh + vigencia + revocación).
3. Implementar servicio de hashing, servicio de tokens (firma access + emisión/rotación refresh), `UsuariosService`, controlador y DTOs Zod.
4. Cablear `UsuariosModule` en `AppModule`; ampliar `signOptions` del `JwtModule`.
5. Verificar contra la BD (Docker): registro→login→/yo→refresh→logout, y casos 401/409/422. Rollback: revertir migraciones; sin datos productivos.

## Open Questions

- **Librería de hashing**: ~~argon2 vs bcryptjs~~ → **resuelto: `bcryptjs`** (ver D1).
- **Email case-insensitive**: `citext` (extensión) vs normalización a minúsculas en la app — se resuelve en la entidad/migración (se prefiere normalizar para no depender de otra extensión).
- **Nombre de la tabla de refresh**: `sesiones` vs `refresh_tokens` — cosmético; se fija en la migración.
