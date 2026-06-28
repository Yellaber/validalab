# ValidaLab

> **Valida ideas de software antes de codificarlas** — *validate-first, build-second*.

ValidaLab es un SaaS multiusuario para validar ideas de software **antes** de invertir en
construirlas. Un fundador o validador registra ideas, hipótesis, contactos y entrevistas de
descubrimiento; un **agente de IA** puntúa las entrevistas y emite un veredicto **go / pivote /
kill** sobre cada idea. El humano siempre verifica: el agente nunca decide en firme.

El proyecto es **multi-tenant desde la primera versión** — autenticación, RBAC y aislamiento
por `owner_id` en cada consulta. Ningún usuario ve datos de otro.

> [!NOTE]
> **Estado:** desarrollo inicial. El monorepo está andamiado (Angular 22 + NestJS 11) y el
> contrato de API está definido; el código de dominio se construye siguiendo el orden de
> épicos del SRS (ver [Roadmap](#roadmap)).

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
- **PostgreSQL** (cuando el backend incorpore la capa de persistencia).
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
`entrevistas`, `kpis`, `agente`, `proveedores`.

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
hipótesis, entrevista, veredicto, umbral, score), siguiendo la terminología del SRS.

---

## Licencia

Proyecto privado (`UNLICENSED`). Todos los derechos reservados.
