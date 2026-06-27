# runner-de-tests-frontend

## Purpose

Establece Vitest (sobre el builder `@angular/build:unit-test`) como runner de tests unitarios del paquete `frontend/`, en reemplazo de Karma/Jasmine, junto con el enfoque *zoneless* de specs (patrón Act–Wait–Assert con `await fixture.whenStable()`) y la documentación correspondiente en `frontend/CLAUDE.md` y `frontend/README.md`.

## Requirements

### Requirement: El frontend ejecuta sus tests con Vitest

El paquete `frontend/` SHALL ejecutar sus tests unitarios con **Vitest** a través del builder `@angular/build:unit-test` (`runner: "vitest"`), no con Karma/Jasmine. La configuración MUST quedar consistente: `angular.json` con el builder `unit-test`, `package.json` sin dependencias de Karma/Jasmine y con `vitest` (compatible con Angular 22, es decir Vitest 4) y `jsdom`, y `tsconfig.spec.json` con `types: ["vitest/globals"]`.

#### Scenario: Ejecutar la suite

- **WHEN** se ejecuta `npm test` en `frontend/`
- **THEN** la suite corre con Vitest sobre el entorno jsdom y pasa sin referencias a Karma ni Jasmine

#### Scenario: No quedan dependencias de Karma/Jasmine

- **WHEN** se inspecciona `frontend/package.json`
- **THEN** no existe ninguna dependencia `karma*` ni `jasmine*`, y están presentes `vitest` y `jsdom`

### Requirement: Specs zoneless con el patrón Act–Wait–Assert

Los tests del frontend SHALL seguir el enfoque *zoneless* de la skill `angular-developer`: usar `await fixture.whenStable()` para esperar los cambios en lugar de `fixture.detectChanges()`.

#### Scenario: Spec del componente raíz modernizado

- **WHEN** se revisa `frontend/src/app/app.spec.ts`
- **THEN** el test que verifica el render usa `await fixture.whenStable()` y no `fixture.detectChanges()`

### Requirement: La documentación del frontend describe Vitest

`frontend/CLAUDE.md` y `frontend/README.md` SHALL describir Vitest como runner de tests, sin mencionar Karma/Jasmine como runner vigente. El `CLAUDE.md` MUST documentar los comandos reales (`--include`, `--filter`, `--no-watch`, `--coverage`) y el foco con `describe.only`/`it.only`.

#### Scenario: Comandos de test en la guía

- **WHEN** se lee la sección de comandos de `frontend/CLAUDE.md`
- **THEN** describe `npm test` ejecutándose con Vitest y los flags de filtrado/watch/cobertura, sin citar Karma/Jasmine

#### Scenario: README alineado

- **WHEN** se lee la sección de tests unitarios de `frontend/README.md`
- **THEN** menciona Vitest como runner, no Karma
