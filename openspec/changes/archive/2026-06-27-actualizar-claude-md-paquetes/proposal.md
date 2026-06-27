## Why

Los archivos `frontend/CLAUDE.md` y `backend/CLAUDE.md` están redactados en inglés, lo que rompe la coherencia idiomática con el `CLAUDE.md` global del proyecto y con la regla de dominio en español. Además, el `frontend/CLAUDE.md` no menciona las skills `angular-new-app` y `angular-developer` —recién instaladas— por lo que el desarrollo del frontend no las invoca de forma sistemática y se pierde la garantía de aplicar las prácticas y características más recientes de Angular.

A esto se suma que `frontend/.claude/CLAUDE.md` es una **copia congelada y ya desactualizada** del archivo de buenas prácticas de Angular (lo generó el andamiaje `ng new --ai-config`). Frente a Angular v22 ya da consejo **contrario** en puntos clave: indica declarar `ChangeDetectionStrategy.OnPush` (que en v22 es el default y no debe declararse) y recomienda Reactive forms sin mencionar **Signal Forms** (estables en v22+). Las skills entregan esa misma guía pero *version-aware* —vía el `get_best_practices` real del proyecto— y con 35 documentos de referencia, por lo que el archivo estático es redundante y perjudicial.

Por último, el `frontend/CLAUDE.md` documentaba **Karma + Jasmine** como runner de tests, pero el andamiaje real seguía en Karma mientras que las buenas prácticas de Angular 20+ (y la skill `angular-developer`, cuyo `testing-fundamentals` está escrito para **Vitest** con el patrón *Act–Wait–Assert*) adoptan **Vitest**. Documentar Vitest sin migrar el proyecto habría dejado el doc mintiendo respecto a `package.json`/`angular.json`; por eso se migra el runner además de corregir el doc.

## What Changes

- Traducir al **español** el contenido de `frontend/CLAUDE.md`, conservando la terminología técnica (comandos, nombres de API, identificadores) y la estructura de secciones.
- Traducir al **español** el contenido de `backend/CLAUDE.md`, con los mismos criterios.
- Añadir en `frontend/CLAUDE.md` una sección de **referencia a las skills de Angular**:
  - `angular-new-app` — para crear nuevas apps Angular con el CLI siguiendo el andamiaje moderno.
  - `angular-developer` — para generar componentes/servicios y obtener guía arquitectónica (signals, formularios, DI, routing, SSR, accesibilidad, testing) con las características más recientes.
- Indicar **cuándo aplicar cada skill** para que el desarrollo del frontend emplee las mejores prácticas y características recientes de Angular de forma consistente.
- **Eliminar `frontend/.claude/CLAUDE.md`** (la guía de estilo estática y obsoleta) y **delegar en la skill `angular-developer`** como fuente de las convenciones de estilo Angular, que ya consulta el `get_best_practices` del proyecto y se mantiene al día con la versión instalada.
- Actualizar `frontend/CLAUDE.md` para que **deje de referenciar** `.claude/CLAUDE.md` y en su lugar ordene invocar la skill para cualquier trabajo de Angular.
- **Migrar el runner de tests del frontend de Karma + Jasmine a Vitest** (builder `@angular/build:unit-test` con `runner: "vitest"`, Vitest 4 + jsdom, globals habilitados), modernizar el spec existente al patrón *zoneless* Act–Wait–Assert y dejar el `frontend/CLAUDE.md` y `frontend/README.md` describiendo Vitest.
- Sin cambios en el contrato de API ni en el backend (salvo su traducción).

## Capabilities

### New Capabilities
- `guias-claude-md-paquetes`: convención de que las guías `CLAUDE.md` por paquete estén en español y que el frontend referencie e invoque las skills de Angular instaladas.
- `runner-de-tests-frontend`: el frontend ejecuta sus tests con Vitest (no Karma/Jasmine), alineado con Angular 20+ y la skill `angular-developer`, y la documentación lo refleja.

### Modified Capabilities

## Impact

- Archivos afectados (docs): `frontend/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/README.md`.
- Archivo eliminado: `frontend/.claude/CLAUDE.md`.
- Archivos afectados (config/código de test del frontend): `frontend/package.json` (quita Karma/Jasmine, añade `vitest`/`jsdom`), `frontend/angular.json` (builder `unit-test` + runner vitest), `frontend/tsconfig.spec.json` (`types: ["vitest/globals"]`), `frontend/src/app/app.spec.ts` (patrón Act–Wait–Assert), `frontend/package-lock.json`, y `.gitignore` raíz (ignora `**/.angular/cache/`).
- Sin impacto en el contrato de API (`contrato-api/openapi.yaml`) ni en el código de dominio.
- Mejora la coherencia idiomática, dirige el uso de las skills `angular-new-app` y `angular-developer`, y alinea el runner de tests con las buenas prácticas vigentes de Angular.
- Las convenciones de estilo Angular pasan a provenir de la skill (siempre alineadas a la versión instalada) en lugar de una copia estática que se desactualiza.
