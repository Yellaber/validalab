# ValidaLab — backend

API **NestJS 11** sobre Node.js, modular por dominio, con PostgreSQL y TypeORM. Aquí viven la
autenticación multi-tenant, el contrato de API implementado y el **Validador Inteligente**, el
agente LangGraph.js que puntúa entrevistas y emite veredictos.

## Requisitos

- Node.js 24.x y npm.
- PostgreSQL. `docker compose up -d` levanta uno local ya configurado.
- Un archivo `.env` a partir de [`.env.example`](.env.example). El arranque es *fail-fast*: si
  falta una variable obligatoria, el proceso aborta indicando cuál.

## Comandos

```bash
npm run start:dev    # servidor de desarrollo en http://localhost:3000 (docs en /docs)
npm run start:debug  # igual, con el inspector adjunto
npm run build        # compila a dist/
npm run start:prod   # ejecuta la salida compilada
npm run lint         # eslint --fix
npm run format       # prettier --write
```

Base de datos — el esquema lo gobiernan las migraciones y **no se aplican al arrancar**, así que
`migration:run` es obligatorio en cualquier entorno nuevo:

```bash
docker compose up -d     # PostgreSQL local
npm run migration:run    # aplica las pendientes
npm run migration:show   # aplicadas y pendientes
npm run migration:revert # revierte la última
```

Tests:

```bash
npm test             # unitarios (Jest), *.spec.ts junto al código
npm run test:cov     # con cobertura
npm run test:e2e     # extremo a extremo; EXIGE un PostgreSQL accesible
```

La suite e2e levanta la aplicación completa, crea su propia base de test, aplica las migraciones y
la limpia entre pruebas. Si no hay base de datos, falla en lugar de omitirse.

## Puesta en marcha de un sistema nuevo

Un despliegue recién creado no está operativo hasta que se **inicializa**: el registro público
siempre crea cuentas `validador`, y la única operación que produce un `administrador` es
`POST /sistema/inicializar`, protegida por el secreto `BOOTSTRAP_TOKEN` y de un solo uso.

La secuencia completa está en el [README raíz](../README.md#arranque-de-un-sistema-nuevo).

## Dónde seguir

- [`../README.md`](../README.md) — producto, dominio, stack y flujo de ramas y PRs.
- [`CLAUDE.md`](CLAUDE.md) — arquitectura del paquete, convenciones y reglas de implementación.
- [`../contrato-api/openapi.yaml`](../contrato-api/openapi.yaml) — el contrato, fuente de verdad
  de la interfaz con el frontend.
- `openspec/specs/` — capacidades vigentes de este paquete.
