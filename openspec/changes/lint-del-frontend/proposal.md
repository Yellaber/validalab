## Why

El monorepo lintea la mitad de su código. El paquete `backend/` tiene ESLint con `typescript-eslint`, y el CI lo verifica en modo comprobación (`npx eslint`, sin `--fix`). El paquete `frontend/` no tiene ni configuración ni script: su guía lo dice explícitamente —«este paquete no tiene script `lint` ni configuración de ESLint — solo Prettier»— y el job de CI se limita a `build` y `test`.

La asimetría no tiene una razón de diseño detrás: es una tarea que quedó pendiente desde el andamiaje del CLI. Y en un paquete Angular el coste de no lintear es mayor que en uno de Node, porque `angular-eslint` no solo comprueba TypeScript: revisa también las **plantillas HTML**, incluidas reglas de **accesibilidad** que ninguna otra herramienta del repositorio mira. Ese hueco es invisible: no hay nada que avise de que existe.

## What Changes

- **`angular-eslint` 22.1.0** cableado con el schematic oficial (`ng add`), que es la vía que el propio equipo de Angular mantiene alineada con cada versión mayor. La versión encaja exactamente con Angular CLI 22.
- **`eslint.config.js`** con las configuraciones recomendadas para TypeScript (`eslint.configs.recommended`, `tseslint` recommended y stylistic, `angular.configs.tsRecommended`) y para plantillas (`templateRecommended` y **`templateAccessibility`**).
- **Script `lint`** en `package.json` y target `lint` en `angular.json`, cubriendo `src/**/*.ts` y `src/**/*.html`.
- **Paso `Lint` en el job `Frontend (Angular)`** del CI, situado antes de `Build` para dar el mismo orden que el backend.
- **Un hallazgo corregido**: un import sin usar (`ComponentFixture`) en `formulario.spec.ts`. Es el único que el linter encontró en todo el paquete.

**Fuera de alcance**: cambiar reglas más allá de las recomendadas —endurecerlas es un cambio aparte con su propia discusión—; tocar la configuración de Prettier, que sigue viviendo en línea en `package.json`; y el linting del backend, que ya existe y no se toca.

## Capabilities

### New Capabilities
- `lint-del-frontend`: verificación estática del paquete `frontend/` con `angular-eslint` sobre TypeScript y plantillas —incluida la accesibilidad de estas—, alineada con la versión de Angular instalada y ejecutada en integración continua igual que la del backend.

### Modified Capabilities
<!-- Ninguna. `runner-de-tests-frontend` gobierna el runner de tests del paquete y no se ve afectado: lint y tests son verificaciones distintas que conviven. La afirmación de `frontend/CLAUDE.md` sobre la ausencia de ESLint deja de ser cierta y se corrige, pero era una descripción, no un requisito de ninguna capacidad. -->

## Impact

- **`frontend/`**: `eslint.config.js` nuevo; `package.json` gana cuatro `devDependencies` y el script `lint`; `angular.json` gana el target `lint`; un import sin usar corregido en un spec.
- **CI (`.github/workflows/ci.yml`)**: un paso nuevo en el job del frontend. Es el único archivo fuera de `frontend/` que se toca.
- **`frontend/CLAUDE.md`**: afirma que el paquete no tiene ESLint y que el linting del monorepo vive en `backend/`. Deja de ser cierto y se actualiza.
- **Código existente**: **un solo hallazgo** en todo el paquete. El código ya cumplía las reglas recomendadas; lo que faltaba era quien lo comprobara.
- **Tiempo de CI**: el job del frontend crece unos segundos. Sin efecto en `build` ni en `test`.
