## Why

La documentación del repositorio describe un proyecto que dejó de existir hace meses.

- El `CLAUDE.md` raíz: «dos paquetes andamiados pero aún sin código de dominio».
- `backend/CLAUDE.md`: «andamiaje de NestJS 11 con solo el `AppController`/`AppService` por defecto — sin código de dominio, sin persistencia, sin autenticación».
- `frontend/CLAUDE.md`: «`app.routes.ts` (actualmente vacío)», «aún no hay capa HTTP, autenticación ni UI de dominio».
- `README.md`: «Estado: desarrollo inicial».

La realidad es E0–E8 completas, v0.1.0 publicada, 12 módulos de dominio, 16 migraciones y suites unitaria y e2e en verde. Y el desfase ya produce errores concretos y comprobables: `backend/CLAUDE.md` ofrece como ejemplo `npm test -- src/app.controller.spec.ts`, **un archivo que no existe**; afirma que los e2e usan `test/jest-e2e.json`, que hoy es `.js`; y los dos README de paquete son boilerplate íntegro —**cero** menciones a ValidaLab en 157 líneas—, con `frontend/README.md` anunciando «Angular CLI version 20.3.5» sobre un proyecto Angular 22.

Esto no es cosmético. Los tres `CLAUDE.md` son el contexto que se carga en **cada** sesión de trabajo asistido: hoy no es que falte información, es que la que hay induce activamente a error.

Y hay una causa que va más allá del texto desactualizado: estos archivos contienen secciones que describen un **instantáneo** —«Estado actual del repositorio», «Este es un andamiaje recién creado del CLI», «solo el `AppController` por defecto hasta ahora»—. Una sección así caduca por diseño: nace desactualizándose. Corregir la redacción sin quitar esas secciones garantiza volver aquí dentro de tres épicas.

## What Changes

- **Se elimina el estado caducable de los tres `CLAUDE.md`.** Pasan a describir solo lo que no caduca: modelo de dominio, arquitectura, convenciones y reglas. La pregunta «qué hay construido hoy» deja de responderse ahí porque ya la responden mejor `openspec/specs/` —las capacidades vigentes— y el propio código.
- **Se corrigen las referencias falsas**: el ejemplo de spec inexistente, la extensión del archivo de configuración e2e, el `app.routes.ts` «vacío» y la mención al `--passWithNoTests` que ya no está.
- **El `README.md` raíz** pierde su nota de estado «desarrollo inicial» y gana el señalamiento de dónde vive el alcance implementado.
- **Los dos README de paquete se reescriben desde cero**, cortos: qué es el paquete, sus comandos reales y punteros al README raíz y a su `CLAUDE.md`. No repiten dominio, stack ni flujo de ramas — duplicarlos crearía tres documentos que mantener sincronizados, que es exactamente el problema que este change ataca.
- **Se conserva lo que sigue siendo cierto**, en particular el modo laxo de TypeScript del backend (`strict` ausente, `noImplicitAny: false`, `strictBindCallApply: false`, solo `strictNullChecks`) y que el frontend no tiene ESLint ni framework e2e. Son invariantes vigentes, no estado caducado.

**Fuera de alcance**: cualquier cambio de código; el `CHANGELOG.md`, que **debe** llevar registro histórico y por tanto sí describe instantáneos legítimamente; y `contrato-api/openapi.yaml`.

## Capabilities

### New Capabilities
- `documentacion-del-repositorio`: principio de no-caducidad de la documentación —las guías y los README describen invariantes y convenciones, nunca el alcance construido en un momento dado— y la estructura que se deriva de él: el `README.md` raíz como única puerta de entrada y READMEs de paquete breves que no duplican su contenido.

### Modified Capabilities
<!-- Ninguna. `guias-claude-md-paquetes` sigue vigente sin cambios: sus tres requisitos (redacción en español, referencia a las skills de Angular y delegación de las convenciones de estilo en `angular-developer`) no se ven afectados. La capacidad nueva es complementaria: aquella gobierna CÓMO se redactan las guías de paquete, esta gobierna QUÉ pueden afirmar. -->

## Impact

- **Documentación**: `CLAUDE.md` (raíz), `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `README.md` (raíz), `backend/README.md` y `frontend/README.md`.
- **Contexto de trabajo asistido**: es el impacto real. Los `CLAUDE.md` dejan de afirmar que no hay dominio, persistencia ni autenticación en un repositorio que tiene las tres cosas.
- **Mantenimiento futuro**: al no afirmar estado, estos archivos solo necesitan cambiar cuando cambian las convenciones o la arquitectura — no en cada épica.
- **Sin código, sin contrato, sin dependencias.** El diff es exclusivamente documentación.
