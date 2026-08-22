## Context

E4 se parte en dos changes y este es el primero, porque `CrearEntrevistaRequest` exige un `guionId`: sin guiones no hay entrevistas. E1–E3 ya dejaron resuelto el patrón de feature de dominio (servicio de recurso, `httpResource`, Signal Forms, rutas hijas del shell, errores ramificados por `codigo`), así que aquí no se reinventa nada de eso. Lo nuevo son dos cosas.

**Primera: el guión no cuelga de una idea.** Vive en `/guiones`, es propiedad del usuario (`ownerId` derivado del token) y es reutilizable **entre ideas** — ese es su valor: hace comparables entrevistas de ideas distintas. Todas las features anteriores se anidaban bajo `ideas/:id`; esta rompe el patrón, y con ella el shell necesita por primera vez navegación entre dominios de primer nivel.

**Segunda: el recurso central es una colección ordenada.** `preguntas` no es un campo, es una lista con `orden` base 1, y el `PATCH` la **reemplaza entera** (`ActualizarGuionRequest`: «`preguntas` reemplaza el conjunto ordenado»). Eso hace que la edición de un guión sea un problema de estado local —añadir, quitar, mover, renumerar— y no el envío de un delta. El contrato manda tres restricciones duras:

- `minItems: 1` en `preguntas`, tanto al crear como al editar: un guión **nunca** puede quedarse sin preguntas.
- `orden` es `integer, minimum: 1`, descrito como «posición dentro del guión (base 1)».
- `Pregunta` tiene `id` (uuid) pero `PreguntaRequest` **no**: al enviar, la identidad de una pregunta es su posición, no su `id`.

Ese último punto tiene consecuencias aguas abajo que este change debe respetar aunque no las use: las `respuestas` de una entrevista apuntan a un `preguntaId`, así que los `id` que el servidor asigna a las preguntas son referencias vivas.

## Goals / Non-Goals

**Goals:**
- CRUD de `Guion` propio del usuario, con listado paginado.
- Un editor de preguntas ordenadas que garantice siempre un `orden` contiguo base 1 y nunca deje el guión sin preguntas.
- Enviar en cada `PATCH` el conjunto ordenado completo, coherente con la semántica de reemplazo del contrato.
- Dar al shell una navegación entre `Ideas` y `Guiones` que no estorbe a las rutas anidadas ya existentes.

**Non-Goals:**
- Registrar entrevistas, capturar respuestas contra el guión o disparar scoring: es el segundo change de E4.
- Reordenar por arrastre: se resuelve con controles de subir/bajar (ver D5).
- Plantillas predefinidas, duplicar un guión, versionado de guiones o biblioteca compartida entre usuarios: el contrato no los modela.
- Filtrar o buscar en el listado: el contrato solo expone `pagina`/`porPagina` en esta colección.
- Resolver qué pasa al borrar un guión ya usado por entrevistas: hoy no existen entrevistas (ver Open Questions).

## Decisions

### D1 — Un `GuionesService` en `features/guiones/`, fuera del árbol de `ideas`
Un servicio `providedIn: 'root'` con las cinco operaciones (`crear`, `listar`, `consultar`, `editar`, `eliminar`) más las dos `solicitud*` que alimentan `httpResource`, siguiendo la forma exacta de `ContactosService`. La diferencia es la ruta base: `${environment.baseUrl}/guiones`, **sin `ideaId`**, porque el recurso no está anidado.

La feature vive en `src/app/features/guiones/`, hermana de `ideas/` y no dentro de ella. Alternativa descartada: colgarla de `features/ideas/guiones/` por proximidad con E4 — sería mentir sobre el modelo. Un guión existe sin ninguna idea y sobrevive a todas; anidarlo insinuaría lo contrario y obligaría a un `ideaId` inventado en las rutas.

### D2 — El `orden` se deriva de la posición del arreglo; el usuario nunca lo teclea
El modelo mantiene un arreglo de preguntas en su orden de presentación. El `orden` **no se almacena en el modelo**: se calcula al construir el cuerpo (`índice + 1`) justo antes de enviar. Así es imposible que existan huecos, duplicados o un `orden` que contradiga la posición visible.

Alternativa descartada: exponer `orden` como campo editable. Obliga a validar unicidad y contigüidad en el cliente, y permite que lo que el usuario ve (una lista) y lo que envía (unos números) diverjan. La lista **es** el orden.

### D3 — El `PATCH` envía siempre el conjunto completo de preguntas
El contrato define `preguntas` como reemplazo, no como parche. Enviar un subconjunto borraría el resto. Por eso la edición carga el guión, lo vuelca al estado local del editor y al guardar envía **todas** las preguntas con su `orden` recalculado, aunque el usuario solo haya tocado una.

Consecuencia aceptada: dos ediciones concurrentes del mismo guión se pisan (la última gana). El contrato no ofrece `ETag` ni control de concurrencia optimista, y un guión es un recurso de un solo usuario, así que el riesgo real es bajo. Se recoge en Riesgos.

### D4 — Las preguntas del editor llevan una clave local estable, distinta del `id` del servidor
Al reordenar y eliminar filas, `@for` necesita un `track` que no cambie con la posición: con `track $index` el nodo del DOM se queda anclado a la posición, así que al mover una fila el foco se queda en el índice y no acompaña a la pregunta movida. El `id` del servidor tampoco sirve como clave: las preguntas nuevas no lo tienen todavía. Cada fila lleva entonces una **clave local** generada en el cliente por una secuencia monótona (`fila-1`, `fila-2`, …), que solo vive mientras dura la edición, nunca se envía y nunca se confunde con el `id` del contrato. Se prefiere la secuencia a un UUID porque es determinista en los tests y basta: la clave no se persiste ni se compara entre instancias.

Esto se documenta explícitamente porque la tentación de reutilizar el `id` del servidor como `track` es fuerte y rompería en cuanto se añada una pregunta. `PreguntaRequest` no acepta `id`, así que no hay nada que preservar al enviar.

**Restricción del framework:** el `@for` recorre el **modelo plano** (`modelo().preguntas`), no `formulario.preguntas`, y enlaza el campo por índice (`formulario.preguntas[$index].texto`). Resolver el estado de un campo dentro de la expresión de `track` lanza `NG01904: Orphan field` en cuanto el arreglo se reordena o encoge, porque Angular evalúa el `track` contra nodos que ya han quedado huérfanos. Los dos arreglos van siempre a la par, así que el índice es seguro, y la clave local —que vive en el modelo— sigue dando la identidad estable que necesita el reordenamiento.

### D5 — Reordenar con controles de subir/bajar, no con arrastre
Subir/bajar son botones normales: accesibles por teclado, anunciables por lector de pantalla y sin dependencia nueva. El arrastre exigiría una librería o una implementación propia de eventos de puntero, con un coste de accesibilidad que habría que compensar igualmente con controles de teclado.

Los controles se deshabilitan en los extremos (la primera no sube, la última no baja) en vez de ocultarse, para que la fila no cambie de forma al moverse.

### D6 — La última pregunta no se puede eliminar, y se explica por qué
`minItems: 1` es del contrato. En vez de dejar que el usuario vacíe la lista y descubra el `422` al guardar, el editor **retira la acción de eliminar cuando solo queda una pregunta** y explica que un guión sin preguntas no es un guión. Mismo criterio que el límite de dos toques en E3 (D5 de aquel change): la regla del método se comunica **antes** de intentarlo, no como un fallo.

El `422` se sigue manejando igual, porque la autoridad es el servidor.

### D7 — Un formulario Signal Forms reutilizado por alta y edición, con las preguntas **dentro** del modelo
Como en E1/E2/E3, un mismo componente sirve `guiones/nuevo` y `guiones/:idGuion/editar`. El modelo es `{ nombre, descripcion, preguntas: FilaPregunta[] }` y las preguntas viven **dentro** del modelo de Signal Forms, no en un signal aparte.

Signal Forms cubre las colecciones de longitud variable de forma nativa: `applyEach(ruta.preguntas, …)` aplica la validación por fila, `@for (pregunta of formulario.preguntas; …)` las recorre con su `FieldState` propio, y añadir, quitar o mover es actualizar el signal del modelo. Eso da tres cosas que un signal separado obligaría a construir a mano: el estado `touched`/`errors` **por fila**, la validación de fila integrada en el `valid()` del formulario, y un único punto de verdad.

La consecuencia práctica es que el botón de guardar se bloquea con **una sola condición** (`formulario().valid()`) en vez de con la conjunción de dos validaciones separadas, y que un `422` sobre una fila puede pintarse junto a esa fila, que es lo que exige la spec.

`FilaPregunta` es `{ claveLocal, texto }`: no lleva `orden` (lo da la posición, D2) ni `id` (D4). Alternativa descartada: mantener las preguntas fuera del modelo — obliga a reimplementar a mano la validación y el estado por fila que el framework ya resuelve.

### D8 — El alta crea el guión con una pregunta vacía ya presente
Un guión nuevo arranca con una fila de pregunta en blanco, no con una lista vacía y un botón «añadir». El contrato exige al menos una, así que empezar en cero solo añade un clic obligatorio y un estado inválido inicial que no aporta información.

### D9 — El listado muestra el número de preguntas, derivado, no un campo
`Guion.preguntas` viene completo en el listado, así que el recuento se deriva de `preguntas.length`. No se introduce ningún campo de recuento ni se pide nada extra. Si el contrato adelgazara el listado en el futuro, esto se vería inmediatamente en los tests.

### D10 — Modelos a mano en `core/api/guion.model.ts`
Siguiendo E1–E3: `Guion`, `Pregunta`, `PreguntaRequest`, `CrearGuionRequest` y `ActualizarGuionRequest` escritos a mano contra el contrato, sin generador. `ownerId` se declara como propiedad de la respuesta pero **no aparece en ningún request**. El listado reutiliza `RespuestaPaginada<Guion>` de `core/api/paginacion.model.ts`, sin duplicar el sobre.

Aquí no hay catálogos de unión (`const` arrays) como en E2/E3: este tag no tiene enums.

### D11 — Navegación del shell entre dos dominios, con la marca separada del menú
El shell hoy solo tiene la marca «ValidaLab» enlazando a `/ideas`. Se añade una navegación con `Ideas` y `Guiones` usando `routerLinkActive`, y la marca deja de ser el único camino de vuelta.

`Ideas` debe marcarse activa también en las rutas anidadas (`/ideas/:id/contactos`, etc.), así que se usa el `routerLinkActive` por defecto (coincidencia por prefijo) y **no** `[routerLinkActiveOptions]="{ exact: true }"`, que apagaría el resaltado en cuanto el usuario entrase a cualquier detalle. Es el matiz que hace que la barra sea útil en vez de engañosa.

### D12 — Cuatro rutas hijas del shell, con el mismo componente para alta y edición
`guiones`, `guiones/nuevo`, `guiones/:idGuion` y `guiones/:idGuion/editar` como hijas de la ruta del shell (ya protegida por `sesionGuard`), con `loadComponent`. `guiones/nuevo` se declara **antes** que `guiones/:idGuion` para que `nuevo` no se resuelva como un identificador, igual que ya ocurre con `ideas/nueva`.

### D13 — Los errores se ramifican por `codigo`, y el `403` no revela contenido
Patrón heredado de E1 (D6 de aquel change): nunca se muestra el `mensaje` del backend, se ramifica por `codigo` (`VALIDACION_FALLIDA`, `ACCESO_DENEGADO`, `RECURSO_NO_ENCONTRADO`). El `422` se mapea campo a campo desde `detalles`, incluidos los errores sobre `preguntas[n]`, que deben poder señalar la fila concreta y no solo el formulario. Un guión ajeno alcanzado por URL responde `403` y la vista muestra el aviso **en lugar** del contenido, nunca junto a él.

## Risks / Trade-offs

- **El `PATCH` de reemplazo pisa ediciones concurrentes** → dos pestañas editando el mismo guión: la última en guardar gana y la otra pierde sus cambios sin aviso. Mitigación: ninguna posible con el contrato actual (no hay `ETag` ni versión). Se acepta porque el recurso es de un solo usuario y la ventana es estrecha; si apareciera en uso real, es una petición de cambio al contrato.
- **Renumerar el `orden` en cada guardado reescribe preguntas intactas** → el servidor recibe como «cambiadas» preguntas que el usuario no tocó, y probablemente les asigne `id` nuevos. Cuando existan entrevistas, sus `preguntaId` podrían quedar colgando. Es la principal razón por la que este change va **antes** que el de entrevistas: hoy no hay ninguna referencia que romper. Se registra en Open Questions como asunto a cerrar con el contrato antes de E4b.
- **La clave local del editor podría confundirse con el `id` del contrato** → enviarla rompería el `PreguntaRequest`. Mitigación: la clave vive en un tipo local del editor que **no** tiene campo `id`, y hay un test que verifica que ningún cuerpo enviado la contiene.
- **Sin filtro ni búsqueda en el listado** → un usuario con muchos guiones tendrá que paginar para encontrar uno. Es la consecuencia de que el contrato no exponga filtro aquí; se acepta y no se compensa con un filtrado en cliente, que solo vería la página actual y daría una falsa sensación de completitud.
- **El shell se toca por primera vez desde E0** → un cambio en la barra afecta a todas las pantallas. Mitigación: el cambio es aditivo (una `<nav>` nueva) y `shell.spec.ts` se amplía en vez de reescribirse.
- **Subir/bajar es más lento que arrastrar para reordenar mucho** → mover una pregunta de la posición 10 a la 1 son nueve clics. Se acepta a cambio de accesibilidad y cero dependencias; los guiones de descubrimiento son cortos por diseño metodológico.

## Migration Plan

No aplica: es una feature nueva, aditiva, sin datos previos en el cliente ni cambios de contrato. La única superficie compartida que se modifica es el shell, de forma aditiva.

## Open Questions

- **¿Qué ocurre al borrar un guión ya usado por entrevistas?** El `DELETE /guiones/{idGuion}` solo documenta `204/401/403/404`: no hay `409` de recurso en uso, ni se define si las entrevistas que lo referencian se borran, se quedan huérfanas o lo impiden. Hoy no hay entrevistas, así que este change borra sin más. **Debe cerrarse contra el contrato antes del change de entrevistas**, que es donde el caso se vuelve alcanzable.
- **¿El servidor conserva el `id` de una pregunta al recibir un `PATCH` de reemplazo?** Determina si los `preguntaId` de las respuestas de una entrevista sobreviven a la edición de su guión. No afecta a este change; es la misma conversación que la anterior y conviene cerrarlas juntas.
