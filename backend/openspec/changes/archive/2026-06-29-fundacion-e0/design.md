## Context

El backend es el scaffold por defecto de NestJS 11 (solo `AppController`/`AppService`), TypeScript en modo laxo, módulos `nodenext`, decoradores activos para DI. El contrato `../contrato-api/openapi.yaml` ya fija las convenciones transversales que esta fundación debe materializar:

- Seguridad `bearerAuth` (JWT) en toda operación salvo `security: []` (registro/login/refresh).
- Sobre `Error` `{ codigo, mensaje, detalles? }` con `codigo` del enum `CodigoError`.
- `RespuestaPaginada` `{ datos[], paginacion }` y parámetros `pagina` (≥1, def. 1) / `porPagina` (1–100, def. 20).
- Aislamiento: `owner_id` derivado del token, nunca aceptado del cliente.

Decisiones de stack ya tomadas y registradas en `CLAUDE.md`: **TypeORM** para persistencia, **Zod (`nestjs-zod`)** para validación HTTP.

## Goals / Non-Goals

**Goals:**
- Entregar la plomería transversal que todo módulo de dominio reutiliza sin reimplementar: config, persistencia, errores, auth+aislamiento, paginación, validación.
- Que el aislamiento multi-tenant sea estructural: el `owner_id` solo puede provenir del token verificado.
- Que el esquema de BD se gobierne por migraciones versionadas, reproducibles en CI.
- Dejar puntos de extensión claros para que `usuarios` (E0) e `ideas` (E1) se enchufen sin tocar la base.

**Non-Goals:**
- **No** se implementa ningún endpoint de dominio (ni `/usuarios/*`, ni `/ideas/*`).
- **No** se emite ni se almacena el `refreshToken` (eso es del módulo `usuarios`); aquí solo se **verifica** el `accessToken`.
- **No** se define el esquema de tablas de dominio; solo la infraestructura de conexión/migraciones y, a lo sumo, la migración inicial vacía o de extensiones (`uuid`).
- **No** se aborda RBAC por rol a nivel de endpoint (se prepara el `owner_id`/claims; la autorización por `rol` se afina al implementar cada dominio).

## Decisions

### D1 — TypeORM con `DataSource` y migraciones, sin `synchronize`
Entidades/repositorios por decoradores, inyectables vía `@nestjs/typeorm`. El esquema se versiona con **migraciones de TypeORM** como única fuente de verdad. `synchronize: true` queda prohibido salvo en un arranque local desechable controlado por entorno. Un `DataSource` exportado (data-source.ts) sirve tanto a la app como a la CLI de migraciones.
- *Alternativas*: Prisma (mejor DX pero menos idiomático con la DI de Nest, ya descartado por el usuario); `synchronize` automático (rechazado: no reproducible, peligroso en datos reales).

### D2 — Configuración validada al arranque (fail-fast)
`@nestjs/config` global con un esquema de validación (Zod, coherente con D5) de las variables de entorno. Si falta una variable obligatoria (conexión PostgreSQL, secreto JWT, TTLs), la app **no arranca**. Se provee `.env.example`. La config se consume vía un servicio tipado, nunca leyendo `process.env` disperso.

### D3 — Filtro global de excepciones → sobre `Error`
Un `ExceptionFilter` global captura toda excepción y produce el sobre `Error` del contrato. Mapeo explícito **excepción → `CodigoError` + HTTP status**:
- `NO_AUTENTICADO` → 401, `ACCESO_DENEGADO` → 403, `RECURSO_NO_ENCONTRADO` → 404, `CONFLICTO` → 409, `VALIDACION_FALLIDA` → 400/422, `LIMITE_TASA` → 429, `ERROR_INTERNO` → 500 (catch-all).
- Los errores de validación de Zod se traducen a `VALIDACION_FALLIDA` con `detalles: [{ campo, problema }]`.
- Se definen excepciones de dominio semánticas (p. ej. `AccesoDenegadoException`) que el filtro reconoce, para que los módulos lancen intención, no detalles HTTP.
Nunca se filtran stack traces ni se revela la existencia de recursos ajenos (un recurso de otro `owner_id` responde igual que uno inexistente cuando el contrato lo exige).

### D4 — Auth JWT + aislamiento como guard global + decorador `@Publico()`
Un `JwtAuthGuard` global verifica el `accessToken` (firma + expiración) usando `@nestjs/jwt`. Por defecto **toda** ruta exige token; las rutas públicas del contrato (`registro`, `login`, `refresh`) se marcan con un decorador `@Publico()` que el guard respeta (equivalente a `security: []`). El guard:
1. Sin token / inválido / expirado → `401 NO_AUTENTICADO`.
2. Con token válido → extrae claims (`sub` = `owner_id`, `rol`) y los adjunta al request.
Se provee un decorador de parámetro `@OwnerId()` (y `@UsuarioActual()`) para que los servicios de dominio obtengan el `owner_id` **solo** de esta fuente. El aislamiento efectivo (filtrar cada query por `owner_id`, y devolver `403 ACCESO_DENEGADO` ante recursos ajenos) se aplicará en cada repositorio de dominio; esta fundación entrega el mecanismo y la convención, no las queries.
- *Frontera*: la **emisión** de tokens (firmar access/refresh, persistir/rotar refresh) vive en `usuarios`. Aquí se configura el `JwtModule` (secreto/TTL desde config) y se entrega la **verificación**.

### D5 — Validación con `nestjs-zod` como pipe global
Pipe de validación global basado en `nestjs-zod`: los DTOs se declaran con esquemas Zod (`createZodDto`). Entrada inválida → `VALIDACION_FALLIDA` con `detalles` campo a campo (integrado con D3). Una sola gramática de esquemas compartida con la futura capa agéntica (que el SRS ya obliga a usar Zod).
- *Alternativa*: `class-validator` (idiomático en Nest) descartado para no mantener dos sistemas de validación en paralelo.

### D6 — Paginación transversal reutilizable
Un DTO de query de paginación (Zod) con `pagina`/`porPagina` (coerción + límites del contrato: `pagina≥1` def. 1, `porPagina` 1–100 def. 20) y un helper/genérico `RespuestaPaginada<T>` que construye `{ datos, paginacion: { pagina, porPagina, total, totalPaginas } }`. Los módulos lo consumen; no reimplementan el cálculo.

## Risks / Trade-offs

- **El aislamiento depende de que cada módulo filtre por `owner_id`** → la fundación entrega decorador + convención + excepción semántica, pero un repositorio que olvide filtrar rompe el aislamiento. Mitigación: documentarlo como regla en `backend/CLAUDE.md` (ya presente) y cubrirlo con tests de aislamiento en cada dominio; considerar un patrón base de repositorio scoping en E1.
- **`nestjs-zod` es menos idiomático** que `class-validator` y acopla a una librería de terceros → Mitigación: aislar su uso tras DTOs (`createZodDto`) y el pipe global, de modo que un cambio futuro quede contenido.
- **Migraciones manuales** son más laboriosas que `synchronize` → Mitigación: scripts npm para generar/ejecutar/revertir migraciones y ejecutarlas en CI; aceptado a cambio de reproducibilidad.
- **TypeScript en modo laxo** reduce garantías de tipo en límites (p. ej. claims del JWT) → Mitigación: validar los claims al verificar el token y tipar el `request.user` resultante.

## Migration Plan

1. Añadir dependencias y `.env.example`; documentar variables.
2. Cablear `ConfigModule` validado y `TypeOrmModule` (async, desde config) + `DataSource` para la CLI.
3. Crear la migración inicial (extensión `uuid`/baseline) y los scripts npm de migración.
4. Registrar globalmente: filtro de excepciones, pipe Zod y `JwtAuthGuard` (+ `JwtModule`).
5. Verificar arranque (`start:dev`), fallo-rápido sin env, y que una ruta protegida de prueba responde `401` sin token. Rollback: revertir el change; al no haber dominio ni datos productivos, el riesgo es nulo.

## Open Questions

- Estrategia de almacenamiento/rotación del `refreshToken` → se decide al implementar `usuarios` (fuera de alcance aquí).
- ¿`JwtAuthGuard` global con `@Publico()`, o guard por módulo? Se adopta **global + opt-out** por seguridad por defecto; revisable si aparece un caso de muchas rutas públicas.
- Afinado de RBAC por `rol` a nivel de ruta → se resolverá con un `RolesGuard` cuando los endpoints de gestión de usuarios lo requieran.
