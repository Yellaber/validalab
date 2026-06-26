## Context

El contrato (`contrato-api/openapi.yaml`) ya tiene los módulos `usuarios` (E0), `ideas` (E1+E2) y `contactos` (E3) y las convenciones transversales. Este cambio introduce el módulo **`entrevistas`** (épica E4, *Pipeline de entrevistas y scoring por IA*). Según el modelo de dominio (SRS §5), las entrevistas **cuelgan de la idea**, pero cada entrevista **vincula además un contacto** y se conduce con un **guión reutilizable** (SRS §1.4, §3.2). El rasgo distintivo del producto vive aquí: al registrar las respuestas, el **Validador Inteligente** puntúa la entrevista automáticamente (score 0–10 con justificación, señales y confianza), y el usuario puede **ajustar** ese score conservando ambos valores. E4 cubre la **captura** y la **exposición del score/ajuste**; el **cálculo** de KPIs (E5), el **veredicto** (E6), la **config BYOK** (E7) y la **re-evaluación en lote/costo** (E8) son épicas posteriores.

## Goals / Non-Goals

**Goals:**
- Definir el CRUD del guión reutilizable entre ideas, con preguntas ordenadas.
- Definir el CRUD de entrevistas anidadas por idea, vinculando contacto y guión, con respuestas y citas.
- Modelar el scoring automático del agente como resultado **embebido y de solo lectura** en la entrevista, con `estadoScoring` para soportar ejecución asíncrona, y una acción para (re)disparar.
- Modelar el ajuste humano del score conservando el valor del agente y el del usuario.
- Reflejar el invariante RNF-14 (`ENTREVISTA_SIN_VINCULO`) y el efecto sobre el estado del contacto (`entrevistado`).
- Reutilizar convenciones y componentes existentes; mantener un único documento.

**Non-Goals:**
- **No** se calcula ningún KPI ni se recalcula el tablero (E5); solo se documenta que el scoring/ajuste los alimentará.
- **No** se modela el grafo LangGraph, los esquemas Zod ni la persistencia de ejecuciones (runtime/E6).
- **No** se modela la rúbrica como recurso editable (plantillas base de guión/rúbrica son del administrador; aquí solo se referencia `rubricaVersion` para trazabilidad).
- **No** re-evaluación en lote ni costo estimado (E8).

## Decisions

### Decisión 1: El guión es un recurso de nivel de usuario (`/guiones`), no anidado por idea
- HU-11 pide un guión **reutilizable entre ideas**; por eso es un recurso de primer nivel propiedad del usuario, no colgado de una idea.
- Va bajo el `tag` `entrevistas` (es parte del pipeline de entrevistas), aunque su path sea `/guiones`.
- Las `preguntas` se modelan como un arreglo **ordenado** embebido en el `Guion` (se crean y editan junto con él), en lugar de un sub-recurso CRUD: una lista ordenada de preguntas es más simple de manejar como propiedad del guión.

### Decisión 2: Las entrevistas se anidan bajo la idea (`/ideas/{id}/entrevistas`)
- La entrevista cuelga de la idea (SRS §5) y el listado por idea es la vista base para los KPIs (E5); anidar refuerza el aislamiento por `ownerId` de la idea padre, como en `contactos` (E3).
- El `contactoId` y el `guionId` viajan en el cuerpo. El `contactoId` MUST ser un contacto de **la misma idea**; el `guionId`, un guión **del mismo usuario**. Idea/contacto inválidos o ajenos → `422 ENTREVISTA_SIN_VINCULO` (RNF-14; código ya en el catálogo).
- El listado se **pagina** (una idea puede tener cientos de entrevistas; RNF-02 habla de hasta 200) con filtros por `contactoId` y `estadoScoring`.

### Decisión 3: El scoring del agente es resultado embebido y de solo lectura, con estado para asincronía
- La `Entrevista` expone `estadoScoring` (`pendiente` | `puntuada` | `fallida`) y un bloque `score` (`ScoreEntrevista`) **de solo lectura**: lo produce el agente, nunca el cliente (RF-09b, RF-AG-02).
- **Por qué un `estadoScoring` y no un score síncrono obligatorio:** la invocación al agente puede tardar y depende del proveedor BYOK; modelar el estado permite ejecución asíncrona (crear → `pendiente` → `puntuada`/`fallida`) sin acoplar el contrato a una latencia concreta. El cliente consulta con `GET` o filtra por `estadoScoring`.
- **Acción `POST .../puntuar`** para (re)disparar el scoring tras `fallida` o cuando convenga; es el punto de extensión para la re-evaluación de E8. Si la salida del agente no valida tras reintentos (RF-AG-03), el estado queda `fallida` (`SALIDA_AGENTE_INVALIDA`), sin romper el flujo.
- El bloque `score` lleva `proveedor`, `modelo` y `rubricaVersion` para trazabilidad (RF-AG-07), análogo al snapshot del veredicto (E6).

### Decisión 4: Editar respuestas invalida el score; las citas no
- `PATCH` permite editar `respuestas` y `citas`, pero **no** `ideaId`/`contactoId`/`guionId` (la trazabilidad del vínculo es fija) ni el `score`.
- Cambiar `respuestas` MUST devolver la entrevista a `estadoScoring` `pendiente` y re-disparar el scoring (el insumo del agente cambió); cambiar solo `citas` no afecta el score. Esto anticipa la idempotencia de scoring de E8 (hash de respuestas + versión de rúbrica) sin implementarla aquí.

### Decisión 5: El ajuste humano es una acción que conserva ambos valores
- `POST .../ajuste-score` con `scoreAjustado` (0–10) + `nota` (RF-09c, HU-12b). Se modela como **acción** (no `PATCH`) porque no edita el score del agente: lo complementa.
- La `Entrevista` conserva el bloque `score` (agente) **y** el bloque `ajuste` (usuario). El contrato declara que el `ajuste` es el valor que **prevalece** en el cálculo de KPIs (E5), aunque el cálculo no se implemente aquí.

### Decisión 6: Crear una entrevista mueve el contacto a `entrevistado`
- SRS: registrar la entrevista "mueve el contacto al estado `entrevistado`". E3 reservó ese estado a esta vía (la acción `/estado` de contactos lo rechaza manualmente con `409`); E4 es el camino legítimo.
- Un contacto ya `entrevistado` o `descartado` → `409 CONFLICTO` (no se re-entrevista ni se entrevista a un descartado). El paso de la idea `borrador → en_validacion` lo describe `ideas` (E1) y no se re-especifica aquí.

### Decisión 7: Schemas de dominio (en `components.schemas`)
- `Guion`: `id`, `ownerId` (solo lectura), `nombre`, `descripcion`, `preguntas` (`Pregunta[]`), fechas. `Pregunta`: `id`, `orden` (entero), `texto`.
- `CrearGuionRequest` / `ActualizarGuionRequest`: `nombre`, `descripcion`, `preguntas` (con `texto` y `orden`); en actualización todas opcionales (las `preguntas` reemplazan el conjunto ordenado). `GuionesPaginados`.
- `EstadoScoring`: `pendiente` | `puntuada` | `fallida`.
- `ScoreEntrevista` (solo lectura): `score` (number 0–10), `justificacion`, `senales` (`string[]`), `confianza` (number 0–100), `proveedor`, `modelo`, `rubricaVersion`, `fechaScoring`.
- `AjusteScore` (solo lectura): `scoreAjustado` (number 0–10), `nota`, `fechaAjuste`.
- `RespuestaEntrevista`: `preguntaId` (uuid, la pregunta del guión), `texto` (la respuesta capturada). `Cita`: `id`, `texto`, `contexto` (opcional).
- `Entrevista`: `id`, `ideaId` (solo lectura), `contactoId`, `guionId`, `respuestas` (`RespuestaEntrevista[]`), `citas` (`Cita[]`), `estadoScoring`, `score` (`ScoreEntrevista`, nullable), `ajuste` (`AjusteScore`, nullable), fechas.
- `CrearEntrevistaRequest`: `contactoId`, `guionId`, `respuestas`, `citas` (sin `ideaId`/`score`). `ActualizarEntrevistaRequest`: `respuestas`, `citas` (opcionales). `AjustarScoreRequest`: `scoreAjustado` (requerido), `nota` (requerida). `EntrevistasPaginadas`.
- **Por qué `senales` como `string[]` y no enum:** las "señales predefinidas de validación" provienen de la rúbrica (configurable/administrada), no de un catálogo estable del contrato; modelarlas como cadenas evita cablear un catálogo que aún no está especificado.
- Parámetros nuevos: `idGuion`, `idEntrevista` (path), `filtroEstadoScoring`, `filtroContacto` (query).

### Decisión 8: Aislamiento y mapeo de errores
- Toda ruta `/ideas/{id}/...` o `/guiones/...` ajena → `403 ACCESO_DENEGADO`; recurso inexistente → `404 RECURSO_NO_ENCONTRADO`; sin token → `401 NO_AUTENTICADO`.
- Idea/contacto sin vínculo válido del mismo usuario → `422 ENTREVISTA_SIN_VINCULO`; payload mal formado → `422 VALIDACION_FALLIDA`.
- Contacto en estado incompatible para entrevistar → `409 CONFLICTO`. Scoring fallido → `estadoScoring` `fallida` (asociado a `SALIDA_AGENTE_INVALIDA`).
- Se reutilizan las `responses` compartidas y el parámetro `idIdea`; no se añaden códigos de error nuevos.

## Risks / Trade-offs

- **[Scoring asíncrono modelado con `estadoScoring`]** El contrato no fija si el scoring es síncrono u asíncrono; el cliente debe contemplar `pendiente`. → Aceptado: es lo más robusto frente a proveedores BYOK con latencias distintas; un scoring síncrono es un caso particular (la respuesta ya llega `puntuada`).
- **[`senales` como cadenas libres]** Pierde validación de catálogo. → Aceptado: la rúbrica/señales son configurables y aún no especificadas; un enum prematuro acoplaría el contrato. Revisable cuando se defina la rúbrica.
- **[Guión reutilizable entre ideas vs. snapshot por entrevista]** Si se edita un guión, las entrevistas antiguas referencian el guión vigente, no una copia. → Aceptado para el MVP: la entrevista guarda sus `respuestas` por `preguntaId`; un versionado/snapshot del guión queda fuera de alcance.
- **[Preguntas embebidas en el guión]** Reemplazar el arreglo en `PATCH` puede complicar la correspondencia `preguntaId`↔respuesta si se borran preguntas. → Aceptado: el MVP edita guiones poco; un CRUD de preguntas como sub-recurso sería sobre-ingeniería ahora.

## Open Questions

- Ninguna pendiente. Resueltas: guión **a nivel de usuario** (reutilizable entre ideas); entrevistas **anidadas por idea** con contacto/guión en el cuerpo; scoring **embebido, de solo lectura y con estado**; ajuste humano como **acción que conserva ambos valores**; crear entrevista mueve el contacto a `entrevistado`.
