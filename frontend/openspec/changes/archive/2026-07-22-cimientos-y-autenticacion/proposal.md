## Why

El frontend es hoy solo el andamiaje del CLI de Angular: un único componente raíz, sin capa HTTP, sin autenticación, sin rutas ni UI de dominio. Nada puede consumir el backend porque **no existe forma de autenticarse ni de adjuntar el token** a las peticiones, y todo el dominio de ValidaLab cuelga de un `Usuario` autenticado y se aísla por su `owner_id`. Este change entrega el primer corte vertical del cliente —registrarse, autenticarse, mantener la sesión y cerrarla— y, con él, toda la **plomería transversal** (capa HTTP, modelos del contrato, traducción del sobre de error, interceptores, guard de rutas y el shell autenticado) sobre la que se montará el resto de las épicas.

Se construye contra `../contrato-api/openapi.yaml` (sección `usuarios`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Configuración de entorno**: `baseUrl` de la API por entorno (`environments/`), y `provideHttpClient` cableado en `app.config.ts` con los interceptores funcionales.
- **Modelos del contrato** (`core/api/`): tipos TypeScript que reflejan el contrato — `Usuario`, `Rol`, `EstadoUsuario`, `TokenRespuesta`, `Error`, `CodigoError`, y los requests de registro/login/refresh/perfil. Fuente: el OpenAPI, no el backend.
- **Traducción de errores** (`core/http/`): un interceptor funcional que convierte el sobre `Error` del backend (`{ codigo, mensaje, detalles }`) en un `ErrorApi` tipado que la UI puede ramificar por `codigo` estable, y normaliza los fallos de red/timeout.
- **Sesión del cliente** (`core/auth/`): un `SesionService` con estado reactivo por **signals** (`accessToken` en memoria, `usuario`, `estaAutenticado`); operaciones `registrar`, `iniciarSesion`, `renovar` (silent refresh) y `cerrarSesion`. **No persiste ningún token en JS**: el access token vive solo en memoria y el refresh token vive en la cookie `HttpOnly` que gestiona el backend. Un **interceptor de autorización** fija `withCredentials` (para que la cookie viaje), adjunta `Authorization: Bearer <accessToken>` salvo en endpoints públicos y, ante un `401`, intenta **una** renovación (`POST /usuarios/refresh`, sin cuerpo; la cookie viaja sola) y reintenta la petición; si la renovación falla, cierra la sesión.
- **Guard de rutas** (`CanMatch` funcional): protege las rutas de dominio; sin sesión válida redirige a `/login`. Un guard inverso mantiene a un usuario ya autenticado fuera de `/login` y `/registro`.
- **UI de autenticación** (`features/auth/`): páginas de **login** y **registro** con **Signal Forms** (validación de email, contraseña ≥ 8, nombre no vacío), mostrando los errores del contrato (`CONFLICTO` en email duplicado, `NO_AUTENTICADO` en credenciales inválidas, `VALIDACION_FALLIDA` campo a campo).
- **Shell autenticado** (`features/shell/`): layout con la identidad del usuario y acción de **cerrar sesión**, con un `<router-outlet>` y una página de inicio mínima de marcador de posición (el portafolio de ideas llega en E1).

**Fuera de alcance** (irá en changes posteriores): la gestión administrativa de cuentas con RBAC (`/usuarios`, `/usuarios/{id}/rol`, `/usuarios/{id}/estado`), la edición de perfil desde la UI más allá de lo mínimo, y cualquier feature de dominio (ideas, contactos, entrevistas…). Un sistema de notificaciones/toasts global se mantiene mínimo aquí (los errores se muestran en la propia página) y se robustecerá cuando haya más features.

## Capabilities

### New Capabilities
- `cliente-http-y-errores`: capa HTTP base del cliente (base URL por entorno, interceptores cableados) y traducción del sobre `Error` del backend a un error tipado ramificable por `codigo`.
- `sesion-cliente`: registro, autenticación, renovación e invalidación de la sesión en el cliente; persistencia de tokens; estado de sesión reactivo por signals; adjunta el `Bearer` y renueva ante `401`.
- `shell-y-navegacion`: rutas públicas vs protegidas con guards, redirecciones de sesión, y el shell autenticado con cierre de sesión.

## Impact

- **Código**: nuevos árboles `src/environments/`, `src/app/core/{api,http,auth}/`, `src/app/features/{auth,shell}/`. `app.config.ts` gana `provideHttpClient(withInterceptors(...))` y el router se cablea en `app.routes.ts` con carga diferida. El componente raíz `App` pasa a alojar el `<router-outlet>`.
- **Dependencias**: ninguna nueva — solo paquetes ya presentes (`@angular/common/http`, `@angular/router`, `@angular/forms/signals`).
- **Sin persistencia de tokens en el cliente**: el access token vive solo en memoria (signal); el refresh token, solo en la cookie `HttpOnly` del backend. Un XSS no puede exfiltrar credenciales de larga vida. La sesión sobrevive al refresco de página vía **silent refresh** al arrancar (provider de arranque que resuelve `POST /usuarios/refresh` antes de activar rutas).
- **Contrato**: consume la sección `usuarios` (registro, login, refresh, logout) del OpenAPI **ya actualizada por el change de backend `refresh-token-en-cookie`** (`TokenRespuesta` sin `refreshToken`, cookie de sesión). **No** lo modifica.
- **Zoneless**: todo el estado que la vista lee es signal; el trabajo asíncrono refresca la UI a través de signals (sin Zone.js).
