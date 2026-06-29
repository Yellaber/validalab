## 1. Dependencias y entorno

- [x] 1.1 Añadir dependencias: `@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/jwt`, `nestjs-zod`, `zod`
- [x] 1.2 Crear `.env.example` con las variables obligatorias (conexión PostgreSQL, secreto JWT, TTL de access token) y documentarlas
- [x] 1.3 Añadir a `package.json` los scripts de migración de TypeORM (generar, ejecutar, revertir, mostrar)

## 2. Configuración validada (arranque-plataforma)

- [x] 2.1 Definir el esquema Zod de variables de entorno y un servicio de configuración tipado
- [x] 2.2 Registrar `ConfigModule` global con validación fail-fast (la app aborta el arranque si falta/inválida una variable obligatoria)
- [x] 2.3 Test: el arranque falla con mensaje claro cuando falta una variable obligatoria

## 3. Persistencia PostgreSQL con TypeORM (arranque-plataforma)

- [x] 3.1 Configurar `TypeOrmModule.forRootAsync` desde el servicio de configuración (sin `synchronize` salvo flag de entorno local desechable)
- [x] 3.2 Crear `data-source.ts` exportable, reutilizable por la app y por la CLI de migraciones
- [x] 3.3 Crear la migración inicial baseline (extensión `pgcrypto` para `gen_random_uuid()`); verificado `migration:run`/`migration:revert`/`migration:show` contra PostgreSQL 14 (Docker).

## 4. Validación con Zod (arranque-plataforma)

- [x] 4.1 Registrar el pipe de validación global de `nestjs-zod` en el bootstrap
- [x] 4.2 Establecer la convención de DTOs con `createZodDto` (ejemplo mínimo de referencia)
- [x] 4.3 Test: un payload inválido produce `VALIDACION_FALLIDA` con `detalles` campo a campo _(nivel pipe: `ZodValidationException` con issues campo a campo; el sobre `VALIDACION_FALLIDA` end-to-end se prueba en 5.6 con el filtro)_

## 5. Manejo de errores (manejo-errores-api)

- [x] 5.1 Definir el tipo del sobre `Error` y el enum `CodigoError` alineados con el contrato
- [x] 5.2 Definir excepciones de dominio semánticas (p. ej. `AccesoDenegadoException`, `RecursoNoEncontradoException`)
- [x] 5.3 Implementar el `ExceptionFilter` global con el mapeo excepción → (`CodigoError`, HTTP status); catch-all → `ERROR_INTERNO` 500 sin filtrar trazas
- [x] 5.4 Integrar los errores de validación de Zod → `VALIDACION_FALLIDA` con `detalles`
- [x] 5.5 Registrar el filtro globalmente en el bootstrap
- [x] 5.6 Tests: excepción de dominio normalizada, error inesperado → `ERROR_INTERNO`, validación → `detalles`

## 6. Autenticación JWT y aislamiento (autenticacion-multitenant)

- [x] 6.1 Configurar `JwtModule` (secreto y TTL desde configuración) para verificación de `accessToken`
- [x] 6.2 Implementar `JwtAuthGuard` global: verifica firma/expiración; sin token o inválido → `401 NO_AUTENTICADO`
- [x] 6.3 Implementar el decorador `@Publico()` y exenciones para rutas `security: []` (registro/login/refresh)
- [x] 6.4 Validar y tipar los claims; adjuntar `usuario` (`owner_id` = `sub`, `rol`) al request
- [x] 6.5 Implementar los decoradores de parámetro `@OwnerId()` y `@UsuarioActual()` como única fuente del `owner_id`
- [x] 6.6 Documentar/definir la convención de filtrado por `owner_id` en repositorios (excepción `ACCESO_DENEGADO` para recursos ajenos)
- [x] 6.7 Tests: ruta protegida sin token → 401; token inválido/expirado → 401; ruta pública sin token → pasa; `owner_id` del cliente ignorado

## 7. Paginación (paginacion-colecciones)

- [x] 7.1 Crear el DTO de paginación (Zod) con `pagina` (≥1, def. 1) y `porPagina` (1–100, def. 20) y coerción
- [x] 7.2 Crear el genérico/constructor `RespuestaPaginada<T>` que calcula `{ pagina, porPagina, total, totalPaginas }`
- [x] 7.3 Tests: defaults aplicados, `porPagina` fuera de rango → `VALIDACION_FALLIDA`, cálculo de `totalPaginas`

## 8. Cableado y verificación final

- [x] 8.1 Cablear todos los proveedores transversales en `AppModule` y registrar filtro/pipe/guard globales (`APP_FILTER`/`APP_PIPE` en `AppModule`, `APP_GUARD` en `AuthModule`)
- [x] 8.2 Verificar arranque y ruta protegida → `GET /` sin token responde `401 {"codigo":"NO_AUTENTICADO"}` (app conectada a PostgreSQL)
- [x] 8.3 Ejecutar `npm run lint` y `npm test` en verde (lint limpio, tsc limpio, 28/28 tests)
- [x] 8.4 Verificar el change con la skill de verificación de OpenSpec antes de archivar (sin issues críticos; 1 warning por diseño diferido al primer módulo de dominio)
