## Why

ValidaLab está completo y verificado —E0–E8, contrato validado, suites unitaria y e2e en CI— y **no se puede desplegar**. No existe ningún artefacto que lo lleve a un servidor: ni `Dockerfile`, ni configuración de plataforma, ni documentación de despliegue. `docker-compose.yml` levanta un PostgreSQL de desarrollo y nada más.

Y no es solo que falten artefactos: el código tiene tres supuestos que solo se sostienen en local.

1. **La cookie de refresh es `SameSite=Strict`**, así que el navegador no la envía entre sitios distintos. Con el frontend en `*.vercel.app` y el backend en `*.up.railway.app` —dominios registrables distintos— la sesión se caería silenciosamente en cuanto expirase el `accessToken`.
2. **La conexión a PostgreSQL no contempla SSL.** Supabase la exige; el backend no arrancaría.
3. **`environment.ts` de producción asume `baseUrl: '/api'`**, un prefijo que ningún despliegue de este change usa y que además chocaría con el `Path=/usuarios` de la cookie.

El objetivo de este change es que el proyecto exista en una URL pública.

## What Changes

- **`COOKIE_SAMESITE`** en la configuración: `strict` por defecto, `none` en el despliegue. Se lee del entorno en lugar de fijarse porque una cookie `SameSite=None` exige `Secure`, y en desarrollo local se trabaja sobre `http`: fijarlo a `none` a secas rompería el desarrollo.
- **`DB_SSL`** en la configuración y cableado en las opciones de TypeORM, para conectar con PostgreSQL gestionado.
- **`Dockerfile` multi-etapa** para el backend: compila con las dependencias completas y ejecuta sobre una imagen mínima con solo las de producción.
- **Migraciones como paso de release**, no dentro del arranque del contenedor. Ejecutarlas en el `CMD` significa que cada réplica las intentaría a la vez.
- **`baseUrl` de producción** apuntando al origen completo del backend, en lugar del prefijo `/api`. Con ello desaparece de paso el choque con el `Path` de la cookie.
- **`vercel.json`** con el directorio de salida (`dist/frontend/browser`) y las reescrituras que una SPA necesita para que las rutas de cliente no devuelvan 404 al recargar.
- **Documentación de despliegue** en el `README`: qué variables fija cada plataforma, en qué orden se hacen las cosas y cómo se inicializa el sistema la primera vez.

**Fuera de alcance**: dominio propio y los subdominios que permitirían conservar `SameSite=Strict` —decisión tomada a favor del coste cero en el frontend—; despliegue automático desde CI, que se hace desde las propias plataformas; entornos de *staging*; y monitorización o alertas.

## Capabilities

### New Capabilities
- `despliegue-en-plataformas-gestionadas`: la aplicación es desplegable en plataformas gestionadas —frontend estático, backend en contenedor y PostgreSQL gestionado— con la configuración que eso exige parametrizada por entorno y no fijada en código: atributos de la cookie de sesión según la topología, SSL hacia la base de datos, y origen del backend conocido por el cliente.

### Modified Capabilities
<!-- Ninguna. `arranque-plataforma` no cambia: añadir variables al esquema del entorno no altera su requisito de validación fail-fast, que ya cubre cualquier variable declarada. `autenticacion-de-sesion` tampoco: la cookie sigue siendo `HttpOnly`, acotada por `Path` y con la misma vigencia; lo que pasa a depender del entorno es un atributo que hoy está fijado en código. -->

## Impact

- **`backend/`**: `env.schema.ts` y `app-config.service.ts` ganan dos variables; `cookie-sesion.ts` deja de fijar `sameSite`; `typeorm-options.ts` gana SSL; `Dockerfile` y `.dockerignore` nuevos; `.env.example` documenta ambas.
- **`frontend/`**: `environment.ts` apunta al backend desplegado; `vercel.json` nuevo.
- **`README.md`**: sección de despliegue.
- **Seguridad**: `SameSite=None` reduce la mitigación de CSRF sobre `refresh` y `logout`, los **únicos** endpoints autenticados por cookie. Todos los que modifican estado usan `Authorization: Bearer` y son inmunes a CSRF por construcción. El detalle y las alternativas descartadas están en el diseño.
- **Contrato**: **no se toca**. Ningún endpoint, esquema ni código de error cambia.
- **Coste de operación**: frontend y base de datos en plan gratuito; el backend en un plan de pago mínimo, elegido para evitar los arranques en frío de los planes gratuitos.
