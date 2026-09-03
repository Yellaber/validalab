# ValidaLab

> **Valida ideas de software antes de codificarlas** — *validate-first, build-second*.

ValidaLab es un SaaS multiusuario para validar ideas de software **antes** de invertir en
construirlas. Un fundador o validador registra ideas, hipótesis, contactos y entrevistas de
descubrimiento; un **agente de IA** puntúa las entrevistas y emite un veredicto **go / pivote /
kill** sobre cada idea. El humano siempre verifica: el agente nunca decide en firme.

El proyecto es **multi-tenant desde la primera versión** — autenticación, RBAC y aislamiento
por `owner_id` en cada consulta. Ningún usuario ve datos de otro.

> [!NOTE]
> **Dónde ver qué está implementado.** Este README describe el producto, el stack y cómo
> trabajar en él. El alcance construido en cada momento vive en las **capacidades vigentes**
> de `openspec/specs/` (raíz y de cada paquete) y en el [`CHANGELOG.md`](CHANGELOG.md), que
> son las fuentes que se actualizan solas con el flujo de trabajo. El [Roadmap](#roadmap) de
> abajo lista **prioridades** del SRS, no avance.

---

## La tríada de responsabilidades

El principio de diseño central reparte el trabajo en tres roles que nunca se solapan:

| Rol | Responsabilidad |
| --- | --- |
| **El usuario** | **Alimenta** (registra ideas, contactos, respuestas de entrevistas) y **verifica**. |
| **El agente** | **Ejecuta**: puntúa entrevistas y dictamina el veredicto. |
| **El sistema** | **Calcula** los KPIs y **orquesta** la invocación al agente. |

## El Validador Inteligente

Es el núcleo distintivo del producto: un **agente [LangGraph.js](https://langchain-ai.github.io/langgraphjs/)**,
no una simple llamada a una API. Vive en el backend como un servicio inyectable desacoplado de
los controladores y cumple dos funciones:

1. **Scoring de entrevistas** (alto volumen) — se dispara automáticamente al guardar una
   entrevista. Devuelve `score (0–10)`, `justificación`, `señales` y `confianza`.
2. **Veredicto de idea** (bajo demanda) — analiza el snapshot de KPIs y devuelve
   `veredicto ('go' | 'pivote' | 'kill')`, `confianza`, justificación por KPI y recomendaciones.

Reglas clave de la capa agéntica:

- **Agnóstica del proveedor:** una capa de abstracción oculta las diferencias entre
  Anthropic / OpenAI / Google tras un adaptador común, seleccionado según la config **BYOK**
  del usuario.
- **Salida estructurada siempre validada con [Zod](https://zod.dev/):** ninguna respuesta sin
  validar puede afectar scores, KPIs ni veredictos.
- **Modo consultivo:** la idea solo cambia de estado **tras la aprobación humana** del veredicto.

**BYOK (Bring Your Own Key):** cada usuario aporta su propia API key del proveedor de IA. Se
cifra en reposo, se valida contra el proveedor al guardarla y **nunca se devuelve al frontend**.

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| **Frontend** | [Angular 22](https://angular.dev/) (standalone, *zoneless*) |
| **Backend** | [NestJS 11](https://nestjs.com/) sobre Node.js — modular por dominio |
| **Persistencia** | [PostgreSQL](https://www.postgresql.org/) |
| **Capa agéntica** | LangGraph.js + `@langchain/core`, TypeScript, esquemas Zod |
| **Contrato** | OpenAPI (un único documento, fuente de verdad frontend ↔ backend) |
| **CI** | GitHub Actions |

## Estructura del monorepo

```
validalab/
├── frontend/        # App Angular 22 (cliente SaaS multi-tenant)
├── backend/         # API NestJS 11 (modular por dominio)
├── contrato-api/    # openapi.yaml — contrato único frontend ↔ backend
├── openspec/        # Desarrollo guiado por especificación (propose → apply → verify → archive)
├── CLAUDE.md        # Guía del repo (modelo de dominio, agente, BYOK, KPIs, épicos)
└── .github/         # Workflows de CI
```

Cada paquete (`frontend/`, `backend/`) es **independiente**: tiene su propio `package.json`,
su `package-lock.json` y su `CLAUDE.md`. No hay workspace manager en la raíz; se instalan y
ejecutan por separado.

---

## Puesta en marcha

### Requisitos previos

- **Node.js 24.x** y **npm** (el CI fija Node 24).
- **PostgreSQL** — `backend/docker-compose.yml` levanta una instancia lista para desarrollo.
- Una **API key** de un proveedor de IA (Anthropic / OpenAI / Google) para usar el Validador
  Inteligente — se configura por usuario vía BYOK.

### Frontend (Angular)

```bash
cd frontend
npm install
npm start            # ng serve — http://localhost:4200
npm run build        # build de producción a dist/
npm test             # Vitest (jsdom, zoneless)
```

### Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev    # nest start --watch — http://localhost:3000
npm run build        # nest build a dist/
npm run lint         # eslint --fix
npm test             # tests unitarios (Jest)
npm run test:e2e     # tests end-to-end
```

### Arranque de un sistema nuevo

Un despliegue recién creado **no está operativo hasta que se inicializa**. Dos de estos pasos
no son deducibles del código, así que conviene seguirlos en orden:

```bash
cd backend
cp .env.example .env          # rellena los secretos; el arranque es fail-fast
docker compose up -d          # PostgreSQL en :5432
npm ci
npm run migration:run         # imprescindible: migrationsRun es false
npm run start:dev             # :3000, docs vivas en /docs
```

Con el backend en marcha, **inicializa el sistema** para crear su cuenta administradora. Es la
única operación que produce el rol `administrador`: el registro normal siempre crea `validador`.

```bash
curl -X POST http://localhost:3000/sistema/inicializar \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Token: $BOOTSTRAP_TOKEN" \
  -d '{"email":"admin@ejemplo.com","nombre":"Admin","password":"tu-contrasena"}'
```

El secreto es el `BOOTSTRAP_TOKEN` de tu `.env` (genéralo con `openssl rand -hex 32`). Después,
inicia sesión con `POST /usuarios/login` como cualquier otra cuenta.

> [!IMPORTANT]
> La inicialización es **de un solo uso y no tiene reversa**: cualquier llamada posterior
> responde `409`, aunque presentes el secreto correcto. Si pierdes el acceso a la única cuenta
> administradora, no hay recuperación por API. Promueve a un **segundo administrador** con
> `PATCH /usuarios/{id}/rol` nada más entrar.

Una vez inicializado el sistema, `BOOTSTRAP_TOKEN` ya no sirve para nada y puedes retirarlo del
entorno.

---

## Despliegue

ValidaLab se despliega en tres plataformas gestionadas, una por pieza:

| Pieza          | Plataforma            | Plan     | Por qué                                                                                |
| -------------- | --------------------- | -------- | -------------------------------------------------------------------------------------- |
| Frontend       | **Vercel**            | Gratuito | Artefacto estático; el plan gratuito no lo duerme.                                       |
| Backend        | **Railway**           | Hobby    | De pago **a propósito**: los planes gratuitos duermen y un arranque en frío de 30–50 s cae en la primera visita. |
| Base de datos  | **Supabase**          | Gratuito | PostgreSQL gestionado con TLS.                                                           |

### Variables de entorno

El backend valida su entorno al arrancar (*fail-fast*): una variable ausente o incoherente aborta
el proceso. Estas son las que cambian respecto al desarrollo local; el resto se documentan en
`backend/.env.example`.

| Variable                              | Valor en el despliegue        | Nota                                                                     |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `NODE_ENV`                            | `production`                  |                                                                          |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | cadena del **pooler** de Supabase | La app usa el pooler en modo transacción; las migraciones, el de modo sesión (ver abajo). |
| `DB_SSL`                              | `true`                        | Supabase lo exige; sin él el backend no arranca.                         |
| `DB_SYNCHRONIZE`                      | `false`                       | El esquema lo gobiernan las migraciones.                                 |
| `DB_MIGRAR_AL_ARRANCAR`               | `true`                        | Aplica las migraciones al arrancar, serializando las réplicas con un lock. |
| `COOKIE_SECURE`                       | `true`                        | Obligatorio con `SameSite=None`.                                         |
| `COOKIE_SAMESITE`                     | `none`                        | Frontend y backend están en sitios registrables distintos.               |
| `CORS_ORIGINS`                        | URL de producción de Vercel   | Con credenciales el origen no puede ser `*`.                             |
| `JWT_ACCESS_SECRET`, `BYOK_CLAVE_CIFRADO` | secretos nuevos           | `openssl rand -hex 32`. **No reutilices los de desarrollo.**              |
| `BOOTSTRAP_TOKEN`                     | secreto temporal              | Solo hasta inicializar; después se retira.                               |

> [!IMPORTANT]
> `COOKIE_SAMESITE=none` **exige** `COOKIE_SECURE=true`, y el backend aborta el arranque si se
> combinan mal. El navegador descarta en silencio una cookie `SameSite=None` sin `Secure`, y el
> síntoma sería una sesión que se cae sola al expirar el `accessToken` —quince minutos después de
> entrar—, no un error visible. La validación convierte eso en un arranque que falla y dice por qué.

`PORT` lo inyecta Railway y el backend lo lee del entorno: no lo fijes.

### Orden de los pasos

El orden importa y no es deducible: **el frontend necesita la URL del backend para compilarse, y el
backend necesita la URL del frontend para su CORS**. Como no se pueden satisfacer a la vez, se pasa
dos veces por Railway.

1. **Supabase** — crea el proyecto y anota la cadena de conexión del *pooler* en **modo
   transacción** (`6543`). Es la que usa el backend, y desde que las migraciones se aplican al
   arrancar es también por donde pasan: van dentro de una única transacción, que el modo transacción
   sí atiende sin problema porque una transacción viaja entera por la misma conexión.

   Guarda también la de **modo sesión** (`5432`): es la que necesitas para aplicar migraciones **a
   mano** desde tu máquina con `npm run migration:run:prod`, que sigue siendo la vía para un cambio
   de esquema que prefieras ejecutar y verificar antes de desplegar.

   No uses la conexión **directa** (`db.<ref>.supabase.co`) aunque el panel la ofrezca: en el plan
   gratuito resuelve **solo a IPv6**, y si la red de salida de la plataforma no habla IPv6, la
   conexión falla. El pooler tiene IPv4.
2. **Railway** — crea el servicio desde el repositorio y configúralo **en el panel**, porque el
   archivo `railway.json` está deprecado (lo sustituye `.railway/railway.ts`, que este proyecto no
   usa):

   | Ajuste | Valor |
   | ------ | ----- |
   | *Settings → Source → Branch* | la rama que contiene los artefactos de despliegue |
   | *Settings → Source → Root Directory* | `backend` |
   | *Settings → Build → Builder* | `Dockerfile` |

   > [!WARNING]
   > **La rama es el ajuste que más caro sale equivocar.** Railway se engancha por defecto a la rama
   > principal, y mientras el despliegue viva en una rama de trabajo el `Dockerfile` sencillamente no
   > existe ahí: Railway cae a su detector automático, construye el proyecto igual y **arranca sin
   > error**. El síntoma no es un fallo, es un despliegue aparentemente sano que no lleva dentro
   > ninguna de las variables ni de la configuración que creías haber puesto. Se reconoce en el log
   > de arranque: la imagen de este `Dockerfile` corre como `[Nest] 1` —Node es el PID 1— mientras
   > que el detector automático deja `npm → nest → node` y un PID mayor.

   Fija las variables de la tabla, con un `CORS_ORIGINS` provisional. **No configures un
   comando de *pre-deploy*:** las migraciones se aplican al arrancar, con
   `DB_MIGRAR_AL_ARRANCAR=true`.

   > [!NOTE]
   > **Por qué al arrancar y no como paso de release.** Lo natural sería el *Pre-Deploy Command* de
   > Railway, y así se planteó primero. No funciona con esta imagen: el paso falla siempre, incluso
   > con un comando tan inocuo como `node -e "console.log('ok')"`, sin dejar ninguna salida en el
   > panel. El contenedor del pre-deploy no llega a arrancar y la causa no es diagnosticable desde
   > fuera.
   >
   > Y falla de la peor manera posible: **el despliegue queda en `FAILED` mientras la aplicación
   > sigue respondiendo**, porque Railway no promueve un despliegue fallido y el anterior se queda en
   > servicio. Además los *redeploys* se saltan ese paso y salen en verde, así que el problema
   > aparece y desaparece según cómo hayas lanzado el despliegue. Si algún día vuelves a esa vía:
   > mira el **estado del despliegue**, nunca la salud de la aplicación.
   >
   > El motivo original para sacar las migraciones del arranque —que con varias réplicas todas las
   > intentarían a la vez— se resuelve con un `pg_advisory_xact_lock`: la primera réplica aplica y
   > las demás esperan y siguen de largo al no quedar nada pendiente. Si una migración falla, el
   > proceso no llega a escuchar.

3. **Frontend** — pon la URL pública del backend en `frontend/src/environments/environment.ts`
   (`baseUrl`) y haz commit.
4. **Vercel** — importa el repositorio con **`frontend/` como directorio raíz**. `vercel.json` ya
   declara el directorio de salida (`dist/frontend/browser`) y las reescrituras que la SPA necesita
   para que recargar una ruta profunda no devuelva 404. Anota la URL de producción.
5. **Railway, otra vez** — fija `CORS_ORIGINS` con la URL real de Vercel y redespliega.
6. **Inicializa el sistema** contra la URL pública, igual que en local:

   ```bash
   curl -X POST https://<tu-backend>/sistema/inicializar \
     -H "Content-Type: application/json" \
     -H "X-Bootstrap-Token: $BOOTSTRAP_TOKEN" \
     -d '{"email":"admin@ejemplo.com","nombre":"Admin","password":"tu-contrasena"}'
   ```

   Después, **promueve un segundo administrador** con `PATCH /usuarios/{id}/rol` y retira
   `BOOTSTRAP_TOKEN` del entorno. La inicialización no tiene reversa.

### Límites conocidos

Son decisiones tomadas, no defectos pendientes:

- **Los *preview deployments* de Vercel no autentican.** Cada PR recibe una URL distinta y no hay
  lista blanca fija que la cubra. Aceptar un comodín sobre `*.vercel.app` significaría admitir
  credenciales desde cualquier despliegue de cualquier cuenta de Vercel, así que se prefiere que un
  preview sirva para revisar la interfaz pero no para probar con sesión.
- **La Data API de Supabase exige blindaje explícito.** Supabase publica el esquema `public` por
  PostgREST, así que sin protección `usuarios` y `configuraciones_byok` son legibles y escribibles
  con la clave publicable, **rodeando el filtro por `owner_id`** que vive en el backend. Una
  migración activa RLS en todas las tablas —para que un entorno nuevo lo reproduzca sin pasos
  manuales—: sin políticas, RLS deniega por defecto, y la aplicación no se entera porque se conecta
  como dueña de las tablas y no se usa `FORCE ROW LEVEL SECURITY`. Además se **desactiva la Data
  API** en el panel (*Project Settings → Data API*): ValidaLab no la usa —el frontend habla con el
  backend, nunca con Supabase— y es lo único que cubre también las tablas que creen migraciones
  futuras, que nacerían sin RLS.

  Comprobarlo tiene trampa, dos veces. Con la Data API **activa** y RLS denegando, PostgREST
  responde `200` con `[]`, no `403`: sobre una tabla vacía eso es indistinguible de que no haya
  protección, así que hay que consultar una tabla **con filas**, como `modelos_ia`, y ver que el
  rol anónimo recibe cero. Con la Data API **desactivada**, la respuesta es `503` con el código
  `PGRST002` —que literalmente dice que PostgREST no puede consultar la base de datos—, así que
  antes de darlo por bueno hay que confirmar que la base sigue sana por la ruta de la aplicación:
  si no, se estaría leyendo una caída de la base como si fuera un blindaje.
- **El proyecto gratuito de Supabase se pausa por inactividad.** Si el enlace lleva tiempo sin
  visitas, conviene abrirlo antes de compartirlo. Despausar es un clic y, a diferencia del arranque
  en frío del backend, no ocurre a mitad de una visita.
- **`DB_SSL` cifra el transporte pero no verifica la cadena de certificación.** Hacerlo exigiría
  distribuir y rotar el certificado raíz del proveedor.
- **No hay endpoint de salud**, así que el healthcheck de la plataforma es TCP: detecta un proceso
  caído, no uno vivo con la base de datos inaccesible.
- **No hay despliegue automático desde el CI ni entorno de *staging*.** Cada plataforma despliega
  desde su propia integración con GitHub.

---

## Contrato de API

El **contrato de API es la fuente de verdad única** que dirige el desarrollo de ambos paquetes.
Cada equipo desarrolla **contra el contrato**, sin conocer ni depender del código del otro. Todo
endpoint, payload o comportamiento de borde se define **primero** en el contrato y solo después
se implementa.

```
contrato-api/openapi.yaml   ← navegable por tags de dominio
```

Los `tags` corresponden a los módulos de dominio: `usuarios`, `ideas`, `contactos`,
`entrevistas`, `kpis`, `agente`, `proveedores`. Se les suma `sistema`, el único `tag` que **no** es
un módulo de dominio: agrupa el ciclo de vida de la instalación (hoy, la inicialización del sistema
y la creación de su cuenta administradora de origen).

**Convenciones transversales** (el detalle vive en el OpenAPI):

- **Autenticación:** JWT en `Authorization: Bearer <token>` salvo registro/login.
- **Aislamiento multi-tenant:** el `owner_id` se deriva **siempre** del token, nunca del cliente.
- **Errores:** sobre `Error` con un `codigo` estable del catálogo `CodigoError`.
- **Paginación:** parámetros `pagina` / `porPagina`; respuesta en `RespuestaPaginada`.
- **Nombres:** rutas en plural y kebab-case; campos JSON en camelCase y **en español**; `id` en `uuid`.

---

## Flujo de desarrollo

### Ramas y Pull Requests

El repositorio usa un flujo basado en `main` / `develop`, **ambas protegidas**:

- `main` — rama estable (releases).
- `develop` — rama de integración.
- Las funcionalidades se desarrollan en ramas de trabajo (`feat/...`, `fix/...`) que parten de
  `develop`.

Las reglas de protección exigen, en ambas ramas: **PR obligatorio** (sin push directo), **CI en
verde** (jobs `Frontend (Angular)` y `Backend (NestJS)`), rama **al día con la base**,
conversaciones resueltas, y prohíben force-push y borrado.

| PR | Estrategia de merge recomendada |
| --- | --- |
| rama de trabajo → `develop` | **Squash and merge** |
| `develop` → `main` | **Merge commit** |

Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/) (en español).

### Integración continua

En cada `pull_request` y `push` hacia `develop` y `main`, GitHub Actions ejecuta dos jobs en
paralelo:

- **Frontend (Angular):** `build` + `test`.
- **Backend (NestJS):** `lint` + `build` + tests unitarios + e2e.

### OpenSpec

Las funcionalidades sustanciales pasan por el ciclo de **desarrollo guiado por especificación**
(`propose → apply → verify → archive`). Revisa `openspec/changes/` antes de empezar una
funcionalidad.

---

## Roadmap

Prioridades de implementación (MoSCoW); los **Must** constituyen el MVP:

| Épico | Alcance | Prioridad |
| --- | --- | --- |
| **E0** | Cuentas, autenticación y aislamiento multi-tenant | Must |
| **E1** | Portafolio de ideas | Must |
| **E2** | Hipótesis y umbrales kill/go | Must |
| **E3** | CRM de contactos (embudo de outreach) | Must |
| **E4** | Entrevistas + scoring por IA | Must |
| **E5** | KPIs y tablero | Must |
| **E6** | Veredicto del agente | Must |
| **E7** | Configuración BYOK | Must |
| **E8** | Costo y optimización | Should / Could |

---

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — modelo de dominio, Validador Inteligente, BYOK, KPIs y épicos.
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — arquitectura y comandos del frontend.
- [`backend/CLAUDE.md`](backend/CLAUDE.md) — arquitectura y comandos del backend.
- [`contrato-api/openapi.yaml`](contrato-api/openapi.yaml) — contrato de API completo.
- **SRS v6.0** — especificación de requerimientos (fuente de verdad funcional).

El dominio, la documentación y los identificadores funcionales están en **español** (idea,
hipotesis, entrevista, veredicto, umbral, score), siguiendo la terminología del SRS.

---

## Licencia

Proyecto privado (`UNLICENSED`). Todos los derechos reservados.
