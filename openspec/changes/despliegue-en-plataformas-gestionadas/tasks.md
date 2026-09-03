## 1. Cookie de sesión parametrizada

- [x] 1.1 Añadir `COOKIE_SAMESITE` al esquema Zod del entorno (`backend/src/config/env.schema.ts`): `enum(['strict','lax','none'])` con `.default('strict')`
- [x] 1.2 Añadir la validación cruzada al objeto del esquema: `COOKIE_SAMESITE=none` con `COOKIE_SECURE=false` aborta el arranque, con un mensaje que nombre **las dos** variables
- [x] 1.3 Exponerla en `AppConfigService` ampliando el getter `cookie` a `{ secure, sameSite }`, para no abrir una vía de lectura nueva
- [x] 1.4 Parametrizar `opcionesCookieRefresh` y `opcionesLimpiezaCookieRefresh` (`backend/src/usuarios/sesion/cookie-sesion.ts`): `sameSite` pasa a ser argumento, como ya lo es `secure`
- [x] 1.5 Actualizar las tres llamadas de `usuarios.controller.ts` (líneas ~73 y ~190) para pasar `this.config.cookie.sameSite`
- [x] 1.6 Actualizar `cookie-sesion.spec.ts`: cubrir que emisión y limpieza devuelven el `sameSite` recibido, y que **coinciden** entre sí
- [x] 1.7 Añadir una prueba de la validación cruzada sobre `validateEnv`: combinación incoherente → lanza; `strict` + `secure:false` → válida
- [x] 1.8 Corregir los comentarios de `cookie-sesion.ts`, que afirman `SameSite=Strict` como invariante

## 2. SSL hacia la base de datos

- [x] 2.1 Añadir `DB_SSL` al esquema del entorno: booleana por transformación de `'true'|'false'`, con `.default('false')`
- [x] 2.2 Exponerla en el getter `database` de `AppConfigService`
- [x] 2.3 Ampliar `DatabaseConnectionConfig` y `buildDataSourceOptions` (`backend/src/database/typeorm-options.ts`) para añadir `ssl` solo cuando la opción está activa
- [x] 2.4 Propagarla en `data-source.ts`, para que la CLI de migraciones vea la misma configuración que la aplicación
- [x] 2.5 Prueba unitaria de `buildDataSourceOptions`: con la opción desactivada las opciones no llevan `ssl`; con ella activada, sí
- [x] 2.6 Comprobar que el arranque local contra `docker-compose.yml` sigue funcionando sin tocar el `.env` existente

## 3. Migraciones desde el artefacto compilado

- [x] 3.1 Añadir a `backend/package.json` un script de migraciones contra `dist/database/data-source.js` usando el binario `typeorm` (dependencia de producción), **sin** `ts-node`
- [x] 3.2 Conservar intactos los scripts actuales orientados a desarrollo
- [x] 3.3 Verificar el script tras `npm run build` con `--omit=dev` en un árbol limpio: si arrastra `ts-node` o `typescript`, no sirve para la imagen

## 4. Imagen del backend

- [x] 4.1 `backend/Dockerfile` multi-etapa sobre Node 24 (la versión que fija el CI): etapa de build con `npm ci` completo, etapa final con `npm ci --omit=dev` y el `dist/` copiado
- [x] 4.2 Ejecutar como usuario sin privilegios; no fijar `PORT` en la imagen (`AppConfigService` ya lo lee del entorno)
- [x] 4.3 `CMD` que arranca la aplicación y **nada más**: ningún comando extra en la imagen (la puesta al día del esquema la hace el arranque de la aplicación, ver bloque 10)
- [x] 4.4 `backend/.dockerignore` que excluya `node_modules`, `dist`, `.env`, `test` y artefactos de cobertura
- [x] 4.5 Construir y arrancar la imagen en local contra el PostgreSQL de `docker compose`, para validarla antes de tocar la plataforma
- [x] 4.6 Comprobar en la imagen final que no están el compilador de TypeScript ni el resto del utillaje de desarrollo

## 5. Frontend

- [x] 5.1 `frontend/src/environments/environment.ts`: `baseUrl` pasa del prefijo `/api` al origen absoluto del backend en Railway
- [x] 5.2 Actualizar el comentario del archivo, que hoy explica el supuesto del proxy inverso
- [x] 5.3 `frontend/vercel.json` con `outputDirectory: dist/frontend/browser` y la reescritura de rutas de cliente hacia `index.html`
- [x] 5.4 Comprobar que `environment.development.ts` no cambia y `npm start` sigue apuntando a `http://localhost:3000`
- [x] 5.5 `npm run build` y verificar que la salida cae donde `vercel.json` la busca

## 6. Puesta en marcha en las plataformas

> Este bloque toca servicios externos y credenciales reales. Se ejecuta manualmente y en este orden: el frontend necesita la URL del backend para compilarse, y el backend la del frontend para su CORS.

- [x] 6.1 **Supabase**: crear el proyecto y anotar las dos cadenas de conexión, la del pooler en modo transacción y la del pooler en modo sesión
- [x] 6.1b Aplicar las migraciones contra Supabase por el pooler en modo sesión, verificando de paso `DB_SSL=true` contra un PostgreSQL gestionado real
- [x] 6.1c **Blindar la Data API**: activar RLS en las 17 tablas de `public`, que sin él quedan legibles y escribibles con la clave publicable de Supabase, rodeando el aislamiento por `owner_id`
- [x] 6.1d Desactivar la Data API de Supabase en el panel: es la medida que cubre también las tablas que creen migraciones futuras
- [x] 6.1e Fijar el RLS como migración de TypeORM, para que un entorno nuevo lo reproduzca sin pasos manuales
- [x] 6.2 **Railway**: crear el servicio desde el `Dockerfile`, plan Hobby
- [x] 6.3 Fijar en Railway las variables: `NODE_ENV=production`, `DB_*` (pooler) con `DB_SSL=true`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, `JWT_ACCESS_SECRET`, `BYOK_CLAVE_CIFRADO`, `BOOTSTRAP_TOKEN` y un `CORS_ORIGINS` provisional
- [ ] 6.4 Dejar **vacío** el *Pre-Deploy Command* en Railway y fijar `DB_MIGRAR_AL_ARRANCAR=true`: el paso de pre-deploy falla siempre con esta imagen (ver bloque 10 y D6)
- [x] 6.5 Desplegar y verificar que arranca y que el esquema quedó aplicado
- [x] 6.6 **Vercel**: importar el repositorio con raíz en `frontend/` y desplegar; anotar la URL de producción
- [x] 6.7 Volver a Railway y fijar `CORS_ORIGINS` con la URL real de Vercel; redesplegar
- [ ] 6.8 Inicializar el sistema con `POST /sistema/inicializar` y el `BOOTSTRAP_TOKEN` contra la URL pública
- [ ] 6.9 Promover un segundo administrador con `PATCH /usuarios/{id}/rol`, como advierte el `README`: la inicialización no tiene reversa
- [ ] 6.10 Retirar `BOOTSTRAP_TOKEN` del entorno de Railway una vez inicializado

## 7. Verificación de extremo a extremo en el despliegue

- [ ] 7.1 Registrar una cuenta desde la aplicación desplegada e iniciar sesión
- [ ] 7.2 **La prueba que justifica el change**: dejar la sesión abierta más allá del TTL del `accessToken` (15 min) y comprobar que `POST /usuarios/refresh` recibe la cookie y la sesión sobrevive
- [ ] 7.3 Comprobar en el navegador que la `Set-Cookie` llega con `SameSite=None; Secure; HttpOnly; Path=/usuarios`
- [ ] 7.4 Cerrar sesión y comprobar que la cookie **desaparece** del navegador, no solo que la respuesta es `204`
- [ ] 7.5 Recargar una ruta profunda (p. ej. el detalle de una idea) y comprobar que no devuelve 404
- [ ] 7.6 Recorrer el camino crítico: crear idea → hipótesis y umbrales → contacto → entrevista → scoring → KPIs → veredicto
- [ ] 7.7 Configurar BYOK con una API key real y comprobar que la validación contra el proveedor funciona desde Railway

## 8. Documentación

- [x] 8.1 Documentar `COOKIE_SAMESITE` y `DB_SSL` en `backend/.env.example`, con el mismo tono de las existentes: qué valor va en cada entorno y por qué
- [x] 8.2 Añadir al `README` la sección de despliegue: las tres plataformas, la tabla de variables por plataforma, el orden del bloque 6 y la inicialización contra la URL pública
- [x] 8.3 Documentar en el `README` los límites conocidos: los previews de Vercel no autentican, y el proyecto gratuito de Supabase se pausa por inactividad
- [x] 8.4 Corregir las tres menciones de `SameSite=Strict` en `contrato-api/openapi.yaml` (líneas ~115, ~131 y ~1689) para describir el atributo como dependiente del despliegue
- [x] 8.5 Corregir `backend/openspec/specs/autenticacion-de-sesion/spec.md`: el texto del requisito de login y el escenario «Credenciales válidas» afirman `SameSite=Strict` como invariante
- [x] 8.6 Revisar si `frontend/CLAUDE.md` o `backend/CLAUDE.md` afirman algo que este change invalide

## 9. Cierre

- [x] 9.1 `npm run lint`, `npm test` y `npm run test:e2e` en `backend/` sin regresiones
- [x] 9.2 `npm run lint`, `npm test` y `npm run build` en `frontend/` sin regresiones
- [x] 9.3 Validar el contrato con el job de CI que ya lo comprueba, tras la corrección de 8.4
- [x] 9.4 Revisar el diff completo: ninguna URL de despliegue debe traer credenciales, y `.env` no puede aparecer
- [x] 9.5 `openspec validate --strict` sobre el change

## 10. Migraciones al arranque, serializadas con un lock (revisión de D6)

> El *Pre-Deploy Command* de Railway falla siempre con esta imagen —incluso con `node -e "console.log('ok')"`— y sin dejar salida. Se sustituye por una puesta al día en el arranque, coordinada entre réplicas.

- [x] 10.1 `ejecutarMigracionesAlArranque` en `backend/src/database/migraciones-al-arranque.ts`: una transacción propia que toma `pg_advisory_xact_lock` y entrega ese `queryRunner` al `MigrationExecutor` con `transaction: 'none'`
- [x] 10.2 Usar el lock de **transacción** y no el de sesión, porque la conexión pasa por el pooler en modo transacción y la sesión no es estable entre consultas
- [x] 10.3 Relanzar el error tras el rollback, para que el proceso no llegue a escuchar con el esquema a medias; liberar el `queryRunner` siempre
- [x] 10.4 `DB_MIGRAR_AL_ARRANCAR` en el esquema Zod, con `.default('false')` para no alterar el arranque de desarrollo
- [x] 10.5 Exponerla en `AppConfigService` como getter propio, **fuera** del objeto `database` que comparte la CLI de migraciones
- [x] 10.6 Invocarla en `main.ts` antes de `app.listen`, condicionada al flag
- [x] 10.7 Pruebas unitarias: el lock se toma antes de aplicar nada, todo va en una única transacción, el ejecutor no abre transacciones propias, y un fallo hace rollback, propaga y libera
- [x] 10.8 Pruebas del esquema de entorno para la variable nueva (valor por defecto y transformación)
- [x] 10.9 Documentar la variable en `backend/.env.example` y en la tabla del `README`
- [x] 10.10 Reescribir en el `README` la sección del pre-deploy: por qué no se usa y qué modo de fallo tiene
- [x] 10.11 Actualizar la spec del change y D6 con la decisión revisada, y añadir los riesgos del DDL no transaccional y de la dependencia del arranque respecto a la base
- [ ] 10.12 Verificar en el despliegue: activar la variable, comprobar en el registro de arranque que informa del estado del esquema, y que la aplicación queda en servicio
