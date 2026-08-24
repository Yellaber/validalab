## Context

El backend lintea con ESLint 10 y `typescript-eslint`, y el CI lo comprueba con `npx eslint` sin `--fix` para que un hallazgo rompa el build. El frontend no tiene nada: ni configuración, ni script, ni paso de CI.

Tres hechos acotan el diseño:

1. **`angular-eslint` se versiona con Angular.** La 22.1.0 declara `@angular/cli >= 22.0.0 < 23.0.0`, que es exactamente la versión instalada. No hay que elegir versión: hay una correcta.
2. **El paquete ya usa Prettier**, configurado en línea en `package.json`. Formato y linting son cosas distintas y conviven; el riesgo clásico es que ambas herramientas se peleen por las mismas reglas de estilo.
3. **El código no se había lintado nunca**, así que la cantidad de hallazgos preexistentes era desconocida y determinaba el alcance real del trabajo.

Ese tercer punto se resolvió midiendo antes de decidir: se cableó la herramienta y se ejecutó. **Un hallazgo en todo el paquete.** Con ese dato, la pregunta de qué hacer con la deuda preexistente —el problema habitual al introducir un linter en un proyecto maduro— desaparece.

## Goals / Non-Goals

**Goals:**
- Cerrar la asimetría de que un paquete se linte y el otro no.
- Cubrir las plantillas HTML, incluida la accesibilidad, que hoy no revisa ninguna herramienta del repositorio.
- Que el CI verifique el frontend con el mismo criterio que el backend.

**Non-Goals:**
- Endurecer reglas más allá de las recomendadas.
- Tocar Prettier o la configuración de formato.
- Modificar el linting del backend.
- Convertir hallazgos en avisos tolerados: si el linter encuentra algo, el build falla.

## Decisions

### D1 — Instalar con el schematic oficial, no a mano
`ng add @angular-eslint/schematics@22` instala las dependencias, genera `eslint.config.js`, añade el target `lint` a `angular.json` y el script a `package.json`, todo coherente entre sí.

La alternativa —escribir la configuración a mano— daría control fino sobre cada pieza y se descarta porque el schematic es lo que el equipo de `angular-eslint` mantiene alineado con cada versión mayor de Angular. Cuando llegue Angular 23, `ng update` sabrá migrar una configuración generada por el schematic; una escrita a mano queda a cargo de quien la escribió.

Es la misma lógica que la guía del frontend ya aplica al delegar las convenciones de estilo en la skill `angular-developer` en vez de versionar una copia estática.

### D2 — Reglas recomendadas, sin endurecer
La configuración queda con `eslint.configs.recommended`, `tseslint` recommended y stylistic, `angular.configs.tsRecommended` para TypeScript, y `templateRecommended` + `templateAccessibility` para plantillas.

Endurecer en el mismo cambio que introduce la herramienta mezcla dos discusiones: «¿debe haber linter?» y «¿qué debe exigir?». La primera tiene respuesta obvia y la segunda no. Introducirlo con las recomendadas lo pone en marcha hoy; subir el listón después es un cambio con su propia justificación, y entonces el coste de cada regla nueva será medible porque habrá una línea base.

### D3 — Las plantillas se lintean, y la accesibilidad con ellas
`lintFilePatterns` cubre `src/**/*.ts` y `src/**/*.html`. Incluir las plantillas es la mitad del valor de `angular-eslint`: el TypeScript de un componente Angular ya lo revisa el compilador en buena medida, pero el HTML de sus plantillas no lo mira nadie.

`templateAccessibility` entra deliberadamente. Las reglas de accesibilidad —etiquetas asociadas a sus controles, texto alternativo, roles válidos— son fáciles de incumplir sin darse cuenta y difíciles de detectar revisando código. Es el tipo de comprobación que solo una herramienta hace bien, y hasta ahora ninguna la hacía en este repositorio.

### D4 — El CI comprueba, no corrige
El paso de CI ejecuta el lint en modo comprobación. El script `lint` del frontend es `ng lint`, sin `--fix`, así que sirve igual en local y en CI.

Es una diferencia menor con el backend, cuyo script sí lleva `--fix` y por eso el CI invoca `npx eslint` directamente para no arreglar en el runner. El frontend no necesita ese rodeo, y no se le añade `--fix` precisamente para evitarlo: un script que corrige silenciosamente es cómodo en local y peligroso en CI, donde el arreglo se pierde y el build pasa con código distinto del que se revisó.

### D5 — El paso va antes de `Build`
Mismo orden que el backend: lint → build → test. Un fallo de lint es el más barato de diagnosticar, así que conviene que salte primero.

### D6 — La guía del frontend deja de afirmar lo contrario
`frontend/CLAUDE.md` dice que el paquete no tiene ESLint y que el linting del monorepo vive en `backend/`. Deja de ser cierto con este cambio y se corrige en el mismo PR.

No hacerlo dejaría la guía contradiciendo al repositorio, que es exactamente el problema que la capacidad `documentacion-del-repositorio` acaba de cerrar. Corregirlo aquí es aplicar esa regla, no ampliarla.

## Risks / Trade-offs

- **Dos herramientas opinando sobre estilo** → Prettier formatea y ESLint linta. Las configuraciones recomendadas de `typescript-eslint` no incluyen reglas de formato (se delegan en el formateador), así que hoy no hay conflicto. Si alguna regla futura chocara, la salida es desactivar esa regla, no añadir un integrador entre ambas.
- **El linter podría endurecerse solo al actualizar** → `angular-eslint` está fijado a `22.1.0` exacto y `eslint` con rango `^10`, igual que el backend. Una actualización mayor pasa por `ng update`, no ocurre sola.
- **Un hallazgo bloquea el PR de otra persona** → es el propósito. Con un único hallazgo preexistente en todo el paquete, el listón está donde el código ya estaba.
- **El job del frontend tarda unos segundos más** → el mismo compromiso ya aceptado en el backend y en el job del contrato.

## Migration Plan

No aplica: no hay datos, esquema ni despliegue implicados. Quien tenga el repositorio clonado necesita `npm install` en `frontend/` para obtener las dependencias nuevas.

## Open Questions

Ninguna. La pregunta que podía haberla tenido —qué hacer con la deuda preexistente— se respondió midiéndola antes de decidir: un hallazgo.
