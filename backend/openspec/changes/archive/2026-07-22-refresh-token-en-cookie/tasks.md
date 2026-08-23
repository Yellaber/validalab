## 1. Contrato (fuente de verdad, primero)
- [x] 1.1 `TokenRespuesta`: eliminar la propiedad `refreshToken` y quitarla de `required`.
- [x] 1.2 Retirar el esquema `RefrescarTokenRequest`.
- [x] 1.3 `POST /usuarios/login`: documentar la cabecera `Set-Cookie` en la respuesta `200`; el cuerpo pasa a ser el `TokenRespuesta` sin refresh.
- [x] 1.4 `POST /usuarios/refresh`: eliminar `requestBody`; documentar que lee la cookie y devuelve `Set-Cookie` rotada; añadir el esquema de seguridad de cookie.
- [x] 1.5 `POST /usuarios/logout`: eliminar `requestBody`; `security: []` (cookie); documentar la limpieza de cookie.
- [x] 1.6 Añadir `securitySchemes.refreshCookie` (`type: apiKey, in: cookie`).

## 2. Entorno y configuración
- [x] 2.1 `env.schema.ts`: añadir `COOKIE_SECURE` (bool, default `true`) y `CORS_ORIGINS` (string, default `http://localhost:4200`).
- [x] 2.2 `app-config.service.ts`: getters `cookie` (`{ secure }`) y `corsOrigins` (`string[]`, split por coma) y `session.refreshTtlMs`.
- [x] 2.3 `.env.example`: documentar `COOKIE_SECURE` y `CORS_ORIGINS`.

## 3. Helpers de sesión (funciones puras)
- [x] 3.1 `sesion/ttl.util.ts`: `parsearTtlMs(ttl)` (extraído de `ServicioDeTokens`); `token.service.ts` lo reutiliza.
- [x] 3.2 `sesion/cookie-sesion.ts`: `NOMBRE_COOKIE_REFRESH` y `opcionesCookieRefresh({ secure, maxAgeMs })` → objeto de opciones de cookie (`httpOnly`, `secure`, `sameSite: 'strict'`, `path`, `maxAge`).
- [x] 3.3 Specs de ambos helpers.

## 4. Respuesta y DTOs
- [x] 4.1 `usuario-respuesta.ts`: quitar `refreshToken` de `tokenRespuestaSchema`; declarar `SesionEmitida = { cuerpo: TokenRespuesta; refreshToken: string }`.
- [x] 4.2 `usuarios.dto.ts`: retirar `refrescarTokenSchema` / `RefrescarTokenDto`.

## 5. Servicio
- [x] 5.1 `login` y `refrescar` devuelven `SesionEmitida` (`cuerpo` sin refresh + `refreshToken` en claro para la cookie).
- [x] 5.2 `refrescar(refreshTokenPlano: string)` y `logout(refreshTokenPlano)` reciben el token en claro (desde la cookie), no un DTO.
- [x] 5.3 Actualizar `usuarios.service.spec.ts` a las firmas nuevas.

## 6. Controlador
- [x] 6.1 `login`: `@Res({ passthrough: true })`, set-cookie con el refresh, devuelve `cuerpo`.
- [x] 6.2 `refresh`: lee la cookie (`req.cookies`), 401 si falta; set-cookie rotada; devuelve `cuerpo`.
- [x] 6.3 `logout`: `@Publico()`, lee la cookie, revoca, `clearCookie`, responde `204`.
- [x] 6.4 Actualizar decoradores Swagger (`@ApiOperation`/responses; retirar cuerpos de refresh/logout).

## 7. Arranque
- [x] 7.1 `main.ts`: `app.use(cookieParser())` y `app.enableCors({ origin: corsOrigins, credentials: true })`.
- [x] 7.2 Añadir dependencias `cookie-parser` y `@types/cookie-parser`.

## 8. Verificación
- [x] 8.1 `npm run build` sin errores.
- [x] 8.2 `npm test` en verde (specs de servicio y helpers).
- [x] 8.3 `npx eslint "{src,apps,libs,test}/**/*.ts"` (sin `--fix`) limpio.
- [x] 8.4 Cobertura del cableado de cookie con un spec del controlador (`usuarios.controller.spec.ts`, `Response` mockeado): login/refresh escriben la cookie, logout la limpia idempotente. Sustituye al curl manual (Docker no disponible en el entorno) y además corre en CI.
- [x] 8.5 `npx openspec validate refresh-token-en-cookie --strict` en verde.
