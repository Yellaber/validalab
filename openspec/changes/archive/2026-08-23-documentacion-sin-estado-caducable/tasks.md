## 1. Inventario del estado caducable

- [x] 1.1 Localizar en los tres `CLAUDE.md` y en el `README.md` raíz toda afirmación sobre qué está construido, aplicando el criterio «¿seguirá siendo cierta tras el próximo change?»
- [x] 1.2 Separar los **invariantes** que suenan a estado y deben conservarse: modo laxo de TypeScript en el backend, ausencia de ESLint y de framework e2e en el frontend, ausencia de workspace manager en la raíz
- [x] 1.3 Listar las referencias verificablemente falsas para corregirlas una a una

## 2. `CLAUDE.md` raíz

- [x] 2.1 Eliminar la sección «Estado actual del repositorio» y su descripción del monorepo como andamiado sin código de dominio
- [x] 2.2 Conservar el índice del contrato, el modelo de dominio, el Validador Inteligente, BYOK, KPIs y el idioma — son invariantes
- [x] 2.3 Mantener el orden de épicas como **prioridad de construcción** derivada del SRS, sin marcar cuáles están terminadas
- [x] 2.4 Añadir el puntero a `openspec/specs/` como fuente de verdad del alcance implementado
- [x] 2.5 Conservar la nota de que el SRS v6.0 es la fuente funcional vigente

## 3. `backend/CLAUDE.md`

- [x] 3.1 Reescribir la sección «Arquitectura»: eliminar «andamiaje de NestJS 11 con solo el `AppController`/`AppService` por defecto» y «aún no presente en el árbol», dejando las reglas de organización modular por dominio
- [x] 3.2 Corregir el ejemplo `npm test -- src/app.controller.spec.ts`: ese archivo no existe; usar uno real
- [x] 3.3 Corregir la referencia a `test/jest-e2e.json` → `test/jest-e2e.js`, y documentar que la suite e2e exige PostgreSQL y ya no tolera la ausencia de specs
- [x] 3.4 Añadir a los comandos los de migraciones (`migration:run`, `migration:generate`, `migration:revert`, `migration:show`), hoy ausentes de la guía pese a ser imprescindibles
- [x] 3.5 Conservar intactas las secciones de validación con Zod, Swagger, multi-tenant, agente, persistencia y el modo laxo de TypeScript
- [x] 3.6 Sustituir el «construye en el orden de épicas» por prioridad, sin afirmar avance

## 4. `frontend/CLAUDE.md`

- [x] 4.1 Eliminar «Este es un andamiaje recién creado del CLI de Angular: el único código de app es el componente raíz `App`» y «Aún no hay capa HTTP, autenticación, librería de estado ni UI de dominio»
- [x] 4.2 Corregir «`app.routes.ts` (actualmente vacío)»: describir en su lugar la convención de rutas con carga diferida
- [x] 4.3 Conservar la sección de skills de Angular sin cambios — la capacidad `guias-claude-md-paquetes` la exige
- [x] 4.4 Conservar zoneless/signals, la organización por feature y las convenciones de testing, que son invariantes
- [x] 4.5 Conservar que el paquete no tiene ESLint ni framework e2e: es una decisión activa, no un hito

## 5. `README.md` raíz

- [x] 5.1 Eliminar la nota «Estado: desarrollo inicial. El monorepo está andamiado…»
- [x] 5.2 Sustituirla por el señalamiento de dónde vive el alcance implementado (`openspec/specs/`)
- [x] 5.3 Conservar el roadmap por épicas como prioridades MoSCoW del SRS, sin marcar completitud
- [x] 5.4 Verificar que la sección de puesta en marcha (añadida con la inicialización del sistema) sigue siendo exacta

## 6. README de paquete

- [x] 6.1 Reescribir `backend/README.md` desde cero: qué es el paquete, comandos reales (dev, build, lint, tests, migraciones, e2e) y punteros al README raíz y a `backend/CLAUDE.md`
- [x] 6.2 Reescribir `frontend/README.md` desde cero con el mismo patrón; eliminar la mención a «Angular CLI version 20.3.5»
- [x] 6.3 No duplicar dominio, stack, contrato ni flujo de ramas en ninguno de los dos
- [x] 6.4 Verificar que no queda ni una línea de plantilla de NestJS ni del CLI de Angular

## 7. Verificación

- [x] 7.1 Comprobar que **todos** los comandos citados en los seis archivos existen en su `package.json` correspondiente
- [x] 7.2 Comprobar que **todas** las rutas de archivo citadas existen en el repositorio
- [x] 7.3 Buscar en los seis archivos las expresiones de estado («andamiaje», «aún no», «por ahora», «actualmente», «todavía», «estado actual») y confirmar que no queda ninguna afirmando avance
- [x] 7.4 Confirmar que los invariantes de la tarea 1.2 siguen documentados
- [x] 7.5 Revisar el diff: solo documentación; ni código, ni `contrato-api/openapi.yaml`, ni `CHANGELOG.md`
- [x] 7.6 `openspec validate --strict` sobre el change
