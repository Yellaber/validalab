## 1. Medir antes de decidir

- [x] 1.1 Comprobar qué versión de `angular-eslint` declara compatibilidad con el Angular CLI instalado (22.1.0 ↔ CLI 22)
- [x] 1.2 Cablear la herramienta y ejecutarla **antes** de decidir el alcance, para saber cuánta deuda preexistente hay
- [x] 1.3 Con el resultado (un solo hallazgo), descartar la necesidad de un plan de adopción gradual o de reglas rebajadas

## 2. Instalación y configuración

- [x] 2.1 Instalar con el schematic oficial: `ng add @angular-eslint/schematics@22`, no a mano, para que `ng update` pueda migrarlo en futuras versiones mayores
- [x] 2.2 Verificar el `eslint.config.js` generado: recomendadas de `eslint`, `typescript-eslint` (recommended y stylistic) y `angular.configs.tsRecommended`
- [x] 2.3 Verificar que la configuración de plantillas incluye `templateRecommended` **y** `templateAccessibility`
- [x] 2.4 Verificar que `lintFilePatterns` cubre `src/**/*.ts` y `src/**/*.html`
- [x] 2.5 Confirmar que el script `lint` quedó en `package.json` y **sin `--fix`**
- [x] 2.6 Confirmar que la versión de `eslint` queda en la misma línea mayor que la del backend (10.x)

## 3. Hallazgos preexistentes

- [x] 3.1 Corregir el único hallazgo: import `ComponentFixture` sin usar en `features/ideas/formulario/formulario.spec.ts`
- [x] 3.2 Volver a ejecutar hasta «All files pass linting»

## 4. Integración continua

- [x] 4.1 Añadir un paso `Lint` al job `Frontend (Angular)` de `.github/workflows/ci.yml`
- [x] 4.2 Situarlo **antes** de `Build`, con el mismo orden que el job del backend: un fallo de lint es el más barato de diagnosticar
- [x] 4.3 Comprobar localmente que el paso **falla** con un hallazgo introducido a propósito

## 5. Documentación

- [x] 5.1 Corregir `frontend/CLAUDE.md`, que afirma que el paquete no tiene ESLint y que el linting del monorepo vive en `backend/`
- [x] 5.2 Añadir `npm run lint` a la lista de comandos de `frontend/CLAUDE.md`
- [x] 5.3 Corregir `frontend/README.md`, que afirma lo mismo, y añadir el comando

## 6. Verificación

- [x] 6.1 `npm run lint` en verde
- [x] 6.2 `npm test` sin regresiones (49 archivos / 399 tests)
- [x] 6.3 `npm run build` limpio
- [x] 6.4 Revisar el diff: `frontend/` y el workflow; ni backend ni contrato
- [x] 6.5 `openspec validate --strict` sobre el change
