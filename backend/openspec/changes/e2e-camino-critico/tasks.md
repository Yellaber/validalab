## 1. Bootstrap compartido entre `main.ts` y el e2e

- [x] 1.1 Extraer de `src/main.ts` una función `configurarApp(app)` a un módulo propio, con lo que debe aplicarse por igual en producción y en tests: `cookieParser()` y cualquier middleware/interceptor global futuro
- [x] 1.2 Dejar **fuera** de esa función el CORS (depende del entorno y no interviene entre servidor y servidor) y Swagger (solo documentación; ralentizaría cada arranque de la suite), documentando el porqué
- [x] 1.3 `main.ts` queda como crear → `configurarApp` → CORS → Swagger → escuchar
- [x] 1.4 Verificar que `npm run start:dev` sigue sirviendo `/docs` y aceptando la cookie de refresh

## 2. Entorno y configuración de la suite

- [x] 2.1 `test/setup-env.ts` (`setupFiles` de Jest): fija `process.env` antes de que cargue la app — `NODE_ENV=test`, `DB_DATABASE` de test, `JWT_ACCESS_SECRET`, `BYOK_CLAVE_CIFRADO`, `BOOTSTRAP_TOKEN` fijo, `AGENTE_MODO=fake`, `BYOK_VALIDAR_KEY=false`
- [x] 2.2 Comentar en ese archivo que `process.env` gana sobre `.env` (dotenv no pisa lo definido), que es lo que permite no tocar `ConfigModule`
- [x] 2.3 Advertir en un comentario que `DB_DATABASE` apunta a una base **de test** que se vacía entre pruebas, y el riesgo de apuntarla a la de desarrollo
- [x] 2.4 `test/jest-e2e.json`: añadir `setupFiles`, `maxWorkers: 1` (o `--runInBand` en el script) y un `testTimeout` holgado para el arranque con migraciones
- [x] 2.5 Comentar en la configuración **por qué** la ejecución es en serie, para que quien reactive el paralelismo sepa que compartiría base

## 3. Utilidades de la suite

- [x] 3.1 `test/utils/app-e2e.ts`: crea la base de test si no existe, aplica las migraciones, levanta la app con `AppModule` + `configurarApp` y devuelve `{ app, dataSource }`
- [x] 3.2 Falla de forma explícita si no hay PostgreSQL accesible — nunca omitir la suite en silencio
- [x] 3.3 `limpiarBaseDeDatos(dataSource)`: `TRUNCATE ... RESTART IDENTITY CASCADE` sobre todas las tablas **salvo** `migrations` y los catálogos sembrados por migración (`modelos_ia`, `precios_modelo`)
- [x] 3.4 `test/utils/tenant.ts`: alta de tenant autenticado (registro + login) con email único por llamada, devolviendo token, cookie y datos de la cuenta
- [x] 3.5 Utilidad para crear un `administrador` vía `POST /sistema/inicializar` con el secreto de test
- [x] 3.6 Cierre limpio de la app y del `DataSource` al terminar cada spec, para que Jest no quede colgado

## 4. Spec: ciclo de sesión

- [x] 4.1 Registro → `201` con rol `validador`, sin `passwordHash` en la respuesta
- [x] 4.2 Login → `accessToken` utilizable contra una ruta protegida y cookie de refresh establecida
- [x] 4.3 Refresh → nuevo `accessToken` y **rotación** de la cookie (la anterior deja de servir)
- [x] 4.4 Logout → el refresh token queda invalidado
- [x] 4.5 Ruta protegida sin token y con token inválido → `NO_AUTENTICADO`

## 5. Spec: aislamiento multi-tenant

- [x] 5.1 Dos tenants reales, cada uno con sus recursos creados por HTTP
- [x] 5.2 Listar la colección devuelve **solo** lo propio, para ambos tenants
- [x] 5.3 Pedir por id un recurso ajeno → rechazado sin exponer datos del recurso
- [x] 5.4 Modificar o eliminar un recurso ajeno → rechazado
- [x] 5.5 Crear un recurso enviando un `owner_id` ajeno → el recurso queda bajo el `owner_id` del token y el otro tenant sigue sin verlo

## 6. Spec: RBAC de administración

- [x] 6.1 Un `validador` autenticado recibe `ACCESO_DENEGADO` en las cuatro operaciones `@Roles('administrador')`
- [x] 6.2 Un `administrador` (creado por la inicialización) lista las cuentas correctamente
- [x] 6.3 Comprobar que el rechazo es `403 ACCESO_DENEGADO` y no `401`: el `validador` está autenticado, lo que le falta es autorización

## 7. Spec: inicialización del sistema

- [x] 7.1 Sin cabecera `X-Bootstrap-Token` → `NO_AUTENTICADO`, sistema sin inicializar
- [x] 7.2 Con secreto incorrecto → `NO_AUTENTICADO`
- [x] 7.3 Con secreto correcto → `201` con rol `administrador` y estado `activo`, sin credenciales ni sesión en la respuesta
- [x] 7.4 Repetir con el secreto correcto → `CONFLICTO`
- [x] 7.5 Tras inicializar, `POST /usuarios/registro` sigue devolviendo `validador`

## 8. Script y CI

- [x] 8.1 Quitar `--passWithNoTests` de `test:e2e` en `package.json`
- [x] 8.2 Añadir al job `Backend (NestJS)` de `.github/workflows/ci.yml` un `services: postgres` con healthcheck (`pg_isready`) y credenciales de test
- [x] 8.3 Pasar al paso «E2E tests» las variables de entorno de la base del servicio
- [x] 8.4 Verificar que el paso e2e **falla** si se borran las specs (comprobación local del punto 8.1)

## 9. Verificación

- [x] 9.1 `npm run test:e2e` en verde contra el PostgreSQL del `docker compose`, partiendo de una máquina sin la base de test creada
- [x] 9.2 Ejecutar la suite dos veces seguidas: debe pasar igual, sin arrastrar estado
- [x] 9.3 `npm test` (unitarios) sigue en verde, sin regresiones por la extracción de `configurarApp`
- [x] 9.4 `npm run lint` sin hallazgos y `npm run build` limpio
- [x] 9.5 Confirmar que la base de **desarrollo** no se ve afectada por ejecutar la suite
- [x] 9.6 Revisar el diff: `contrato-api/openapi.yaml` no aparece; el único archivo fuera de `backend/` es el workflow de CI
- [x] 9.7 `openspec validate --strict` sobre el change
