## Why

El backend es todavía el scaffold por defecto de NestJS: sin configuración, sin persistencia, sin autenticación y sin las convenciones transversales que el contrato (`../contrato-api/openapi.yaml`) impone a **toda** operación. Antes de implementar cualquier endpoint de dominio hace falta una base que los 7 módulos reutilicen sin reinventarla: aislamiento multi-tenant, sobre de error estable, paginación y validación. Construirla primero (épico E0) evita que cada controlador improvise estas piezas de forma incoherente.

## What Changes

- **Configuración por entorno validada**: se introduce `@nestjs/config` con validación del entorno al arranque; la app falla rápido si falta una variable obligatoria (cadena de conexión, secretos JWT, etc.).
- **Persistencia PostgreSQL con TypeORM**: `DataSource` configurado, repositorios inyectables y **migraciones como única fuente de verdad del esquema**; `synchronize` queda prohibido fuera de un arranque local desechable.
- **Sobre de error estándar**: un filtro global de excepciones traduce todo error al sobre `Error` del contrato con un `codigo` del catálogo `CodigoError`. Ningún endpoint emite errores con forma propia.
- **Autenticación JWT + aislamiento multi-tenant**: un guard valida el `Authorization: Bearer <token>`, deriva el `owner_id` **del token** (nunca del cliente) y lo expone a la capa de dominio. Token ausente/ inválido → `401 NO_AUTENTICADO`; recurso de otro `owner_id` → `403 ACCESO_DENEGADO`.
- **Paginación uniforme**: parámetros `pagina`/`porPagina` y respuesta en el sobre `RespuestaPaginada` con bloque `paginacion`, reutilizable por toda colección.
- **Validación con Zod (`nestjs-zod`)**: pipe de validación global que valida los DTOs HTTP con esquemas Zod, unificando una sola gramática de esquemas con la capa agéntica. Entrada inválida → `400 VALIDACION_FALLIDA` con `detalles` campo a campo.

Sin endpoints de dominio: este change entrega **solo la base** sobre la que luego se construyen `usuarios` (E0) e `ideas` (E1). La emisión de tokens (login/registro/refresh) pertenece al módulo `usuarios`; aquí se entrega únicamente la infraestructura de **verificación** y el guard.

## Capabilities

### New Capabilities
- `arranque-plataforma`: configuración por entorno validada al arranque, conexión PostgreSQL vía TypeORM con migraciones como fuente de verdad, y pipe global de validación Zod (`nestjs-zod`) para los DTOs HTTP.
- `manejo-errores-api`: filtro global de excepciones que normaliza toda salida de error al sobre `Error` con `codigo` estable del catálogo `CodigoError`, incluyendo `detalles` de validación campo a campo.
- `autenticacion-multitenant`: guard de autenticación JWT que deriva el `owner_id` del token y lo impone como frontera de aislamiento; respuestas `401 NO_AUTENTICADO` y `403 ACCESO_DENEGADO` según el contrato.
- `paginacion-colecciones`: contrato transversal de paginación —parámetros `pagina`/`porPagina` y sobre `RespuestaPaginada` con bloque `paginacion`— reutilizable por cualquier endpoint de colección.

### Modified Capabilities
<!-- Ninguna: backend/openspec/specs/ está vacío; todas las capabilities son nuevas. -->

## Impact

- **Código**: nuevos módulos/proveedores transversales bajo `backend/src/` (p. ej. `config/`, `database/`, `common/` con filtro, guard, decoradores y pipe). `AppModule` los cablea globalmente. `main.ts` registra el filtro y el pipe globales.
- **Dependencias nuevas**: `@nestjs/config`, `@nestjs/typeorm` + `typeorm` + `pg`, `@nestjs/jwt` (verificación), `nestjs-zod` + `zod`.
- **Configuración**: variables de entorno (conexión PostgreSQL, secreto/TTL de JWT); plantilla `.env.example`. Scripts de migración de TypeORM en `package.json`.
- **Contrato**: implementa las convenciones transversales del contrato (sobre `Error`/`CodigoError`, `RespuestaPaginada`, `bearerAuth`, aislamiento por `owner_id`). No modifica el contrato.
- **Documentación**: `CLAUDE.md` (raíz y backend) ya actualizados con TypeORM y Zod; viajan en esta rama.
