## Context

El backend tiene 39 suites y 276 tests unitarios en verde, y cero tests e2e. La carpeta existe, la configuración de Jest existe, el script existe y el paso de CI existe — solo faltan las pruebas. `--passWithNoTests` convierte esa ausencia en un aprobado.

Cinco hechos del código acotan el diseño:

1. **Todo lo global vive en módulos salvo el bootstrap.** `AppModule` aporta `APP_FILTER` y `APP_PIPE`; `AuthModule` aporta los dos `APP_GUARD`. Un `Test.createTestingModule({ imports: [AppModule] })` los hereda todos. Pero `main.ts` aplica `cookieParser()` por su cuenta, fuera de cualquier módulo.
2. **La sesión depende de esa cookie.** El refresh token viaja en una cookie `HttpOnly` que `/usuarios/refresh` y `/usuarios/logout` leen con `req.cookies`. Sin `cookieParser`, esos dos endpoints no funcionan.
3. **Las migraciones son la fuente de verdad** (`migrationsRun: false`, `synchronize: false`), y son 16.
4. **`process.env` gana sobre `.env`**: dotenv no pisa variables ya definidas, así que el entorno del e2e puede fijarse antes de que la app cargue sin tocar `ConfigModule`.
5. **`AGENTE_MODO=fake`** produce scoring determinista sin salir a la red, así que la suite no depende de ningún proveedor externo.

## Goals / Non-Goals

**Goals:**
- Que el paso «E2E tests» del CI pueda ponerse en rojo.
- Verificar los invariantes que solo existen con la app completa: aislamiento, RBAC, sesión con cookie, inicialización de un solo uso.
- Probar **la app real**, no una réplica montada a mano en los tests.
- Dejar utilidades sobre las que extender la cobertura sin repetir andamiaje.

**Non-Goals:**
- Cobertura e2e por dominio (queda para cambios posteriores).
- Cambiar cualquier comportamiento de producción: este change verifica, no modifica.
- Tests de carga, rendimiento o e2e del frontend.

## Decisions

### D1 — Extraer `configurarApp(app)` y compartirlo entre `main.ts` y el e2e
Es la decisión que más valor aporta y la única que toca código de producción.

La alternativa —llamar a `app.use(cookieParser())` dentro del helper de tests— funciona hoy y es de una línea. Se descarta porque crea **dos definiciones de qué es la aplicación**: la de `main.ts` y la del helper. En el momento en que alguien añada un middleware, un interceptor global o un prefijo de ruta al bootstrap real, el e2e seguirá probando la app anterior y lo hará **en verde**, que es la peor forma de fallar. Un test que aprueba mientras verifica algo distinto de lo que se despliega es peor que no tener test.

Con la función compartida, `main.ts` queda como crear → configurar → escuchar, y el e2e llama exactamente a la misma configuración. El CORS y Swagger se quedan fuera de ella: el primero depende del entorno y no interviene en peticiones de servidor a servidor; el segundo solo monta documentación y ralentizaría cada arranque de la suite.

### D2 — Base de datos separada, con migraciones y no con `synchronize`
La suite corre contra una base propia (`DB_DATABASE` de test), no contra la de desarrollo: un `TRUNCATE` entre tests sobre la base real destruiría los datos de trabajo de quien la ejecute en local, y eso ocurre una vez y no se perdona.

El esquema se crea aplicando las **migraciones**, no con `synchronize: true`. La alternativa es tentadora —una línea, sin dependencias de orden— y se descarta por dos razones: rompería la regla de que las migraciones son la fuente de verdad del esquema, y perdería un beneficio gratuito. Aplicándolas en cada ejecución, **la suite verifica también las migraciones**: una migración rota deja de ser algo que se descubre al desplegar.

La creación de la base, si no existe, la hace el arranque de la suite conectándose a la base administrativa. Así `npm run test:e2e` funciona en una máquina limpia sin pasos previos manuales.

### D3 — Limpieza por `TRUNCATE`, no recreando el esquema
Entre tests se vacían todas las tablas con `TRUNCATE ... RESTART IDENTITY CASCADE`, **excepto `migrations`** —borrarla haría que TypeORM creyera el esquema sin aplicar— y excepto las tablas sembradas por migración (`modelos_ia`, `precios_modelo`), que son datos de catálogo, no estado de prueba.

Recrear el esquema entre tests sería más limpio conceptualmente y demasiado lento: 16 migraciones por test. `TRUNCATE ... CASCADE` en una sola sentencia es prácticamente instantáneo y deja la base en el mismo estado.

Que `inicializacion_sistema` se vacíe es lo que permite al spec de `sistema` probar la inicialización desde cero en cada caso.

### D4 — Entorno inyectado por `setupFiles`, sin tocar `ConfigModule`
Un archivo de setup fija `process.env` antes de que Jest cargue la aplicación. Como dotenv no pisa lo ya definido, la app arranca con el entorno de test aunque exista un `.env` de desarrollo.

Alternativas descartadas: añadir `envFilePath` condicional a `ConfigModule` (mete lógica de test en código de producción) y exigir un `.env.test` a mano (rompe «clonar y ejecutar», y el archivo no se versiona por la regla de `.gitignore`).

Los valores de test incluyen `AGENTE_MODO=fake` y `BYOK_VALIDAR_KEY=false` —ninguna prueba sale a la red— y un `BOOTSTRAP_TOKEN` fijo, que no es un secreto real porque solo existe dentro de la suite.

### D5 — Ejecución en serie (`--runInBand`)
Jest paraleliza por defecto y todos los workers compartirían la misma base: el `TRUNCATE` de un spec borraría los datos de otro a mitad de ejecución, produciendo fallos intermitentes —la clase de fallo que erosiona la confianza en una suite hasta que alguien la desactiva.

La alternativa correcta a largo plazo es una base por worker (`DB_DATABASE=validalab_test_${JEST_WORKER_ID}`), y con cuatro specs no compensa: multiplicaría por cuatro la creación de esquemas para ahorrar segundos. Queda anotado como el camino a seguir si la suite crece hasta que el tiempo en serie moleste.

### D6 — Cada spec crea sus propios tenants; nada se comparte entre tests
Las utilidades exponen un alta de tenant que registra, inicia sesión y devuelve el token. Cada test crea los que necesita con emails únicos.

Compartir un tenant entre tests mediante `beforeAll` acoplaría el orden de ejecución y haría que un fallo temprano arrastrase a los siguientes. El coste de registrar un usuario por test es un hash de contraseña, asumible.

### D7 — El `409` sin `--passWithNoTests`
Quitar el flag es media línea y es el núcleo del change: mientras esté, borrar todas las specs dejaría el CI en verde. Con él fuera, la ausencia de pruebas es un fallo, que es lo que debe ser.

## Risks / Trade-offs

- **El CI del backend se vuelve más lento** → arranque del contenedor de Postgres más 16 migraciones. Es el precio de que el paso signifique algo; el job ronda hoy los 45 s y el margen es amplio.
- **Fallos intermitentes si alguien reactiva el paralelismo** → mitigado por D5 y anotado en el propio `jest-e2e.json` para que quien lo toque sepa por qué está en serie.
- **La suite depende de un Postgres accesible** → en local, el `docker compose` del repositorio; en CI, el servicio del workflow. Si no hay base, la suite falla en vez de saltarse las pruebas en silencio, que es la postura correcta: un e2e que se auto-omite reintroduce el falso verde que este change elimina.
- **`configurarApp` toca `main.ts`, código de producción** → el cambio es puramente de ubicación y queda cubierto por la propia suite e2e que lo motiva: si la extracción rompiera el bootstrap, las pruebas de sesión fallarían de inmediato.
- **La base de test se destruye entre tests** → por eso es una base aparte, con nombre distinto por defecto. Un operador que apunte `DB_DATABASE` de test a su base real perdería datos; el archivo de setup lo advierte en un comentario.
- **Cuatro specs no son cobertura** → deliberado. El objetivo es eliminar el falso verde y sentar las utilidades; ampliar es barato una vez existen.

## Migration Plan

No aplica a datos ni a despliegue: el change no altera el esquema ni el comportamiento en producción.

Para quien desarrolle en local: `docker compose up -d` y `npm run test:e2e`. La base de test se crea sola si no existe.

## Open Questions

Ninguna. El alcance (camino crítico) lo fijó el usuario; el resto de decisiones —app compartida, base separada con migraciones, limpieza por `TRUNCATE`, entorno por `setupFiles`, ejecución en serie— quedan resueltas arriba.
