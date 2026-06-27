## 1. Traducir frontend/CLAUDE.md

- [x] 1.1 Traducir al español las secciones introductoria, Comandos, Arquitectura y Flujo OpenSpec, preservando comandos npm, rutas y literales técnicos
- [x] 1.2 Verificar que las afirmaciones normativas (zoneless, signals obligatorios, multi-tenant, terminología en español) conservan su fuerza

## 2. Añadir referencia a las skills de Angular en frontend/CLAUDE.md

- [x] 2.1 Agregar una sección "Skills de Angular" que documente `angular-new-app` (crear nuevas apps con el CLI) y `angular-developer` (generar componentes/servicios, guía arquitectónica y convenciones de estilo vía `get_best_practices`)
- [x] 2.2 Indicar cuándo invocar cada skill, instruyendo invocar `angular-developer` antes de generar o modificar código Angular

## 2b. Eliminar la guía de estilo estática

- [x] 2b.1 Eliminar el archivo `frontend/.claude/CLAUDE.md`
- [x] 2b.2 Quitar de `frontend/CLAUDE.md` toda referencia a `.claude/CLAUDE.md` y reemplazarla por la delegación en la skill `angular-developer`

## 3. Traducir backend/CLAUDE.md

- [x] 3.1 Traducir al español las secciones introductoria, Comandos, Arquitectura, Toolchain y Flujo OpenSpec, preservando comandos npm, rutas y literales técnicos
- [x] 3.2 Verificar que las afirmaciones normativas (modular por dominio, multi-tenant, Zod, sin cablear modelos) conservan su fuerza

## 3b. Migrar el runner de tests del frontend a Vitest

- [x] 3b.1 `package.json`: eliminar dependencias `karma*`/`jasmine*`, añadir `vitest@^4.0.8` (Angular 22 exige Vitest 4) y `jsdom`
- [x] 3b.2 `angular.json`: cambiar el builder de test a `@angular/build:unit-test` con `runner: "vitest"` y `buildTarget`
- [x] 3b.3 `tsconfig.spec.json`: cambiar `types: ["jasmine"]` por `["vitest/globals"]`
- [x] 3b.4 Modernizar `src/app/app.spec.ts` al patrón zoneless Act–Wait–Assert (`await fixture.whenStable()`)
- [x] 3b.5 Actualizar la sección de Comandos de `frontend/CLAUDE.md` a Vitest (flags `--include`/`--filter`/`--no-watch`/`--coverage`, foco `describe.only`/`it.only`, jsdom)
- [x] 3b.6 Actualizar `frontend/README.md` (Karma → Vitest)
- [x] 3b.7 Ignorar la caché del builder en `.gitignore` raíz (`**/.angular/cache/`)
- [x] 3b.8 `npm install` y `npm test`: verificar que la suite corre con Vitest (2/2 en verde)

## 4. Verificación

- [x] 4.1 Revisar que ambos archivos quedan íntegramente en español salvo literales técnicos
- [x] 4.2 Confirmar que `frontend/.claude/CLAUDE.md` ya no existe y que ninguna referencia apunta a él
- [x] 4.3 Confirmar que no se modificó el código de dominio ni `contrato-api/openapi.yaml` (los cambios de código se limitan a la config/spec de test del frontend)
- [x] 4.4 Confirmar que no quedan referencias a Karma/Jasmine en docs ni en `package.json` (las del `package-lock.json` son solo el peer opcional de `@angular/build`)
