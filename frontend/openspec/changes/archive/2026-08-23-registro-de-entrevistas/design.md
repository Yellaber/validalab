## Context

Es la primera feature del frontend que **no se basta a sí misma**. Las anteriores consumían un tag del contrato y punto; esta necesita contactos y guiones para poder existir, porque una entrevista es precisamente el punto donde idea, contacto y guión convergen.

Tres hechos del contrato mandan sobre el diseño:

- **Las respuestas se capturan contra las preguntas de un guión.** `RespuestaEntrevista` es `{preguntaId, texto}`, así que el formulario no tiene campos fijos: sus campos **los define el guión que el usuario elija**.
- **`Entrevista` solo lleva identificadores.** Trae `contactoId` y `guionId`, no nombres. Cualquier vista legible tiene que resolverlos por su cuenta.
- **`contactoId` y `guionId` no se pueden cambiar al editar.** `ActualizarEntrevistaRequest` solo admite `respuestas` y `citas`, así que alta y edición **no son el mismo formulario** como lo eran en E1–E4a.

Y dos efectos de borde que el cliente refleja pero no provoca: crear una entrevista **mueve el contacto a `entrevistado`** y **dispara el scoring**.

Este change se detiene justo antes del juicio del agente. `estadoScoring` se muestra como etiqueta; el bloque `score` y el ajuste llegan en `scoring-y-ajuste`.

## Goals / Non-Goals

**Goals:**
- Capturar una entrevista completa: contacto, guión, una respuesta por pregunta y citas opcionales.
- Que toda vista muestre **nombres**, no identificadores.
- No ofrecer nunca un contacto que el backend vaya a rechazar con `409`.
- Advertir antes de invalidar un score al editar respuestas.
- Dejar la frontera con el siguiente change explícita en el código, no implícita.

**Non-Goals:**
- Renderizar el bloque `score`, sus señales o su trazabilidad; hacer polling de `estadoScoring`; re-disparar el scoring; registrar el ajuste humano. Todo eso es `scoring-y-ajuste`.
- Cambiar el contacto o el guión de una entrevista ya registrada: el contrato no lo permite.
- Ordenar o reordenar citas: el contrato no les da `orden`.
- Calcular ningún KPI.

## Decisions

### D1 — Un `EntrevistasService` con las cinco operaciones de captura
`crear`, `listar`, `consultar`, `editar`, `eliminar`, más las dos `solicitud*` para `httpResource`. **`puntuar` y `ajustarScore` no se añaden todavía**, aunque el tag las tenga: un servicio que expone métodos que ningún componente llama invita a usarlos antes de tiempo. Llegarán con la vista que los necesita.

Los tipos del bloque de score (`ScoreEntrevista`, `SenalesEstructuradas`, `AjusteScore`) **sí** se declaran ahora en el modelo, porque vienen en la misma respuesta y un modelo infiel sería peor que uno completo. Se declaran y no se leen.

### D2 — Los campos del formulario los define el guión elegido
Al seleccionar un guión, el formulario genera **una entrada por cada una de sus preguntas**, en su orden, y el modelo pasa a ser `respuestas: {preguntaId, texto}[]`. No hay claves locales aquí (a diferencia de las citas, D5): la lista es fija dado el guión, no se añade, quita ni reordena, así que `preguntaId` es un `track` estable y suficiente.

Esto convierte el guión en algo más que un dato del formulario: es su **esquema**. Merece la pena verlo así porque explica D3.

### D3 — Cambiar de guión con respuestas escritas se confirma en línea
Si el usuario ya escribió texto en alguna respuesta y cambia de guión, esas respuestas **se pierden**: el guión nuevo tiene otras preguntas y no hay correspondencia posible entre ellas. Descartarlas en silencio sería destruir trabajo sin avisar.

La UI pide confirmación en línea (patrón de dos pasos de E2/E3, sin `window.confirm`) solo cuando hay algo que perder. Con todas las respuestas vacías, el cambio es inmediato: confirmar por confirmar entrena a ignorar los avisos.

### D4 — El selector de contactos excluye los que el backend rechazaría
Un contacto ya `entrevistado` o `descartado` responde `409`. Ofrecerlo y dejar que falle convierte el error en el mecanismo de descubrimiento de la regla, que es justo lo que E3 (D4 de aquel change) decidió no hacer.

El selector se puebla con `ContactosService.listar` y **excluye en cliente** ambos estados. El contrato solo filtra por **un** estado a la vez, así que no se puede pedir «todos menos dos» al servidor; se trae una página generosa y se filtra aquí. Es la misma limitación —y la misma solución— que el selector de referidos de E3 (D7), y se recoge igual en Riesgos.

Cuando no queda ningún contacto entrevistable, el formulario **lo dice y enlaza al CRM** en vez de mostrar un desplegable vacío.

Esta exclusión es además **estable en el tiempo** gracias a `contrato-api-borrado-de-entrevista`: eliminar una entrevista devuelve su contacto a `agendado`, así que reaparece en el selector. Sin esa regla, el filtro habría dejado fuera para siempre a cualquier contacto cuya entrevista se borrase, y corregir un registro erróneo sería imposible desde esta pantalla.

### D5 — Las citas son filas con clave local, sin orden y opcionales
Mismo mecanismo de identidad que el editor de preguntas de E4a: cada fila lleva una **clave local** del cliente para dar a `@for` un `track` estable, y —lección aprendida allí— **el `@for` recorre el modelo plano y enlaza el campo por índice**, porque resolver el estado de un campo dentro del `track` lanza `NG01904: Orphan field` al encoger el arreglo.

Pero **no se reutiliza `features/guiones/preguntas.ts`**, y la razón no es evitar el acoplamiento entre features sino que las semánticas difieren en los dos puntos que importan: una cita **no tiene `orden`** (no hay nada que numerar por posición) y **puede haber cero** (no existe el `minItems: 1` que gobierna las preguntas). Compartir el módulo obligaría a parametrizar esas dos diferencias para ahorrar una decena de líneas, y dejaría un helper que no describe bien a ninguno de los dos. Se escribe un `citas.ts` propio y se documenta la lección del `track`.

### D6 — Toda vista resuelve identificadores a nombres, cargando los catálogos una vez
`Entrevista` solo trae `contactoId` y `guionId`. Una lista que muestre UUID es inservible, así que:

- **El listado** pide una vez los contactos y los guiones de la idea y construye dos mapas `id → nombre` en signals, que las filas consultan. Dos peticiones extra por pantalla, no una por fila.
- **El detalle** carga la entrevista y **su guión concreto**, que necesita de todos modos para mostrar cada respuesta junto al texto de la pregunta que contesta. Una respuesta sin su pregunta es ilegible.

Alternativa descartada: pedir al contrato que embeba los nombres en `Entrevista`. Sería lo cómodo, pero es un cambio de contrato que este change no necesita: con dos peticiones cacheadas la pantalla es correcta y el contrato sigue siendo el mínimo.

Detalle que conviene notar: **el guión de una entrevista siempre existe**. Lo garantiza el `409` que `contrato-api-integridad-de-guiones` acaba de introducir, así que el detalle no tiene que contemplar un guión borrado. Es el primer rédito de aquel change.

### D7 — Alta y edición son **dos componentes**, no uno reutilizado
Rompe deliberadamente el patrón de E1–E4a, donde un mismo formulario servía ambos modos. Aquí no aplica: el alta elige contacto y guión y **deriva sus campos de esa elección**; la edición no puede tocar ninguno de los dos y trabaja sobre un conjunto de preguntas ya fijado. Forzarlos en un componente daría un cuerpo lleno de `@if (modoEdicion)` sobre la parte que más lógica tiene.

Lo que sí se comparte es el **editor de citas**, idéntico en ambos, extraído como componente propio.

### D8 — La edición advierte que invalida el score antes de guardar
El contrato dice que cambiar `respuestas` devuelve la entrevista a `estadoScoring: pendiente` y re-dispara el scoring, mientras que cambiar solo `citas` no lo afecta. Es una consecuencia cara —se descarta un juicio ya emitido y se gasta una llamada al proveedor— y el usuario tiene que saberlo **antes** de guardar, no descubrirlo al ver el estado cambiado.

La advertencia aparece **solo si alguna respuesta cambió** respecto a la cargada. Editar únicamente las citas no la muestra, porque no invalida nada.

### D9 — `estadoScoring` se muestra como etiqueta, y ahí se para
Se renderiza como etiqueta en la lista y en el detalle, y se ofrece en el filtro del listado, porque son datos del contrato que este change consume. Lo que **no** se hace es interpretarlo: sin polling, sin acciones, sin bloque de score. La frontera con el siguiente change queda en un punto natural —mostrar un dato frente a reaccionar a él— y no a mitad de una vista.

### D10 — Los errores se traducen por operación, ramificando por `codigo`
`ENTREVISTA_SIN_VINCULO` (422) y `CONFLICTO` (409) son las dos reglas propias de este tag y se explican como tales: «ese contacto no pertenece a esta idea» y «ese contacto ya fue entrevistado o está descartado». Nunca se muestra el `mensaje` del backend. Como en E3 (D10), el mensaje lo elige quien invocó la acción.

### D11 — Modelos a mano y cuatro rutas hijas
`core/api/entrevista.model.ts` escrito contra el contrato, con `EstadoScoring` como arreglo `const` para iterarlo en el filtro. Cuatro rutas bajo el shell con `loadComponent`, declarando `nueva` **antes** que `:idEntrevista`. El detalle de la idea suma el acceso a entrevistas.

## Risks / Trade-offs

- **Los selectores y los mapas de nombres solo ven una página** → con muchos contactos o guiones, alguno podría no aparecer en el selector, o una fila mostrar un nombre sin resolver. Mitigación: `porPagina` generoso y degradar a un texto neutro («contacto no disponible») en vez de pintar un UUID. Si molesta en uso real, es una petición de cambio al contrato, no un parche en el cliente.
- **Cambiar de guión destruye las respuestas escritas** → mitigado con la confirmación en línea de D3. No hay alternativa: preguntas distintas no admiten correspondencia.
- **Dos componentes de formulario en vez de uno** → más ficheros y algo de estructura repetida. Se acepta a cambio de que ninguno de los dos cargue con los condicionales del otro; el editor de citas, que es la parte sustancial compartida, sí se extrae.
- **El detalle hace dos peticiones encadenadas** (entrevista y luego su guión) → un salto de latencia extra. Aceptable: sin el guión no se pueden mostrar las preguntas, así que no hay pantalla útil que pintar antes.
- **`estadoScoring` visible sin actualizarse solo** → un usuario que acaba de registrar una entrevista verá `pendiente` o `procesando` y nada cambiará hasta que recargue. Es la consecuencia consciente del corte; el polling acotado llega en el change siguiente y esta vista es su hueco natural.
- **Primera dependencia entre features** → entrevistas importa `GuionesService` y `ContactosService`. Mitigación: solo servicios, nunca componentes ni plantillas; la dirección es de la feature más específica a las más generales y no hay ciclo.

## Open Questions

Ninguna. La única que este change tenía abierta —qué ocurre con el estado del contacto al eliminar su entrevista— se cerró en `contrato-api-borrado-de-entrevista` antes de empezar a implementar: el contacto vuelve a `agendado`. Eso fija el comportamiento esperado de D4 y hace verificable el escenario de corregir un registro erróneo, en vez de dejarlo a merced de lo que hiciera el backend.
