# lint-del-frontend

## Purpose

Verificación estática del paquete `frontend/` con `angular-eslint`, sobre TypeScript **y plantillas HTML**, ejecutada en integración continua con el mismo criterio que la del backend.

Nace de una asimetría sin razón de diseño detrás: el monorepo linteaba la mitad de su código. El backend tenía ESLint desde su fundación y el CI lo comprobaba; el frontend no tenía ni configuración ni script, por una tarea que quedó pendiente desde el andamiaje del CLI.

En un paquete Angular ese hueco pesa más que en uno de Node. El TypeScript de un componente ya lo revisa el compilador en buena medida, pero el HTML de sus plantillas no lo mira nadie — y ahí viven las reglas de **accesibilidad** (etiquetas asociadas a sus controles, texto alternativo, roles válidos), fáciles de incumplir sin darse cuenta y difíciles de detectar revisando código a mano. Cubrirlas es la mitad del valor de esta capacidad.

Se adoptó con las reglas recomendadas, no endurecidas: introducir la herramienta y decidir cuánto debe exigir son dos discusiones distintas, y solo la primera tenía respuesta obvia. Con una línea base establecida, subir el listón después es un cambio medible.

## Requirements

### Requirement: El frontend se verifica estáticamente con angular-eslint
El paquete `frontend/` SHALL disponer de verificación estática con `angular-eslint`, en una versión alineada con la de Angular instalada. La configuración SHALL generarse y mantenerse con el schematic oficial (`ng add` / `ng update`), no escribirse a mano, de modo que las actualizaciones mayores de Angular puedan migrarla. El paquete SHALL exponer un script `lint` que ejecute esa verificación.

#### Scenario: Ejecutar la verificación
- **WHEN** se ejecuta `npm run lint` en `frontend/`
- **THEN** se verifica el paquete con `angular-eslint` y se reporta el resultado

#### Scenario: Versión alineada con Angular
- **WHEN** se comprueba la versión de `angular-eslint` frente a la de Angular instalada
- **THEN** la primera declara compatibilidad con la versión mayor de la segunda

### Requirement: La verificación cubre TypeScript y plantillas, incluida su accesibilidad
La verificación SHALL abarcar tanto los archivos TypeScript como las **plantillas HTML** del paquete. La configuración de plantillas MUST incluir las reglas de **accesibilidad**, porque ninguna otra herramienta del repositorio las comprueba y son incumplimientos difíciles de detectar revisando código a mano.

Las reglas SHALL ser las recomendadas por `eslint`, `typescript-eslint` y `angular-eslint`. Endurecerlas por encima de esa base es un cambio aparte: NO SHALL mezclarse con la introducción de la herramienta.

#### Scenario: Una plantilla con un problema de accesibilidad
- **WHEN** una plantilla incumple una regla de accesibilidad, por ejemplo un control de formulario sin etiqueta asociada
- **THEN** la verificación lo reporta como error

#### Scenario: Alcance de los archivos verificados
- **WHEN** se consulta qué archivos abarca la verificación
- **THEN** incluye los `.ts` y los `.html` del código fuente del paquete

### Requirement: La verificación no corrige, comprueba
El script de verificación del frontend NO SHALL aplicar correcciones automáticas. Un script que corrige en silencio resulta cómodo en local y peligroso en integración continua, donde la corrección se pierde y el build pasaría con código distinto del que se revisó.

#### Scenario: Ejecución con hallazgos
- **WHEN** se ejecuta la verificación sobre código que incumple una regla
- **THEN** el hallazgo se reporta y los archivos no se modifican

### Requirement: La integración continua verifica el frontend igual que el backend
El job del frontend en el workflow de integración continua SHALL ejecutar la verificación estática antes de la compilación, en cada `pull_request` y en cada `push` a las ramas protegidas. Un hallazgo SHALL hacer fallar el job. Con esto, ambos paquetes del monorepo quedan verificados con el mismo criterio.

#### Scenario: Se introduce código con un hallazgo
- **WHEN** un cambio añade al frontend código que incumple una regla
- **THEN** el job del frontend falla

#### Scenario: Paridad entre paquetes
- **WHEN** se comparan los jobs de ambos paquetes en el workflow
- **THEN** los dos ejecutan verificación estática, compilación y pruebas
- **AND** en ninguno de los dos la verificación tolera hallazgos
