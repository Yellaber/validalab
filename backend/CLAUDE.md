# CLAUDE.md

Este archivo guía a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

Este archivo cubre el paquete **backend**. Otros dos documentos son las fuentes de verdad y deben leerse junto a él:

- `../CLAUDE.md` (raíz del repo) — *qué* construir: el modelo de dominio de ValidaLab, el agente Validador Inteligente, BYOK, los KPIs y los épicos de funcionalidad guiados por el SRS. También indexa el contrato de API.
- `../contrato-api/openapi.yaml` — el **contrato de API único** y la fuente de verdad de la interfaz frontend↔backend. Implementa y modifica cada endpoint para que coincida con este documento; define cualquier cambio aquí **primero** y solo después impleméntalo. **No** acoples la implementación a `frontend/`. Las convenciones transversales (autenticación, aislamiento por `owner_id`, sobre de error, paginación, nombres) se resumen en el `CLAUDE.md` raíz y se detallan en el contrato.

## Comandos

Ejecutar desde `backend/`:

```bash
npm run start:dev    # nest start --watch — servidor de desarrollo, puerto 3000 por defecto (PORT lo sobrescribe)
npm run start:debug  # igual, con el inspector --debug adjunto
npm run build        # nest build — salida a dist/
npm run start:prod   # node dist/main — ejecuta la salida compilada
npm run lint         # eslint --fix sobre {src,apps,libs,test}/**/*.ts
npm run format       # prettier --write sobre src + test
```

Base de datos (PostgreSQL + TypeORM). El esquema lo gobiernan las migraciones y **no se aplican solas al arrancar** (`migrationsRun: false`), así que `migration:run` es un paso obligatorio en cualquier entorno nuevo:

```bash
docker compose up -d            # PostgreSQL local para desarrollo (lee el .env de este directorio)
npm run migration:run           # aplica las migraciones pendientes
npm run migration:show          # lista aplicadas y pendientes
npm run migration:generate -- src/database/migrations/<Nombre>   # genera a partir del diff de entidades
npm run migration:create -- src/database/migrations/<Nombre>     # crea una vacía
npm run migration:revert        # revierte la última aplicada
```

Tests (Jest + ts-jest):

```bash
npm test                                        # todas las specs unitarias (*.spec.ts bajo src/)
npm run test:watch                              # modo watch
npm run test:cov                                # con cobertura (salida a ../coverage)
npm run test:e2e                                # specs e2e bajo test/ (config: test/jest-e2e.js)
npm test -- src/usuarios/usuario/usuarios.service.spec.ts   # un único archivo de spec
npm test -- -t "name of the test"               # los tests que coincidan con un patrón de nombre
```

La configuración de los tests unitarios vive en línea en `package.json` (`rootDir: src`, `testRegex: .*\.spec\.ts$`). Los e2e usan `test/jest-e2e.js` y `rootDir: .` — mantén las specs unitarias junto al código fuente y las e2e en `test/`.

La suite e2e **exige un PostgreSQL accesible**: levanta la aplicación completa, crea su propia base de test, aplica las migraciones y la limpia entre pruebas. Si no hay base, falla en vez de omitirse. Corre en serie a propósito (comparten base); el porqué está comentado en `test/jest-e2e.js`. El comando **no** tolera la ausencia de specs: sin pruebas, falla.

## Arquitectura

API **NestJS 11**. `src/main.ts` crea la app, aplica `configurarApp` —la configuración compartida con la suite e2e, para que las pruebas ejerzan la misma aplicación que se despliega—, habilita CORS, monta Swagger y escucha. La estructura la manda el SRS (ver documento raíz):

- **Modular por dominio (RNF-10).** Un módulo Nest por contexto acotado: `usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`. Cablea cada uno como módulo de funcionalidad importado por `AppModule`.
- **Organización de archivos dentro de un módulo.** Cuando un módulo crece más allá de unos pocos archivos, agrúpalos en **subcarpetas** en vez de dejarlos planos, manteniendo el `*.module.ts` (y los tipos base compartidos, p. ej. `claims.ts`) en la raíz del módulo. El **eje** de agrupación depende de la naturaleza del módulo:
  - **Módulos de dominio (agregados)** → **por sub-dominio**, co-localizando en cada subcarpeta la entidad, el service, el controller, los DTOs, el mapeo de respuesta y sus specs de esa sub-parte. El sufijo del archivo (`.entity.ts`, `.service.ts`, `.controller.ts`…) ya indica el tipo, así que **no** se hace una carpeta por tipo. Ejemplos: `ideas/` → `idea/`, `hipotesis/`, `umbral/`; `usuarios/` → `usuario/`, `sesion/`.
  - **Módulos transversales/de infraestructura** → **por tipo técnico**, como ya hace `common/` (`errors/`, `pagination/`). Ejemplo: `auth/` → `guards/`, `decorators/`.
  El límite de un módulo lo fija el **contexto acotado**, no el grafo de dependencias: si un módulo necesita algo de otro, se **exporta/importa** entre módulos (nunca se fusionan por el mero hecho de que uno dependa del otro).
- **Validación con Zod (`nestjs-zod`).** Los DTOs HTTP (request y, donde aplique, respuesta) se validan con esquemas Zod vía `nestjs-zod`, no con `class-validator`. Así el backend tiene **una sola gramática de esquemas** compartida con la capa agéntica, que ya exige Zod. Los esquemas se derivan del contrato (`../contrato-api/openapi.yaml`), que sigue siendo la fuente de verdad.
- **Documentación de API con Swagger (`@nestjs/swagger`).** El backend sirve una documentación OpenAPI **viva** en `GET /docs` (JSON en `/docs-json`), configurada en `src/swagger/configurar-swagger.ts` y cableada en `main.ts`. Es la vista interactiva de lo que el backend **implementa**; la **fuente de verdad del contrato** sigue siendo `../contrato-api/openapi.yaml` (diseño primero). Aprovecha la misma gramática Zod: los DTOs `createZodDto` exponen su esquema OpenAPI de forma nativa (nestjs-zod v5) y `cleanupOpenApiDoc` post-procesa el documento — **no** se usa `patchNestJsSwagger` (retirado en v5). Documenta cada endpoint con `@ApiTags`/`@ApiOperation`/`@Api*Response` y marca los protegidos con `@ApiBearerAuth('bearerAuth')`; expón cuerpos de respuesta y errores como DTOs Zod (p. ej. `UsuarioRespuestaDto`, `ErrorRespuestaDto`) para que rindan como esquemas, nunca como interfaces sueltas.
- **Multi-tenant desde el primer día.** Cada consulta filtra por `owner_id`; ningún usuario ve datos de otro. Autenticación + RBAC + aislamiento por tenant son fundacionales (épico E0), no un añadido posterior. El RBAC se implementa con dos guards globales en `auth/`: `JwtAuthGuard` (exige token salvo `@Publico()`) y `RolesGuard` (exige rol sobre `@Roles(...)`, p. ej. `@Roles('administrador')`). Las operaciones de administración de cuentas son la **única** excepción al filtro por `owner_id`: un administrador gestiona todas las cuentas y el aislamiento lo sustituye el RBAC.
- **El Validador Inteligente** (el agente) es un servicio **LangGraph.js**, no una simple llamada a API. Vive en el módulo `agente` como **servicio inyectable desacoplado de los controladores**. Hace scoring de entrevistas (automático, al guardar) y veredictos de ideas (bajo demanda). Toda salida del agente se **valida con Zod** antes de poder tocar scores/KPIs/veredictos; la salida inválida se reintenta, nunca se persiste.
- **Capa agéntica agnóstica del proveedor (RNF-06).** Una capa de abstracción oculta las diferencias entre Anthropic/OpenAI/Google detrás de un adaptador común, seleccionado por usuario según su config BYOK. Añadir un cuarto proveedor no debe propagarse. Las listas curadas de modelos son configurables en tiempo de ejecución — **nunca cablear nombres de modelos en código**.
- **La persistencia es PostgreSQL con TypeORM** (entidades/repositorios por decoradores, inyectables vía DI de Nest). El esquema se versiona con **migraciones de TypeORM** como fuente de verdad — `synchronize: true` jamás fuera de un arranque local desechable. El filtrado por `owner_id` se aplica en cada consulta del repositorio, sin excepción. Los KPIs deben ser reconstruibles desde las entrevistas que los originan (RNF-15); una entrevista no puede existir sin una idea + contacto válidos del mismo usuario (RNF-14). Cuando un usuario ajusta un score del agente, se conservan ambos valores y el manual prevalece en el cálculo de KPIs.

El orden de prioridad del SRS para el camino crítico es: cuentas/aislamiento (E0) → ideas (E1) → hipótesis/umbrales (E2) → CRM de contactos (E3) → entrevistas + scoring por IA (E4) → KPIs/tablero (E5) → veredicto (E6) → config BYOK (E7) → costo/optimización (E8). Qué capacidades existen ya está en `openspec/specs/`, no aquí.

Mantén los identificadores de dominio en **español** para coincidir con el SRS (`idea`, `hipótesis`, `entrevista`, `veredicto`, `umbral`, `score`, `contacto`).

## Notas del toolchain

- **TypeScript está configurado en modo laxo**, no estricto: `strict` no está activado, `noImplicitAny: false`, `strictBindCallApply: false`. Solo `strictNullChecks` está activo. El modo de módulos es `nodenext`. Los metadatos de decoradores (`emitDecoratorMetadata` / `experimentalDecorators`) están activos para la DI de Nest.
- `npm run lint` y `npm run format` aplican correcciones en sitio (ambos usan `--fix` / `--write`). Este es el paquete que se encarga del linting del monorepo — `frontend/` solo tiene Prettier.

## Flujo OpenSpec

Este paquete usa **OpenSpec** (desarrollo guiado por especificación): el `openspec/` de aquí contiene `config.yaml`, `specs/` y `changes/`. Las funcionalidades sustanciales deben pasar por el ciclo propose → apply → verify → archive, dirigido por las skills `opsx:*` / `openspec-*`. Revisa `openspec/changes/` por trabajo en curso antes de empezar una funcionalidad.
