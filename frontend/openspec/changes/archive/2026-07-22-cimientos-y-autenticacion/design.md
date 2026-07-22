## Contexto

Primer corte del frontend. No hay decisiones previas de arquitectura de cliente que respetar salvo las que fija `frontend/CLAUDE.md`: Angular 22 standalone, **zoneless** (detección por signals), organización **por feature**, y las convenciones del contrato (auth por `Bearer`, sobre `Error`, nombres en español). Las decisiones de abajo resuelven las tensiones no triviales; lo mecánico de Angular lo gobierna la skill `angular-developer`.

## Decisiones

### D1 — Estado de sesión: signals en un servicio `providedIn: 'root'`, no una librería de estado
El `SesionService` expone `accessToken = signal<string | null>(null)` (en **memoria**), `usuario = signal<Usuario | null>(null)` y `estaAutenticado = computed(() => this.usuario() !== null)`. Es la **única fuente de verdad** de la sesión; guards, shell e interceptor la leen. No se introduce NgRx/otra librería: el estado de sesión es pequeño y los signals cubren la reactividad zoneless sin ceremonia. El acceso al backend se hace con `HttpClient` inyectado; las respuestas actualizan los signals (así el trabajo async refresca la UI, requisito zoneless).

### D2 — Dos interceptores funcionales separados, en orden fijo
Se registran con `withInterceptors([errorInterceptor, autorizacionInterceptor])`. El **orden importa por la semántica de la cadena**: el `errorInterceptor` va primero (más externo) y el `autorizacionInterceptor` después (más interno), de modo que en la ruta de error el `catchError` de autorización procesa el `401` **crudo** (`HttpErrorResponse`) y puede renovar/reintentar **antes** de que el de errores lo traduzca a `ErrorApi`. Responsabilidad única cada uno:
- **`autorizacionInterceptor`**: fija `withCredentials: true` en toda petición al backend (para que el navegador **envíe y reciba la cookie `HttpOnly` de refresh**) y adjunta `Authorization: Bearer <accessToken()>` cuando hay access token en memoria y no es un endpoint público (`/usuarios/registro`, `/usuarios/login`). Ante `401` en una petición autenticada, dispara **una** renovación vía `SesionService.renovar()` (que llama a `POST /usuarios/refresh`, sin cuerpo; la cookie viaja sola) y reintenta la petición original con el access token nuevo; si la renovación falla, cierra sesión y propaga el error. Un observable de refresh compartido evita renovaciones concurrentes en ráfaga (varias peticiones 401 a la vez comparten la misma renovación).
- **`errorInterceptor`**: mapea la respuesta de error HTTP al `ErrorApi` tipado del contrato. Al ser el más externo, solo traduce los errores que el de autorización **no** resolvió (un `401` ya renovado y reintentado con éxito nunca llega aquí como error).

**Alternativa descartada**: un único interceptor que haga ambas cosas — mezcla dos responsabilidades y complica el reintento post-renovación.

### D3 — La renovación ante `401` vive en el interceptor, no dispersa en cada servicio
Centralizar el refresh en el `autorizacionInterceptor` evita que cada servicio de dominio (ideas, contactos…) reimplemente la lógica de expiración. El servicio de dominio hace su `GET`/`POST` normal; la expiración del access token es transparente. El refresh **no maneja ningún token en JS**: `POST /usuarios/refresh` va sin cuerpo y el navegador adjunta la cookie `HttpOnly`; la respuesta trae un access token nuevo que se guarda en el signal en memoria. Solo un fallo de refresh (cookie ausente/expirada/revocada → `401`) llega al servicio como sesión cerrada → redirección a login por el guard.

### D4 — `ErrorApi` tipado y ramificable por `codigo`
El backend devuelve `{ codigo: CodigoError, mensaje, detalles? }`. El cliente lo envuelve en una clase `ErrorApi` con `codigo` (unión de literales del catálogo), `mensaje` y `detalles?`. La UI **ramifica por `codigo`** (estable), nunca por `mensaje` (informativo). Un error de red/timeout, sin sobre del backend, se normaliza a `codigo: 'ERROR_RED'` (código sintético del cliente, documentado, para distinguirlo del `ERROR_INTERNO` 500 del servidor).

### D5 — Modelos del contrato escritos a mano en `core/api/`, no generados
El contrato es pequeño en superficie para E0 y aún no hay pipeline de generación de tipos desde el OpenAPI. Se escriben a mano los tipos de `usuarios` reflejando exactamente el contrato (campos camelCase en español). El `TokenRespuesta` del contrato **ya no incluye `refreshToken`** (vive en la cookie): el tipo del cliente modela solo `{ accessToken, tokenTipo, expiraEn, usuario }`. Cuando el número de recursos crezca, se podrá evaluar generar desde el OpenAPI; por ahora, a mano y co-localizados en `core/api/`.

### D6 — Sin almacenamiento de tokens en el cliente: access token en memoria + cookie httpOnly
El refresh token vive **solo** en la cookie `HttpOnly` que gestiona el backend (change `refresh-token-en-cookie`); el JavaScript del cliente **nunca lo ve ni lo persiste**. El access token vive **solo en memoria** (el signal `accessToken`), no en `localStorage`/`sessionStorage`: así un XSS no puede exfiltrar ninguna credencial de larga vida. No hay `AlmacenTokens`.

Consecuencia en la **rehidratación**: al recargar la página se pierde el access token en memoria, pero la cookie `HttpOnly` sobrevive. Por eso, al arrancar la app se intenta un **silent refresh** (`POST /usuarios/refresh`, sin cuerpo, con `withCredentials`): si la cookie es válida, devuelve un access token nuevo **y** el `usuario`, restaurando la sesión sin pedir credenciales; si responde `401` (sin cookie o expirada), no hay sesión. Esto sustituye por completo al viejo enfoque de "leer tokens de localStorage + `GET /usuarios/yo`".

**Alternativa descartada**: access token en `localStorage` para sobrevivir al reload — reintroduce el vector XSS que este diseño evita; el silent refresh logra la misma persistencia de sesión sin exponer credenciales a JS.

### D7 — Signal Forms para login y registro
Angular 22 trae Signal Forms (`@angular/forms/signals`, resoluble en el proyecto). Los formularios se modelan con un `signal({...})` + `form()` y validadores (`required`, `email`, `minLength`) en el esquema; el submit usa `submit(form, async () => …)`. Encaja con el mandato zoneless/signals-first y evita `FormGroup`/`FormBuilder`. Los valores iniciales son cadenas vacías (nunca `null`/`undefined`).

### D8 — Rutas con carga diferida y guards funcionales `CanMatch`
`app.routes.ts` define rutas públicas (`/login`, `/registro`) y protegidas (shell + hijos) con `loadComponent`/`loadChildren`. Un `sesionGuard` (`CanMatch`) exige sesión para las protegidas; un `invitadoGuard` (`CanMatch`) saca al autenticado de las públicas. Usar `CanMatch` (y no solo `CanActivate`) evita descargar el chunk de una ruta protegida a un usuario no autenticado.

## Riesgos / Puntos abiertos
- **Rehidratación al arrancar**: el silent refresh está en vuelo mientras el guard evalúa; éste no debe rechazar prematuramente. Se resuelve resolviendo el silent refresh en un provider de arranque (`provideAppInitializer`/`APP_INITIALIZER`) **antes** de activar rutas, de modo que al primer render la sesión ya esté resuelta (con o sin usuario).
- **Renovaciones concurrentes**: varias peticiones que caducan a la vez deben compartir **una** renovación; se comparte el observable de refresh en curso.
- **`withCredentials` global**: se aplica a todas las peticiones al backend para que la cookie de refresh viaje; es inocuo en las que no la usan. Requiere que el backend responda con CORS `credentials: true` y origen explícito (ya provisto por el change de backend).
- **CSRF**: mitigado por `SameSite=Strict` de la cookie (lado backend); el access token va en header, no en cookie, así que el grueso de la API no es CSRF-able.
- **Toasts/notificaciones globales**: fuera de alcance aquí; los errores se muestran en la página. Cuando haya más features se añadirá una capa de notificación.
