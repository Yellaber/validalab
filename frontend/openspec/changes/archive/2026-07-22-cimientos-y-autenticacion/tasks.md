## 1. Configuración base y modelos del contrato
- [x] 1.1 Crear `src/environments/environment.ts` y `environment.development.ts` con `baseUrl` de la API; cablear el reemplazo de archivo en `angular.json` (o usar un único entorno si el CLI no lo generó).
- [x] 1.2 Cablear `provideHttpClient(withInterceptors([...]))` en `src/app/app.config.ts`.
- [x] 1.3 Escribir los modelos del contrato en `src/app/core/api/` (`usuario.model.ts`, `sesion.model.ts`, `error-api.model.ts`): `Usuario`, `Rol`, `EstadoUsuario`, `TokenRespuesta`, requests de `registro`/`login`/`refresh`/`perfil`, y `CodigoError` (catálogo + código sintético de red).

## 2. Traducción de errores (cliente-http-y-errores)
- [x] 2.1 Implementar `ErrorApi` (clase/tipo) con `codigo`, `mensaje`, `detalles?` en `core/api/error-api.model.ts`.
- [x] 2.2 Implementar `errorInterceptor` funcional en `core/http/` que mapee `HttpErrorResponse` → `ErrorApi`, incluyendo el caso de red/timeout → `ERROR_RED`.
- [x] 2.3 Test: sobre de dominio se preserva; fallo de red produce `ERROR_RED`; `VALIDACION_FALLIDA` conserva `detalles`.

## 3. Estado de sesión en memoria (sesion-cliente)
- [x] 3.1 `SesionService` (`providedIn: 'root'`) con signals `accessToken` (memoria), `usuario` y `estaAutenticado` (computed). **Sin** almacenamiento en `localStorage`/`sessionStorage`.
- [x] 3.2 Métodos `registrar`, `iniciarSesion`, `renovar` (silent refresh, `POST /usuarios/refresh` sin cuerpo) y `cerrarSesion` (`POST /usuarios/logout`); cada respuesta actualiza los signals.
- [x] 3.3 Test: `iniciarSesion` guarda el access token en memoria y pobla `usuario`; `renovar` actualiza el access token; `cerrarSesion` limpia el estado aun si el logout del servidor falla; ninguna credencial toca `localStorage`.

## 4. Interceptor de autorización y renovación (sesion-cliente)
- [x] 4.1 `autorizacionInterceptor` funcional: fija `withCredentials: true`; adjunta `Bearer` cuando hay access token y no es endpoint público; ante `401`, renueva una vez (cookie) y reintenta; comparte una sola renovación entre peticiones concurrentes; si el refresh falla, cierra sesión.
- [x] 4.2 Registrar interceptores en orden `[error, autorizacion]` en `app.config.ts` (autorización más interno, para ver el `401` crudo antes de la traducción).
- [x] 4.3 Test: se adjunta el token y `withCredentials`; `401` desencadena refresh + reintento; refresh fallido cierra sesión; endpoints públicos no llevan `Bearer`.

## 5. Rehidratación al arrancar por silent refresh (sesion-cliente)
- [x] 5.1 Provider de arranque (`provideAppInitializer`) que intenta `renovar()` (silent refresh) **antes** de activar rutas; `200` restaura access token + `usuario`, `401` deja la sesión vacía.
- [x] 5.2 Test: con cookie válida rehidrata la sesión; con `401` queda no autenticado.

## 6. Guards y rutas (shell-y-navegacion)
- [x] 6.1 `sesionGuard` (`CanMatch`) exige sesión → redirige a `/login`; `invitadoGuard` (`CanMatch`) saca al autenticado de las públicas.
- [x] 6.2 `app.routes.ts`: rutas públicas (`/login`, `/registro`) y protegidas (shell + hijos) con carga diferida (`loadComponent`/`loadChildren`).
- [x] 6.3 Test de rutas (`RouterTestingHarness`): sin sesión, ruta protegida redirige a login; con sesión, público redirige al shell.

## 7. UI de autenticación (sesion-cliente)
- [x] 7.1 `features/auth/login/` — componente con Signal Forms (`email`, `password`), validadores, `submit` async → `SesionService.iniciarSesion`; muestra `NO_AUTENTICADO`.
- [x] 7.2 `features/auth/registro/` — Signal Forms (`email`, `nombre`, `password`), validadores (email, no vacío, ≥ 8), `submit` async → `SesionService.registrar`; muestra `CONFLICTO` y `detalles` de `VALIDACION_FALLIDA`.
- [x] 7.3 Test de componentes (Act–Wait–Assert, `whenStable`): envío válido llama al servicio; error de email duplicado se muestra; validación local bloquea el envío.

## 8. Shell autenticado (shell-y-navegacion)
- [x] 8.1 `features/shell/` — layout con identidad del usuario (`nombre`/`email`) + acción de cerrar sesión + `<router-outlet>`.
- [x] 8.2 `features/shell/inicio/` — página de inicio mínima (marcador del futuro portafolio de ideas).
- [x] 8.3 Ajustar el componente raíz `App` para alojar el `<router-outlet>` raíz; retirar el markup de andamiaje del CLI.
- [x] 8.4 Test: el shell muestra identidad y cierra sesión (redirige a público).

## 9. Verificación
- [x] 9.1 `npm run build` sin errores.
- [x] 9.2 `npm test -- --no-watch` en verde (specs de servicios, interceptores, guards y componentes).
- [x] 9.3 `npx prettier --check` sobre los archivos nuevos/modificados.
- [x] 9.4 `npx openspec validate cimientos-y-autenticacion --strict` en verde.
