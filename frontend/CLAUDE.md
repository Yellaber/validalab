# CLAUDE.md

Este archivo guía a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

Este archivo cubre el paquete **frontend**. Otros dos documentos complementarios aplican y deben leerse junto a él:

- `../CLAUDE.md` (raíz del repo) — el modelo de dominio de ValidaLab, el agente Validador Inteligente, BYOK, los KPIs y los épicos de funcionalidad guiados por el SRS. Es la fuente de verdad sobre *qué* construir, e indexa el contrato de API.
- `../contrato-api/openapi.yaml` — el **contrato de API único** y la fuente de verdad de la interfaz frontend↔backend. Construye cada llamada HTTP contra este documento; **no** inspecciones ni importes código de `backend/` para deducir las formas de petición/respuesta/error. Las convenciones transversales (autenticación, aislamiento por `owner_id`, sobre de error, paginación, nombres) se resumen en el `CLAUDE.md` raíz y se detallan en el contrato.

## Skills de Angular

El desarrollo del frontend debe apoyarse en las skills de Angular instaladas, que entregan las prácticas y características **más recientes** de Angular alineadas con la versión instalada en el proyecto. Son la **fuente de las convenciones de estilo y arquitectura** de Angular (reemplazan a cualquier guía estática):

- **`angular-new-app`** — invócala al **crear una nueva aplicación Angular** con el CLI. Cubre el andamiaje moderno (`ng new`, flags de estilo/routing/SSR, configuración de IA) y el uso del CLI para generar componentes, servicios, pipes, directivas, guards, interceptors y resolvers.
- **`angular-developer`** — invócala **antes de generar o modificar cualquier código Angular** (componentes, servicios, directivas, formularios, routing, etc.) o cuando necesites guía arquitectónica. Es *version-aware*: analiza la versión de Angular del proyecto y consulta las buenas prácticas vigentes (`get_best_practices`) antes de aconsejar. Cubre reactividad (signals, `linkedSignal`, `resource`, `effect`), formularios (preferir **Signal Forms** en apps nuevas), inyección de dependencias (`inject()`), routing y estrategias de carga, SSR, accesibilidad (ARIA), animaciones, estilos (Tailwind), testing y tooling del CLI.

Regla práctica: ante cualquier duda de estilo o de "cómo se hace bien en Angular hoy", **consulta `angular-developer`** en vez de asumir; las convenciones cambian entre versiones y la skill refleja la vigente.

## Comandos

Ejecutar desde `frontend/`:

```bash
npm start            # ng serve — servidor de desarrollo en http://localhost:4200
npm run build        # ng build — salida a dist/ (optimizado para producción por defecto)
npm run watch        # ng build --watch --configuration development
npm test             # ng test — Vitest (vía @angular/build:unit-test), en modo watch por defecto en terminal interactiva (TTY)
```

Ejecutar un único archivo de test, filtrar por nombre o correr una sola vez:

```bash
npm test -- --include=src/app/app.spec.ts   # restringe la ejecución a un archivo de spec
npm test -- --filter='^App'                 # solo suites/tests cuyo nombre coincide con el patrón (regex)
npm test -- --no-watch                      # ejecuta una vez y sale (modo CI)
npm test -- --coverage                      # genera reporte de cobertura
```

O enfoca en el código con `describe.only` / `it.only` de Vitest (y `.skip` para excluir; recuerda revertirlo antes de hacer commit). El entorno es **jsdom** y los globals (`describe`, `it`, `expect`) los habilita el builder, así que no hace falta importarlos. Los tests son *zoneless*: usa el patrón **Act–Wait–Assert** con `await fixture.whenStable()` en lugar de `fixture.detectChanges()` (ver la skill `angular-developer` → testing). Aún no hay framework e2e configurado.

Este paquete no tiene script `lint` ni configuración de ESLint — solo Prettier (configurado en línea en `package.json`: 100 columnas, comillas simples, parser HTML de Angular). El paquete `backend/` es donde vive `npm run lint`.

## Arquitectura

- **Angular 22, bootstrap standalone.** Sin NgModules. La entrada es `src/main.ts` → `src/app/app.ts`, configurada por `src/app/app.config.ts`. Las rutas viven en `src/app/app.routes.ts` (actualmente vacío — las rutas de funcionalidad se añaden aquí, con carga diferida).
- **Detección de cambios *zoneless*.** `app.config.ts` usa `provideZonelessChangeDetection()`, así que no hay Zone.js. La detección de cambios se dirige por signals — el estado del componente que la plantilla lee **debe** ser un signal (o actualizarse con actualizaciones de signal equivalentes a `markForCheck`), de lo contrario la vista no se actualizará. Esto hace que el enfoque *signals-first* sea obligatorio, no estilístico. El trabajo asíncrono que deba refrescar la UI tiene que fluir a través de signals.
- Los listeners globales de error se habilitan vía `provideBrowserGlobalErrorListeners()`.

Este es un andamiaje recién creado del CLI de Angular: el único código de app es el componente raíz `App`. Aún no hay capa HTTP, autenticación, librería de estado ni UI de dominio. Al construir funcionalidades, sigue el orden de épicos del SRS según el documento raíz (cuentas/aislamiento → ideas → hipótesis/umbrales → CRM de contactos → entrevistas + scoring por IA → KPIs/tablero → veredicto → config BYOK) y mantén los identificadores de dominio en **español** para coincidir con el SRS (`idea`, `hipótesis`, `entrevista`, `veredicto`, `umbral`, `score`).

El frontend es un cliente SaaS multi-tenant que habla con el backend NestJS; el agente (Validador Inteligente), el manejo de las API keys BYOK y el cálculo de KPIs viven todos del lado del servidor — el frontend nunca ve las API keys en crudo ni ejecuta el agente.

## Flujo OpenSpec

Este repo usa **OpenSpec** (desarrollo guiado por especificación). `openspec/` existe en la raíz del repo y dentro de `frontend/` y `backend/`, cada uno con `config.yaml`, `specs/` y `changes/`. Las funcionalidades sustanciales deben pasar por el ciclo de vida de cambios de OpenSpec (propose → apply → verify → archive) — las skills `opsx:*` / `openspec-*` lo dirigen. Revisa `openspec/changes/` por trabajo en curso antes de empezar una funcionalidad.
