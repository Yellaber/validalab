## Context

El `CLAUDE.md` raíz está en español y fija la regla de terminología de dominio en español. Sin embargo, `frontend/CLAUDE.md` y `backend/CLAUDE.md` se redactaron en inglés. Además, se instalaron dos skills de Angular (`angular-new-app` y `angular-developer`) que el `frontend/CLAUDE.md` no referencia, por lo que su uso no está dirigido.

Por otra parte, `frontend/.claude/CLAUDE.md` es una copia estática del archivo de buenas prácticas de Angular generada por el andamiaje. Comparada con el `best-practices.md` que distribuye Angular v22 (`node_modules/@angular/core/resources/best-practices.md`, lo que la skill obtiene vía `get_best_practices`), está desactualizada y se contradice en `OnPush` (ya es default en v22) y en formularios (omite Signal Forms). Se decidió eliminarla y delegar las convenciones de estilo en la skill `angular-developer`.

Finalmente, el `frontend/CLAUDE.md` documentaba Karma + Jasmine, pero el andamiaje seguía en Karma mientras las buenas prácticas de Angular 20+ y la skill usan Vitest. Como corregir solo el doc lo dejaría inconsistente con `package.json`/`angular.json`, el cambio incorpora la **migración real del runner a Vitest**. Por tanto este cambio ya no es solo de documentación: toca la configuración y las dependencias de test del frontend, pero **no** el código de dominio ni el contrato de API.

## Goals / Non-Goals

**Goals:**
- Traducir al español ambos `CLAUDE.md` de paquete preservando estructura, comandos y términos técnicos.
- Documentar en `frontend/CLAUDE.md` cuándo y cómo invocar las skills `angular-new-app` y `angular-developer`.
- Eliminar `frontend/.claude/CLAUDE.md` y delegar las convenciones de estilo Angular en la skill `angular-developer`.
- Migrar el runner de tests del frontend a Vitest y dejar la documentación (`CLAUDE.md`, `README.md`) coherente con esa configuración.
- Mantener la coherencia con el `CLAUDE.md` raíz del proyecto.

**Non-Goals:**
- No tocar el código de dominio/aplicación ni `contrato-api/openapi.yaml` (los cambios de código se limitan a la config y al spec de test del frontend).
- No reescribir las convenciones de estilo Angular en un archivo propio: se delegan en la skill `angular-developer`, no se duplican.

## Decisions

- **Traducción fiel, no reescritura.** Se mantiene el mismo orden de secciones (Comandos, Arquitectura, Toolchain, Flujo OpenSpec) y se traduce el texto; se preservan literales técnicos (rutas, comandos npm, nombres de módulos, `owner_id`, RNF/RF) sin traducir. Alternativa descartada: rehacer la documentación desde cero (mayor riesgo de perder matices ya validados).
- **Sección dedicada a las skills en el frontend.** Se añade un apartado "Skills de Angular" en `frontend/CLAUDE.md` que indica: usar `angular-new-app` para andamiar nuevas apps con el CLI, y `angular-developer` al generar componentes/servicios o para guía arquitectónica (signals, Signal Forms, DI con `inject()`, routing/lazy loading, SSR, accesibilidad/ARIA, testing) y como **fuente de las convenciones de estilo** vía su `get_best_practices`.
- **Eliminar la guía de estilo estática.** Se borra `frontend/.claude/CLAUDE.md` y `frontend/CLAUDE.md` deja de referenciarla; las reglas de estilo dejan de vivir en una copia que se desactualiza. Alternativa descartada: mantener el archivo corrigiéndolo a v22 (volvería a quedar obsoleto en la próxima actualización de Angular y duplicaría lo que ya entrega la skill).
- **Solo el frontend referencia las skills.** Son skills específicas de Angular; el `backend/CLAUDE.md` no las menciona.
- **Migración a Vitest vía el builder oficial.** Se usa `@angular/build:unit-test` con `runner: "vitest"` (entorno jsdom en Node, `globals: true` por defecto), en lugar de configurar Vitest a mano. Angular 22 declara Vitest **4** como peer opcional, así que se fija `vitest@^4.0.8` (un `^3` rompe la resolución). Se eliminan todas las deps `karma*`/`jasmine*` y se añade `jsdom` (requisito del runner para tests no-browser). El spec existente se moderniza al patrón *zoneless* Act–Wait–Assert (`await fixture.whenStable()`). Alternativa descartada: documentar Vitest sin migrar (dejaría el doc inconsistente con la config real).

## Risks / Trade-offs

- [Pérdida de matiz en la traducción] → Revisar que cada afirmación normativa (zoneless, signals obligatorios, multi-tenant, Zod) conserve su fuerza ("debe"/"nunca").
- [La skill solo se carga cuando su `description` se dispara, a diferencia del archivo estático siempre-en-contexto] → `frontend/CLAUDE.md` (que sí está siempre en contexto al trabajar el frontend) instruye explícitamente a invocar `angular-developer` antes de generar o modificar código Angular, garantizando el disparo.
- [Versión incorrecta de Vitest] → Angular 22 exige Vitest 4; fijar `^4.0.8` y verificar con `npm test` que la suite corre (validado: 2/2 en verde con Vitest 4.1.9).
- [Entorno: inspección TLS de un antivirus (Avast) hace fallar `npm install` con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`] → Es una condición de la máquina, no del cambio; se resuelve pausando el escudo web o apuntando `NODE_EXTRA_CA_CERTS`/`--use-system-ca` a la CA del antivirus.
