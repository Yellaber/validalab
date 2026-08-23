## Context

Segundo y último corte de E4b. E4b-1 dejó todo el andamiaje —modelos fieles al contrato, servicio, detalle de entrevista— y una frontera explícita: mostrar `estadoScoring` como etiqueta y no interpretarlo. Este change cruza esa frontera.

Tres hechos del contrato mandan sobre el diseño:

- **El bloque `score` es de solo lectura y puede ser `null`.** Lo produce el agente; el cliente nunca lo envía. Es `null` mientras el scoring está `pendiente` o queda `fallida`.
- **`estadoScoring` es asíncrono y no hay canal de notificación.** Ni websockets ni webhooks: la única forma de enterarse de que el agente terminó es volver a preguntar.
- **El ajuste conserva ambos valores.** `POST .../ajuste-score` devuelve la entrevista «con el bloque `score` original **intacto** y su bloque `ajuste`». El contrato no permite sobrescribir el juicio del agente, solo acompañarlo.

Ese tercer punto no es un detalle de implementación: es la postura del producto. El agente es **consultivo**, y conservar el desacuerdo entre máquina y humano es lo que permite auditarlo después.

## Goals / Non-Goals

**Goals:**
- Mostrar el juicio del agente con la trazabilidad que lo hace auditable meses después.
- Resolver el asincronismo sin dejar la vista colgada ni martillear el backend.
- Registrar el ajuste humano sin ocultar nunca el score del agente.
- Ser honestos sobre el costo: es consumo estimado, no saldo.
- Retirar limpiamente la frontera temporal que E4b-1 declaró.

**Non-Goals:**
- Agregar scores en KPIs o pintar el tablero (E5).
- Veredicto de la idea (E6) ni configuración BYOK (E7).
- Re-evaluación en lote y su estimación de costo (E8), que tienen endpoints propios.
- Hacer polling en el **listado**: multiplicaría las peticiones por fila sin que nadie esté esperando un resultado concreto.
- Editar o borrar un ajuste ya registrado: el contrato no lo ofrece.

## Decisions

### D1 — El polling vive en el detalle, con corte, y solo mientras hace falta
La regla es: si `estadoScoring` es `pendiente` o `procesando`, volver a consultar cada **3 segundos**, hasta **20 intentos** (~1 minuto), parando en cuanto el estado sea `puntuada` o `fallida`. Al agotarse los intentos el polling **se detiene** y la vista ofrece refrescar a mano explicando que el scoring está tardando más de lo normal.

Los tres límites son deliberados:

- **Solo en el detalle.** Es la única pantalla donde alguien está esperando *ese* resultado. Hacerlo en el listado multiplicaría peticiones por fila para nadie.
- **Con corte.** Un scoring atascado en `procesando` dejaría peticiones corriendo indefinidamente. Con corte, el peor caso es un minuto de consultas y luego un botón.
- **Condicionado al estado.** Una entrevista `puntuada` no dispara ni una sola consulta extra.

Se cancela al destruir el componente: nada de temporizadores huérfanos sobreviviendo a la navegación.

Alternativa descartada: polling indefinido mientras la vista viva. Más cómodo en el caso feliz, pero convierte un fallo del backend en tráfico perpetuo.

**Dos restricciones del framework** que el detalle debe respetar al conectar el seguimiento:

- El `effect` que alimenta el seguimiento **debe envolver la llamada en `untracked`**. `sincronizar` lee y escribe los signals internos del seguimiento, así que sin aislarlo el efecto se declara dependiente de lo que él mismo modifica y se re-dispara en bucle infinito. Su única dependencia legítima es `estadoScoring`.
- El signal de la entrevista **debe consultarse con `hasValue()`**, no leer `value()` a secas: éste lanza cuando el recurso está en error, y el seguimiento lo lee sin pasar antes por la rama de error de la plantilla. Con la guarda, un `403` o un `404` dan `undefined` y el seguimiento simplemente no arranca.

### D2 — El score y el ajuste se muestran **juntos**, nunca uno en lugar del otro
Cuando existe `ajuste`, la vista muestra los dos valores y señala explícitamente **cuál prevalece en los KPIs** (el del usuario). Mostrar solo el ajustado ahorraría espacio y destruiría justo lo que el contrato se esfuerza en conservar: la discrepancia entre el agente y el humano.

Por la misma razón, ajustar **no** oculta ni tacha la justificación del agente. El usuario corrige el número; el razonamiento sigue ahí para poder releerlo.

### D3 — Las señales estructuradas ausentes se dicen, no se inventan
`senalesEstructuradas` es opcional: un score producido con una rúbrica anterior no las trae. El contrato precisa que, **al agregarlas en KPIs**, las ausentes cuentan como `false`.

Eso vale para agregar, no para mostrar. Pintar cuatro «no» ante un score que sencillamente no las clasificó sería afirmar algo que el agente nunca dijo. La vista distingue **ausencia** de **negativo**: si no vienen, lo declara («esta versión de la rúbrica no clasificó señales estructuradas»).

Es el mismo criterio que gobierna el `403` en el resto del cliente: mejor decir que no se sabe que rellenar el hueco.

### D4 — El costo se etiqueta como consumo, nunca como saldo
`costoEstimado` se calcula localmente desde tokens × tabla de precios. **No es** el saldo de la cuenta del proveedor —las API keys de inferencia no lo exponen— y confundirlos sería un error caro para el usuario (RNF-17).

La vista lo presenta como «coste estimado de esta puntuación» junto a sus tokens, sin insinuar en ningún momento que refleje el crédito disponible. Los tres campos son opcionales en el contrato, así que el bloque de costo solo aparece cuando vienen.

### D5 — Re-puntuar se ofrece siempre, pero se llama distinto según el estado
Con `fallida` es un **reintento** y la acción es la protagonista de la vista. Con `puntuada` es un **re-puntuado** deliberado, disponible pero discreto.

Ofrecerlo en ambos casos es seguro gracias a la idempotencia del contrato (RF-22c: hash de respuestas + versión de rúbrica). Re-puntuar una entrevista intacta no vuelve a invocar al agente, así que no hay dinero quemado por un clic de más. Aun así la UI lo advierte antes de disparar, porque el usuario no tiene por qué conocer esa garantía y sí sabe que la inferencia se paga.

Tras disparar, el estado vuelve a `pendiente`/`procesando` y **el polling de D1 arranca solo**: la acción no necesita lógica de espera propia.

### D6 — El ajuste es un formulario Signal Forms con la `nota` obligatoria
`scoreAjustado` (0–10) y `nota` con contenido: el contrato exige ambos. La `nota` no es burocracia — es lo que hace auditable el desacuerdo; un ajuste sin motivo es un número sin defensa.

Se resuelve con Signal Forms como el resto del cliente: `required` sobre ambos, `min`/`max` sobre el número, y el botón bloqueado con `formulario().valid()`. El formulario se abre desde el detalle y se cierra al registrar, sin pantalla propia: es una acción sobre la entrevista, no un recurso aparte.

### D7 — El bloque de score es un componente propio
`features/ideas/entrevistas/score/` con el bloque completo: valores, justificación, señales, señales estructuradas, trazabilidad y costo. El detalle ya carga entrevista y guión, y añadirle todo esto en línea lo haría ilegible.

La separación además marca la frontera con lo que viene: E5 mostrará estos mismos scores agregados, y tener el bloque aislado facilita reutilizar su lenguaje visual.

### D8 — `EntrevistasService` gana ahora sus dos últimas operaciones
`puntuar(ideaId, id)` y `ajustarScore(ideaId, id, datos)`. E4b-1 las dejó fuera a propósito —«un servicio con métodos que nadie llama invita a usarlos antes de tiempo»— y su test de frontera verificaba esa ausencia. Ese test se sustituye por los que verifican que ahora pegan en su ruta y método.

### D9 — La frontera de E4b-1 se retira, no se reinterpreta
El requisito «Frontera con el scoring del agente» prohibía exactamente lo que esta capacidad hace. Se **elimina** del spec en vez de modificarlo: su contenido entero era «no hagas esto todavía», y una vez hecho no queda nada que conservar. El delta lo declara con su `Reason` y su `Migration`.

Modificarlo para decir lo contrario habría dejado un requisito que describe la ausencia de un límite, que no es un requisito.

## Risks / Trade-offs

- **El polling puede agotarse con el scoring aún en curso** → un scoring lento de más de un minuto deja al usuario con el botón de refrescar. Mitigación: el mensaje explica que sigue en marcha y que puede volver más tarde; el estado se conserva en el servidor y nada se pierde. Se prefiere a tráfico indefinido.
- **Re-puntuar cuesta dinero cuando la entrevista sí cambió** → mitigación: la advertencia previa. No se puede saber en el cliente si el hash cambió, así que se avisa siempre en vez de prometer una gratuidad que no se puede garantizar.
- **La trazabilidad expone proveedor y modelo** → es intencional y no filtra secretos: la API key nunca llega al cliente. Saber con qué modelo se puntuó es imprescindible para auditar un score viejo.
- **El bloque de score puede quedar muy denso** → score, confianza, cuatro señales, justificación, trazabilidad y costo es mucha información. Mitigación: jerarquía visual clara —valor y confianza arriba, trazabilidad y costo al final como datos de auditoría— y ocultar los bloques opcionales que no vengan en vez de mostrarlos vacíos.
- **Dos fuentes de verdad visibles para el score** → mostrar dos números puede confundir sobre cuál cuenta. Mitigación: decirlo explícitamente en la propia vista, no dejarlo a la intuición.

## Open Questions

Ninguna. El contrato define ambos endpoints por completo, y las tres preguntas que E4a dejó abiertas se cerraron antes de E4b-1.
