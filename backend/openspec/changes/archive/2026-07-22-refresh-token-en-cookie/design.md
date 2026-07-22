## Contexto

El módulo `usuarios` ya emite un access token JWT y un refresh token opaco (hasheado en BD, rotado en refresh, revocado en logout). Lo único que cambia es **el transporte del refresh token**: de cuerpo JSON a cookie `httpOnly`. El ciclo de vida en BD (`ServicioDeTokens`) se conserva intacto. Las decisiones de abajo resuelven el reparto de responsabilidades cliente/servidor y los atributos de seguridad.

## Decisiones

### D1 — El servidor es dueño del refresh token; el cliente nunca lo ve
El refresh token viaja **solo** en la cookie `httpOnly`, que el JavaScript del cliente no puede leer ni escribir. El cuerpo de `login`/`refresh` entrega el access token (para el header `Authorization`, en memoria del cliente) y ya no incluye el refresh token. Esto cierra el vector de robo por XSS del refresh token, que era el motivo del cambio.

### D2 — Atributos de la cookie: `HttpOnly; Secure; SameSite=Strict; Path=/usuarios`
- **`HttpOnly`**: invisible a JS (anti-XSS).
- **`Secure`**: solo por HTTPS; configurable por `COOKIE_SECURE` para permitir dev sobre `http://localhost` (`false`).
- **`SameSite=Strict`**: el navegador solo adjunta la cookie en peticiones del **mismo sitio**, lo que **mitiga CSRF** en el único endpoint que la consume (`/usuarios/refresh` y `/usuarios/logout`). Frontend y backend se despliegan bajo el mismo *site* registrable (y en local `localhost:4200`↔`localhost:3000` son mismo site), así que `Strict` no rompe el flujo XHR propio.
- **`Path=/usuarios`**: la cookie solo se envía a las rutas de `usuarios` (cubre `refresh` y `logout`), minimizando su superficie.
- **`Max-Age`**: igual al TTL del refresh token (`REFRESH_TOKEN_TTL`).

**Alternativa descartada**: `SameSite=None; Secure` (permitiría despliegue cross-site) — abre CSRF y exige contramedidas extra; se posterga hasta que un despliegue cross-site lo exija.

### D3 — El access token se mantiene en el cuerpo, no en cookie
Mover también el access token a cookie obligaría a proteger CSRF en **todas** las rutas (la cookie se enviaría automáticamente). Manteniendo el access token en el cuerpo → header `Authorization: Bearer`, las peticiones de dominio **no** se auto-autentican por cookie y el grueso de la API queda libre de CSRF. Solo la cookie de refresh (una ruta, `SameSite=Strict`) es cookie-autenticada.

### D4 — El servicio separa "cuerpo de respuesta" del "refresh token de cookie"
`login` y `refrescar` devuelven `SesionEmitida = { cuerpo: TokenRespuesta; refreshToken: string }`. El **controlador** es quien conoce el transporte HTTP: pone `cuerpo` en el JSON y `refreshToken` en la cookie (`@Res({ passthrough: true })`, sin romper el pipeline de Nest ni el interceptor de serialización). Así el servicio no depende de `Request`/`Response` y sigue siendo testeable sin HTTP.

### D5 — `logout` pasa a público basado en cookie
Antes exigía access token válido. Ahora lee el refresh token de la cookie, revoca la sesión y limpia la cookie. Se marca `@Publico()`: cerrar sesión debe funcionar **aunque el access token haya expirado**; la credencial que importa para logout es la cookie de refresh, no el access token. Es idempotente: sin cookie o con una ya revocada, responde `204` igualmente y limpia la cookie.

### D6 — CORS con credenciales para orígenes explícitos
Para que el navegador **envíe y reciba** la cookie entre orígenes distintos hace falta `Access-Control-Allow-Credentials: true` y un `origin` **explícito** (no `*`). `CORS_ORIGINS` (lista separada por coma) define los orígenes permitidos; `enableCors({ origin, credentials: true })`. En local, `http://localhost:4200`.

### D7 — Parseo de TTL compartido, sin duplicar
El `Max-Age` de la cookie y el `expiraEn` del refresh en BD derivan del mismo `REFRESH_TOKEN_TTL`. Se extrae el parseo (`30d`/`12h` → ms) a `sesion/ttl.util.ts` (función pura) y lo consumen tanto `ServicioDeTokens` como las opciones de cookie, evitando dos gramáticas divergentes.

## Riesgos / Puntos abiertos
- **Despliegue cross-site**: si en el futuro el frontend queda en un *site* registrable distinto del backend, `SameSite=Strict` bloqueará la cookie y habrá que pasar a `None; Secure` + protección CSRF. Documentado; no es el caso ahora.
- **`Secure` en dev**: `COOKIE_SECURE=false` en local http; debe ser `true` en producción (default `true`). Riesgo de olvido mitigado por el default seguro.
- **CSRF en logout público**: aceptable — `SameSite=Strict` impide que un sitio externo dispare el logout con la cookie; en el peor caso un logout forzado solo cierra la sesión (sin daño de datos).
