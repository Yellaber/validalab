## Why

Hoy `login`/`refresh` devuelven el `refreshToken` en el **cuerpo JSON** de la respuesta y `refresh`/`logout` lo reciben en el **cuerpo de la petición**. Eso obliga al cliente web a **guardar el refresh token en un sitio accesible por JavaScript** (localStorage/memoria), lo que lo expone a robo por **XSS**: el refresh token es la credencial de larga vida con la que se acuñan access tokens nuevos, así que su fuga es persistente y crítica —máxime en un SaaS que además custodia API keys BYOK.

La práctica estándar (OWASP) es que el refresh token viaje en una **cookie `httpOnly; Secure; SameSite`**, invisible a JS, mientras que el access token (corto) vive en memoria del cliente. Este change traslada esa responsabilidad al servidor: el backend **emite, rota y revoca** el refresh token por cookie, y deja de exponerlo en cuerpos JSON.

## What Changes

- **`POST /usuarios/login`**: sigue devolviendo el `TokenRespuesta`, pero **sin** `refreshToken` en el cuerpo; el refresh token se entrega en una cookie `Set-Cookie: refreshToken=…; HttpOnly; Secure; SameSite=Strict; Path=/usuarios`.
- **`POST /usuarios/refresh`**: deja de recibir cuerpo; **lee el refresh token de la cookie**, lo rota (invalida el usado, emite uno nuevo) y devuelve el `TokenRespuesta` nuevo con una `Set-Cookie` rotada. Sin cookie válida → `401`.
- **`POST /usuarios/logout`**: deja de recibir cuerpo; **lee la cookie**, revoca la sesión y **limpia la cookie** (`Set-Cookie` con expiración inmediata). Pasa a ser **público basado en cookie** (no requiere access token): así el cierre de sesión es robusto aunque el access token haya expirado.
- **`TokenRespuesta`** (contrato + DTO): se elimina la propiedad `refreshToken`. Queda `{ accessToken, tokenTipo, expiraEn, usuario }`.
- **CORS con credenciales**: el backend habilita CORS para el/los orígenes del frontend con `credentials: true` (obligatorio para que el navegador envíe/reciba la cookie entre orígenes).
- **Parsing de cookies**: se añade `cookie-parser`.
- **Entorno**: nuevas variables `COOKIE_SECURE` (flag `Secure` de la cookie; `false` en dev http) y `CORS_ORIGINS` (orígenes permitidos, separados por coma). `.env.example` actualizado.

**Sin cambios**: el almacenamiento del refresh token en BD (opaco, hasheado, con rotación) no cambia; el `accessToken` JWT y su verificación por el guard no cambian; la mitigación de CSRF se apoya en `SameSite=Strict` (la cookie de refresh solo la envía el navegador en peticiones del mismo sitio).

**Fuera de alcance**: mover el access token a cookie (se mantiene en el cuerpo, para viajar en el header `Authorization`); protección CSRF adicional por doble-token (no necesaria con `SameSite=Strict` para el único endpoint con cookie).

## Capabilities

### Modified Capabilities
- `autenticacion-de-sesion`: el refresh token pasa a transportarse por cookie `httpOnly` (emisión en login, rotación en refresh, revocación + limpieza en logout) y desaparece del cuerpo de las respuestas y peticiones. El logout pasa a autenticarse por la propia cookie.

## Impact

- **Contrato**: `contrato-api/openapi.yaml` — `TokenRespuesta` sin `refreshToken`; `login`/`refresh` documentan `Set-Cookie`; `refresh`/`logout` dejan de tener `requestBody`; `logout` pasa a `security: []` (cookie); se retira el esquema `RefrescarTokenRequest`.
- **Código**: `usuarios.controller.ts` (set/lectura/limpieza de cookie vía `@Res({ passthrough: true })`), `usuarios.service.ts` (`login`/`refrescar` devuelven cuerpo + refresh token por separado; `refrescar`/`logout` reciben el token en claro), `usuario-respuesta.ts` (`TokenRespuesta` sin refresh), `usuarios.dto.ts` (se retira `RefrescarTokenDto`). Nuevos helpers `sesion/cookie-sesion.ts` (nombre + opciones de la cookie) y `sesion/ttl.util.ts` (parseo de TTL a ms, reutilizado por el token service). `main.ts` cablea `cookie-parser` y `enableCors({ credentials: true })`.
- **Dependencias nuevas**: `cookie-parser` (+ `@types/cookie-parser`).
- **Configuración**: `COOKIE_SECURE` y `CORS_ORIGINS` en `env.schema.ts`, `app-config.service.ts` y `.env.example`.
- **Tests**: se actualizan las specs de `UsuariosService` (login/refrescar/logout con las firmas nuevas) y se añaden specs de los helpers puros de cookie y TTL. No hay specs e2e que mantener.
- **Frontend**: habilita el change `cimientos-y-autenticacion` para consumir el flujo por cookie (access token en memoria, `withCredentials`, silent refresh). Es su prerrequisito.
