# scoring-inteligente-de-entrevistas Specification

## Purpose
TBD - created by archiving change scoring-inteligente-de-entrevistas. Update Purpose after archive.
## Requirements
### Requirement: Puntuar automáticamente una entrevista al guardarla
El sistema SHALL disparar el scoring de una entrevista por el agente Validador Inteligente cuando la entrevista se registra y cuando se editan sus `respuestas`. El scoring SHALL ejecutarse de forma **asíncrona**, sin bloquear la respuesta HTTP del registro o la edición. El `estadoScoring` de la entrevista SHALL evolucionar `pendiente → procesando → puntuada` al puntuar con éxito, o `pendiente → procesando → fallida` cuando el agente no produzca una salida válida dentro del gobierno de ejecución. Al completar con éxito, el sistema SHALL persistir el bloque `score` del agente en la entrevista; nunca SHALL persistir una salida no validada.

#### Scenario: El registro dispara el scoring y persiste el score
- **WHEN** un usuario autenticado registra una entrevista de una idea suya
- **THEN** el sistema ejecuta el scoring en segundo plano y, al completar, el `estadoScoring` queda `puntuada` con el bloque `score` persistido (`score`, `justificacion`, `senales`, `confianza`)

#### Scenario: Editar respuestas re-dispara el scoring
- **WHEN** un usuario autenticado edita las `respuestas` de una entrevista ya puntuada
- **THEN** el `estadoScoring` vuelve a `pendiente` y el scoring se ejecuta de nuevo hasta dejar un nuevo bloque `score`

#### Scenario: Fallo del agente deja la entrevista en fallida
- **WHEN** el agente no produce una salida válida dentro del límite de iteraciones o del timeout
- **THEN** el `estadoScoring` queda `fallida`, el bloque `score` no se altera y el motivo queda registrado en la traza de ejecución

### Requirement: Validar la salida del agente con Zod y reintentar
El sistema SHALL validar toda salida del agente contra un esquema Zod antes de persistirla: `score` entero 0–10, `justificacion` texto, `senales` lista de texto, `confianza` entero 0–100, y un bloque de **señales estructuradas** `senalesEstructuradas` con `dolorConfirmado`, `dolorUrgente`, `sinSolucionActual` y `disposicionPago` (booleanos). Estas señales estructuradas SHALL ser el insumo de los KPIs de señal de problema/pago (E5). Si la salida no cumple el esquema, el sistema SHALL solicitar corrección al agente y reintentar hasta un máximo configurable; agotados los reintentos SHALL marcar la entrevista `fallida`. Ninguna salida sin validar SHALL afectar el `score`.

#### Scenario: Salida válida se persiste
- **WHEN** el agente devuelve una salida que cumple el esquema Zod, incluidas las señales estructuradas
- **THEN** el sistema la persiste como el bloque `score` de la entrevista, con sus `senalesEstructuradas`

#### Scenario: Salida inválida se reintenta
- **WHEN** el agente devuelve una salida que no cumple el esquema (p. ej. `score` fuera de 0–10 o una señal estructurada ausente)
- **THEN** el sistema solicita corrección y reintenta; si tras los reintentos permitidos no hay salida válida, el `estadoScoring` queda `fallida`

#### Scenario: El modo fake emite señales deterministas
- **WHEN** el entorno está en modo `fake` y se puntúa una entrevista
- **THEN** el bloque `score` incluye `senalesEstructuradas` deterministas derivadas del hash, sin invocar a ningún proveedor

### Requirement: Seleccionar el proveedor de IA según la config BYOK del usuario
El sistema SHALL seleccionar el modelo de IA para el scoring a partir de la configuración BYOK del usuario dueño de la idea: proveedor y `modeloScoring`, con la API key descifrada en el momento de la ejecución. Una capa de abstracción común SHALL ocultar las diferencias entre proveedores (Anthropic, OpenAI, Google) de modo que añadir un proveedor no afecte al resto. Si el usuario no tiene configuración BYOK, el scoring SHALL quedar `fallida` con el motivo correspondiente, sin afectar el registro de la entrevista.

#### Scenario: Scoring usa el proveedor configurado por el usuario
- **WHEN** un usuario con config BYOK registra una entrevista
- **THEN** el scoring usa el proveedor y `modeloScoring` de su configuración, con su API key descifrada

#### Scenario: Sin config BYOK el scoring falla de forma aislada
- **WHEN** un usuario sin config BYOK registra una entrevista
- **THEN** la entrevista se registra con `estadoScoring` `fallida` y el motivo queda en la traza, sin propagar error al registro

### Requirement: Tools de dominio del agente definidas con Zod
El sistema SHALL exponer al agente tools de consulta de dominio (`consultarHipotesis`, `consultarUmbrales`, `consultarEntrevistas`) con argumentos validados por Zod. Cada tool SHALL operar acotada al `ownerId` e `ideaId` de la entrevista puntuada, derivados del contexto de ejecución y nunca de la entrada del modelo. Argumentos inválidos SHALL devolverse al agente para autocorrección, sin romper el flujo.

#### Scenario: El agente consulta las hipótesis de la idea
- **WHEN** el agente invoca `consultarHipotesis` durante el scoring
- **THEN** recibe las hipótesis de la idea de la entrevista, acotadas al owner, sin poder solicitar datos de otra idea u owner

#### Scenario: Argumentos de tool inválidos se devuelven al agente
- **WHEN** el agente invoca una tool con argumentos que no cumplen su esquema Zod
- **THEN** el sistema devuelve el error de validación al agente para que corrija, sin abortar la ejecución

### Requirement: Scoring idempotente por hash de respuestas y versión de rúbrica
El sistema SHALL calcular un hash a partir de las `respuestas` de la entrevista y de la versión de rúbrica vigente, y lo SHALL asociar al bloque `score`. Antes de puntuar, si la entrevista ya está `puntuada` con un hash idéntico, el sistema SHALL omitir la re-ejecución. Cambiar las respuestas o subir la versión de rúbrica SHALL cambiar el hash y habilitar un nuevo scoring.

#### Scenario: No re-puntúa si nada cambió
- **WHEN** se solicita el scoring de una entrevista ya `puntuada` cuyo hash de respuestas + rúbrica no cambió
- **THEN** el sistema omite la ejecución y conserva el `score` existente

#### Scenario: Cambiar respuestas invalida la idempotencia
- **WHEN** cambian las `respuestas` de la entrevista
- **THEN** el hash cambia y el sistema ejecuta un nuevo scoring

### Requirement: Gobierno de ejecución y traza persistida
El sistema SHALL acotar cada ejecución del agente con un límite de iteraciones y un timeout configurables por entorno. El sistema SHALL persistir una traza por CADA ejecución del agente —de cualquier tarea (`scoring` o `veredicto`)— con al menos: idea, entrevista (cuando aplique; el veredicto no la tiene), owner, tarea, modo (`real`/`fake`), proveedor y modelo, estado (`exitosa`/`fallida`), iteraciones, tokens consumidos (cuando el proveedor los reporte), salida y motivo de error. La traza SHALL ser la fuente única, reconstruible, de la trazabilidad (RF-AG-08) y del costo estimado (E8).

#### Scenario: Se persiste la traza de una ejecución exitosa
- **WHEN** el agente completa el scoring de una entrevista
- **THEN** se registra una traza con tarea `scoring`, la idea de la entrevista, estado `exitosa`, proveedor, modelo, iteraciones y (si el proveedor los reporta) los tokens

#### Scenario: Se persiste la traza de un veredicto
- **WHEN** el agente emite un veredicto de una idea
- **THEN** se registra una traza con tarea `veredicto`, la idea, sin entrevista, con proveedor, modelo y los tokens consumidos (cuando el proveedor los reporte)

#### Scenario: El timeout o el límite de iteraciones corta la ejecución
- **WHEN** una ejecución supera el límite de iteraciones o el timeout configurados
- **THEN** la ejecución se detiene, la traza queda `fallida` con el motivo y la entrevista en `estadoScoring` `fallida`

### Requirement: Modo fake para entornos sin proveedor real
El sistema SHALL soportar un modo `fake` de la capa agéntica, activable por entorno, que produce una salida de scoring válida y determinista sin invocar a ningún proveedor ni salir a la red. El modo `fake` SHALL recorrer el mismo flujo de disparo, transición de estados y persistencia de `score` y traza que el modo real. En modo `real` el sistema SHALL invocar al proveedor configurado.

#### Scenario: En modo fake el scoring completa sin proveedor real
- **WHEN** el entorno está en modo `fake` y se registra una entrevista
- **THEN** el `estadoScoring` llega a `puntuada` con un `score` determinista y una traza `modo` `fake`, sin invocar a ningún proveedor

