# ValidaLab — frontend

Cliente **Angular 22** del SaaS multi-tenant: standalone (sin NgModules), detección de cambios
*zoneless* y estado dirigido por signals. Habla con el backend NestJS a través del contrato de API.

El agente, las API keys BYOK y el cálculo de KPIs viven del lado del servidor: este paquete nunca
ve una API key en crudo ni ejecuta el agente.

## Requisitos

- Node.js 24.x y npm.
- El backend en marcha para trabajar contra datos reales. En desarrollo se apunta a
  `http://localhost:3000` (ver `src/environments/`).

## Comandos

```bash
npm start            # ng serve — http://localhost:4200
npm run build        # build de producción a dist/
npm run watch        # build incremental en modo desarrollo
npm test             # Vitest sobre jsdom; en terminal interactiva arranca en modo watch
```

Ejecutar una parte de la suite:

```bash
npm test -- --no-watch                      # una sola pasada (modo CI)
npm test -- --include=src/app/app.spec.ts   # un único archivo
npm test -- --filter='^App'                 # por patrón de nombre
npm test -- --coverage                      # con cobertura
```

Este paquete no tiene ESLint ni framework e2e propios: el linting del monorepo vive en `backend/`,
y la cobertura extremo a extremo del sistema, en `backend/test/`. El formato lo aplica Prettier,
configurado en línea en `package.json`.

## Dónde seguir

- [`../README.md`](../README.md) — producto, dominio, stack y flujo de ramas y PRs.
- [`CLAUDE.md`](CLAUDE.md) — arquitectura del paquete, convenciones y las skills de Angular que
  son la fuente de las prácticas vigentes.
- [`../contrato-api/openapi.yaml`](../contrato-api/openapi.yaml) — el contrato, fuente de verdad
  de la interfaz con el backend. Construye cada llamada HTTP contra él, sin inspeccionar el código
  del backend.
- `openspec/specs/` — capacidades vigentes de este paquete.
