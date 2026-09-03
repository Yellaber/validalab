## Context

El repositorio está completo y verificado, y no tiene un solo artefacto de despliegue: ni `Dockerfile`, ni configuración de plataforma, ni sección de despliegue en el `README`. El único `docker-compose.yml` vive en `backend/` y levanta un PostgreSQL de desarrollo.

Cinco hechos del código acotan el diseño:

1. **La cookie de refresh fija `sameSite: 'strict'` en código.** `backend/src/usuarios/sesion/cookie-sesion.ts` lo escribe literalmente en las dos funciones —emisión y limpieza—; solo `secure` viene del entorno. Con el frontend en `*.vercel.app` y el backend en `*.up.railway.app` —dominios registrables distintos— el navegador no adjuntaría la cookie a `POST /usuarios/refresh`, y la sesión moriría al expirar el `accessToken` (15 min por defecto).
2. **`buildDataSourceOptions` no contempla SSL.** `backend/src/database/typeorm-options.ts` construye las opciones sin `ssl`, y PostgreSQL gestionado lo exige. Es un fallo de arranque, no una degradación.
3. **`environment.ts` de producción usa `baseUrl: '/api'`**, asumiendo un proxy inverso del mismo origen que este despliegue no tiene. Además, `/api/usuarios/refresh` no casaría con el `Path=/usuarios` de la cookie ni aunque el proxy existiera.
4. **`typeorm` y `dotenv` son dependencias de producción**, no de desarrollo. Eso es lo que hace viable ejecutar migraciones desde la imagen final sin devDependencies: el binario `typeorm` está en `node_modules/.bin` y `data-source.ts` compila a `dist/database/data-source.js`. El script actual (`typeorm-ts-node-commonjs -d src/database/data-source.ts`) **no** sirve ahí, porque `ts-node` y `typescript` sí son de desarrollo.
5. **La build de Angular sale a `dist/frontend/browser`.** `angular.json` no declara `outputPath`, así que el builder `@angular/build:application` usa el nombre del proyecto y su subdirectorio `browser/`. Ninguna autodetección de plataforma acierta con eso.

Y un hecho de proceso: el `README` documenta el arranque **local** de un sistema nuevo con todo detalle —migraciones e inicialización incluidas— y nada sobre desplegarlo. El orden de los pasos remotos no es el mismo, porque hay dependencias circulares entre plataformas que en local no existen.

## Goals / Non-Goals

**Goals:**
- Que el proyecto exista en una URL pública y se pueda usar de extremo a extremo: registrarse, entrar, y que la sesión sobreviva a la expiración del `accessToken`.
- Parametrizar por entorno lo que hoy está fijado en código y solo es correcto en local: atributos de la cookie, SSL a la base de datos, origen del backend.
- Dejar el despliegue **reproducible desde cero** por escrito: qué variable fija cada plataforma y en qué orden, incluida la inicialización del sistema.
- No romper el desarrollo local: los valores por defecto siguen siendo los de hoy.

**Non-Goals:**
- Dominio propio y subdominios `app.` / `api.`, que permitirían conservar `SameSite=Strict`. Se descarta a favor del coste cero en el frontend.
- Despliegue automático desde el CI. Cada plataforma despliega desde su propia integración con GitHub.
- Entornos de *staging*, monitorización, alertas y endpoint de salud.
- Cubrir los *preview deployments* de Vercel, que reciben una URL distinta en cada PR.
- Endurecer la verificación del certificado de la base de datos más allá del cifrado en tránsito (ver R3).

## Decisions

### D1 — Vercel + Railway (Hobby) + Supabase

Frontend estático en **Vercel**, base de datos **PostgreSQL en Supabase**, backend en contenedor en **Railway, plan Hobby (5 $/mes)**.

Railway ya no tiene plan gratuito, y se eligió de pago **a propósito**. Las alternativas gratuitas para un backend siempre activo duermen el servicio por inactividad, y el arranque en frío de 30–50 s cae justo en la primera petición de quien abre el enlace por primera vez. El objetivo de este despliegue es **portafolio**: la primera impresión es el entregable, y 5 $/mes es el precio de no arruinarla. Frontend y base de datos sí van en plan gratuito porque ahí el plan gratuito no duerme el servicio en el camino crítico.

### D2 — `SameSite` se lee del entorno, no se fija en código

`opcionesCookieRefresh` y `opcionesLimpiezaCookieRefresh` reciben `sameSite` como parámetro, igual que ya reciben `secure`. Nueva variable `COOKIE_SAMESITE` (`strict` | `lax` | `none`), **`strict` por defecto**.

Parametrizar en vez de cambiar la constante a `none` no es indecisión: una cookie `SameSite=None` **exige** `Secure`, y el navegador descarta la que llegue sin él. El desarrollo local va por `http://localhost`, donde `Secure` no es aceptable. Fijar `none` a secas rompería el desarrollo; fijar `strict` rompe el despliegue. El atributo depende de la topología, así que la topología es quien debe decirlo.

Las dos funciones cambian a la vez y con el mismo valor. Si la cookie se emite con un `SameSite` y se intenta limpiar con otro, el navegador no la borra: en logout, la sesión quedaría revocada en base de datos pero la cookie muerta seguiría en el navegador.

### D3 — La combinación incoherente aborta el arranque

El esquema Zod del entorno gana una validación cruzada: `COOKIE_SAMESITE=none` con `COOKIE_SECURE=false` es un error de configuración y **aborta el arranque** con un mensaje que lo explica.

Es el mismo criterio *fail-fast* que la capacidad `arranque-plataforma` ya aplica variable a variable, extendido a una regla que ninguna variable puede comprobar por su cuenta. Sin ella, el fallo se manifiesta como una sesión que se cae sola quince minutos después de entrar —el síntoma más caro de diagnosticar que tiene este change— en lugar de como un proceso que no arranca y dice por qué.

### D4 — `SameSite=None` es aceptable aquí, y por qué

`SameSite=None` reduce la mitigación de CSRF, así que hay que decir exactamente sobre qué.

La cookie de refresh autentica **dos** endpoints: `POST /usuarios/refresh` y `POST /usuarios/logout`. Ningún otro. Todo lo que modifica estado en ValidaLab —ideas, hipótesis, contactos, entrevistas, BYOK— se autentica con `Authorization: Bearer`, una cabecera que un sitio de terceros no puede añadir a una petición entre orígenes, así que es inmune a CSRF por construcción.

Lo que un CSRF podría lograr con la cookie expuesta:

- Sobre `logout`: cerrarle la sesión al usuario. Es una molestia, no una escalada; la operación ya es idempotente y solo destruye la sesión propia.
- Sobre `refresh`: forzar una rotación del refresh token. El atacante no ve la respuesta —CORS con credenciales solo permite leerla desde los orígenes de la lista blanca— así que no obtiene el `accessToken` emitido. Y la rotación ya es el comportamiento normal del endpoint.

La cookie sigue siendo `HttpOnly` (invisible a JS), `Secure` (solo HTTPS), acotada por `Path=/usuarios` y con la misma vigencia. Lo único que cambia es el atributo que depende de la topología.

**Alternativas descartadas:**

- **Dominio propio con `app.` y `api.`** — mismo sitio registrable, `Strict` conservado. Descartada por coste, que es el criterio explícito de este despliegue.
- **Proxy inverso en Vercel** (reescrituras de `/api/*` hacia Railway) — haría todo mismo origen, conservaría `Strict` y hasta salvaría el `baseUrl: '/api'` actual. Es la alternativa técnicamente más limpia y se descarta por una razón concreta: metería **todo** el tráfico de API por las funciones de Vercel, incluidas las llamadas al agente, que tienen un timeout propio de 30 s (`AGENTE_TIMEOUT_MS`). Un scoring o un veredicto lento chocaría contra el límite de duración de la función antes que contra el del agente, y el modo de fallo sería un `504` opaco en el peor momento del producto. Añade además un salto de red a cada petición y consume cuota de invocaciones del plan gratuito.

### D5 — `DB_SSL` cablea el cifrado en tránsito, sin verificación de CA

Nueva variable `DB_SSL` (booleana, **`false` por defecto**). Cuando está activa, `buildDataSourceOptions` añade `ssl` a las opciones de TypeORM. `false` por defecto porque el PostgreSQL local de `docker-compose.yml` no habla TLS, y el valor por defecto debe ser el que hace funcionar `npm run start:dev` recién clonado el repositorio.

La opción cifra el transporte pero **no verifica la cadena de certificación**. Es una limitación real y consciente: verificarla exige empaquetar el certificado raíz del proveedor y renovarlo cuando este lo rote, lo que este change no hace. La puerta queda abierta —una variable `DB_SSL_CA` con el certificado en PEM— pero se deja fuera de alcance en vez de fingir que no existe la diferencia. Está registrada como riesgo (R3).

La opción se cablea en `buildDataSourceOptions`, que es el único constructor de opciones y lo comparten la aplicación (`DatabaseModule`) y la CLI de migraciones (`data-source.ts`). Así ambas ven la misma configuración, que es exactamente por lo que esa función existe.

Un detalle verificado que conviene no volver a equivocar: **`node-postgres` no usa prepared statements con nombre por defecto**, así que el pooler de Supabase en modo transacción funciona sin configuración especial. Aun así, las migraciones no se ejecutan contra el pooler en **modo transacción**, sino contra el mismo pooler en **modo sesión** (puerto `5432`): son DDL en una transacción larga, el caso para el que el modo transacción no está pensado. Se descartó la conexión **directa**, que era la opción inicial, al comprobar que `db.<ref>.supabase.co` resuelve solo a IPv6 en el plan gratuito: haría depender el paso de release de que la red de salida de Railway hable IPv6. El pooler expone IPv4 y sirve para ambos modos.

### D6 — Las migraciones se aplican al arrancar, coordinadas con un advisory lock

**Esta decisión se revisó durante la implementación.** El planteamiento original era el correcto sobre el papel y falló contra la realidad de la plataforma; queda documentado el camino porque el motivo importa.

**Lo que se decidió primero:** las migraciones como *paso de release* —el *Pre-Deploy Command* de Railway—, nunca en el arranque, porque con varias réplicas todas las intentarían a la vez. `migrationsRun` es `false` en `buildDataSourceOptions` precisamente por eso.

**Por qué no funciona:** el pre-deploy de Railway falla **siempre** con esta imagen, incluso con un comando que no toca nada (`node -e "console.log('ok')"`), y sin dejar salida en el panel: el contenedor del paso no llega a arrancar. La causa no es diagnosticable desde fuera —esa salida no existe en la API, ni el agente de Railway la alcanza— y el modo de fallo es especialmente traicionero: el despliegue queda en `FAILED` mientras **la aplicación anterior sigue en servicio**, así que desde fuera todo parece sano; y los *redeploys* se saltan el paso y salen en verde, de modo que el fallo aparece y desaparece según cómo se lance el despliegue.

**Lo que se hace en su lugar:** aplicar las migraciones pendientes durante el arranque, bajo `DB_MIGRAR_AL_ARRANCAR` (desactivada por defecto, para que un arranque de desarrollo no altere el esquema sin pedirlo).

El motivo por el que se habían sacado del arranque —la carrera entre réplicas— se resuelve con un **`pg_advisory_xact_lock`**: la primera réplica lo toma y aplica; las demás se **bloquean** en él —no fallan— y cuando entran ya no queda nada pendiente, así que salen sin tocar el esquema.

Tiene que ser el lock **de transacción** y no el de sesión (`pg_advisory_lock`): la aplicación habla con PostgreSQL a través del pooler en **modo transacción**, donde la sesión no es estable entre consultas y un lock de sesión no se sostendría. De ahí que todo ocurra en una transacción propia, en la que se toma el lock y a la que se le entrega el `MigrationExecutor` con `transaction: 'none'` para que no abra transacciones por su cuenta.

Eso cambia además por dónde pasan las migraciones: antes iban por el pooler en **modo sesión** (`5432`), ahora por el de **modo transacción** (`6543`), que es la conexión de la aplicación. Es correcto porque una transacción viaja entera por la misma conexión del pooler; el precio es que **una migración con DDL no transaccional** (`CREATE INDEX CONCURRENTLY`) no puede aplicarse por esta vía, y habría que ejecutarla a mano.

**Que se puedan ejecutar desde la imagen final** sigue valiendo, y ahora sirve para el camino manual: el script `migration:run` invoca `typeorm-ts-node-commonjs` sobre `src/database/data-source.ts`, y ni `ts-node` ni `typescript` están en la imagen de producción. El script paralelo ataca el artefacto compilado con el binario de `typeorm` —dependencia de producción— sobre `dist/database/data-source.js`. Se conservan los dos: son dos entornos con dos artefactos.

### D7 — El origen del backend se fija en `environment.ts`, no se inyecta en build

`environment.ts` pasa de `baseUrl: '/api'` al origen absoluto del backend desplegado. Con eso desaparece de paso el choque con el `Path=/usuarios` de la cookie, sin tocar el `Path`.

La alternativa —generar `environment.ts` en build desde una variable de entorno de Vercel— se descarta porque una build de Angular es estática y ese valor no es secreto: la URL del backend viaja en el bundle de todas formas, la puede leer cualquiera abriendo las herramientas del navegador, y es una sola URL estable. Generarla añadiría un paso de build que hay que reproducir a mano para compilar en local, a cambio de ocultar algo que no está oculto.

### D8 — Los *preview deployments* de Vercel quedan fuera de la lista blanca

`CORS_ORIGINS` lista la URL de producción de Vercel y nada más. Cada PR genera un preview con una URL distinta, así que no hay lista blanca fija que los cubra.

La salida sería aceptar un patrón en vez de una lista, y no se hace: `enableCors` va con `credentials: true`, y ensanchar el origen permitido a un comodín sobre `*.vercel.app` significa aceptar credenciales desde cualquier despliegue de cualquier cuenta de Vercel. El precio de dejarlos fuera es que un preview no autentica; se documenta y ya está.

### D9 — Imagen multi-etapa, y el frontend no se contiene

`Dockerfile` en `backend/` con dos etapas: una compila con `npm ci` completo, la otra parte de una imagen mínima con `npm ci --omit=dev` y el `dist/` copiado. Corre como usuario sin privilegios y escucha en el `PORT` del entorno —que `AppConfigService` ya lee y Railway ya inyecta—, sin fijarlo en el `Dockerfile`.

**`--omit=dev` no basta**, cosa que solo se supo construyendo la imagen y mirando dentro. `typeorm` declara `ts-node` como peer dependency **opcional**; npm la resuelve en el lockfile y `npm ci` la instala, arrastrando `typescript` con ella. Ni `--omit=dev` ni `--omit=peer` la quitan. Se borra explícitamente tras el install: son ~25 MB y, sobre todo, un compilador que no pinta nada en una imagen de producción. Es seguro porque `ts-node` solo hace falta para cargar un DataSource escrito en `.ts`, y aquí siempre se carga el compilado (D6).

Vale la pena anotarlo porque es contraintuitivo: la intuición dice que `dependencies` menos `devDependencies` es lo que queda, y las peer dependencies opcionales de una dependencia de producción se cuelan por fuera de esa cuenta.

El frontend no se empaqueta en contenedor: es un artefacto estático y Vercel lo compila y lo sirve. Solo necesita un `vercel.json` que diga dos cosas que ninguna autodetección acierta: que la salida está en `dist/frontend/browser`, y que las rutas de cliente deben reescribirse a `index.html` para que recargar `/ideas/<id>` no devuelva un 404.

### D10 — El orden de despliegue se documenta porque no es deducible

Hay dos dependencias circulares entre plataformas que en local no existen: el frontend necesita la URL del backend para compilarse, y el backend necesita la URL del frontend para su `CORS_ORIGINS`. No se pueden satisfacer a la vez, así que el `README` fija el orden —base de datos, backend, frontend, y vuelta al backend a fijar CORS— y termina con la inicialización del sistema contra la URL pública.

Es la misma razón por la que el `README` ya documenta el arranque local: los pasos que no son deducibles del código se escriben. Aquí hay más, no menos.

### D11 — La documentación normativa que afirma `SameSite=Strict` se corrige en este change

Tres sitios afirman hoy que la cookie es `SameSite=Strict` como si fuera invariante: el contrato (`contrato-api/openapi.yaml`, tres menciones), la spec `autenticacion-de-sesion` del backend (el texto del requisito de login y uno de sus escenarios), y los comentarios de `cookie-sesion.ts`. Después de este change eso deja de ser cierto en el despliegue, así que los tres se corrigen para describir el atributo como dependiente de la topología, con `strict` por defecto.

Es una corrección de redacción, no un cambio de contrato: **ningún endpoint, esquema ni código de error cambia**, y un cliente escrito contra el contrato actual sigue funcionando. Los atributos de una cookie `HttpOnly` no son parte de la interfaz programática —el cliente nunca los lee—; el contrato los describe como información de despliegue, y esa descripción es la que se actualiza.

La spec del backend se corrige **en su sitio**, no vía delta. Este es un change de la raíz y `autenticacion-de-sesion` es una capacidad de `backend/`: el mecanismo de deltas no la alcanza desde aquí. Dejarla afirmando `Strict` sería reintroducir exactamente el problema que la capacidad `documentacion-del-repositorio` acaba de cerrar —documentación que contradice al repositorio— para respetar la forma de un mecanismo que en este caso no aplica.

## Risks / Trade-offs

- **R1 · `SameSite=None` amplía la superficie de CSRF** → acotada a `refresh` y `logout`, analizada en D4. Ninguna operación que modifique datos de dominio se autentica por cookie. Si algún día un endpoint de escritura pasara a autenticarse por cookie, este análisis deja de valer y hay que rehacerlo.
- **R2 · El proyecto gratuito de Supabase se pausa por inactividad** → es el mismo modo de fallo que motivó pagar por Railway, movido a otra capa: un portafolio que nadie visita en una temporada puede encontrarse la base de datos pausada. Se acepta a sabiendas porque despausar es un clic y no ocurre a mitad de una visita, mientras que el arranque en frío del backend sí. Es la razón por la que conviene abrir el enlace antes de compartirlo.
- **R3 · TLS sin verificación de CA** (D5) → protege la confidencialidad del tráfico, no contra un intermediario activo que presente otro certificado. El vector exige comprometer la red entre Railway y Supabase. Se acepta para este despliegue y se deja la puerta de `DB_SSL_CA`.
- **R4 · Los previews de Vercel no autentican** (D8) → un PR con cambios de frontend se puede revisar visualmente pero no probar con sesión. El precio se paga en revisión, no en producción.
- **R5 · Sin endpoint de salud, el healthcheck de plataforma es TCP** → Railway detecta un proceso caído, no uno vivo con la base de datos inaccesible. Añadir el endpoint es un change propio; meterlo aquí mezclaría observabilidad con despliegue.
- **R6 · La URL del backend queda escrita en el repositorio** (D7) → si Railway cambia el dominio del servicio, hay que tocar `environment.ts` y volver a desplegar el frontend. Es una edición de una línea y la URL de un servicio no cambia sola.
- **R7 · Una migración fallida impide arrancar** → es lo que se quiere. Una migración fallida que dejara arrancar la aplicación pondría el código nuevo contra un esquema viejo. El precio es que un error de migración deja el servicio sin instancias nuevas; la anterior sigue en servicio mientras la plataforma no promueva el despliegue fallido.
- **R8 · Las migraciones pasan por el pooler en modo transacción** (D6) → van en una única transacción, que es lo que ese modo atiende bien, pero **descarta el DDL no transaccional** (`CREATE INDEX CONCURRENTLY`). Una migración así habría que aplicarla a mano con `migration:run:prod` por el puerto de modo sesión, que se conserva por eso.
- **R9 · El arranque depende de la base de datos** (D6) → con la puesta al día activada, una base inaccesible impide arrancar en vez de arrancar y fallar al primer uso. Es preferible: el fallo aparece en el despliegue y no en la primera petición del usuario.

## Migration Plan

No hay migración de datos ni cambio de esquema: el change no toca entidades.

Para quien ya tenga el repositorio clonado, las tres variables nuevas (`COOKIE_SAMESITE`, `DB_SSL`, `DB_MIGRAR_AL_ARRANCAR`) tienen **valores por defecto iguales al comportamiento actual** (`strict`, `false` y `false`), así que un `.env` existente sigue arrancando sin tocarlo y sin que el arranque toque el esquema. `.env.example` las documenta para quien parta de la plantilla.

El despliegue en sí es la primera puesta en marcha del sistema: no hay nada que migrar desde un despliegue anterior, porque no lo hay.

## Open Questions

Ninguna abierta. Las tres que había se cerraron antes de escribir esto:

- **Si el pooler de Supabase exigía configuración especial de `pg`** → no: `node-postgres` no usa prepared statements con nombre por defecto (D5).
- **Si había un plan gratuito viable para el backend** → no con arranque inmediato. La información pública se contradice entre fuentes; se verificó en el proveedor antes de comprometer el gasto (D1).
- **Si el paso de migraciones podía reutilizar el script existente** → no: `ts-node` es dependencia de desarrollo y no está en la imagen final. Hace falta un script contra el compilado (D6).
