## Context

El registro de entrevistas (E4-B) ya persiste `respuestas`/`citas` y nace con `estadoScoring` `pendiente` y `score` `null`; `actualizar()` reinicia a `pendiente` al cambiar respuestas. Falta el productor del `score`: el Validador Inteligente (SRS §8), un agente **LangGraph.js**, no una simple llamada a API. La config BYOK (E7) ya guarda por usuario el proveedor, los dos modelos por tarea y la API key **cifrada** (`ServicioDeCifrado`, AES-256-GCM), y el catálogo (E7a) valida modelos. Hipótesis y umbrales (E2) existen como repositorios consultables. Este cambio implementa **solo la función de scoring** del validador; el veredicto (E6) reutilizará esta misma fundación agéntica.

Restricciones: TypeScript laxo (`strictNullChecks` on), Zod como única gramática de esquemas, migraciones como fuente de verdad del esquema, aislamiento por `owner_id` en toda consulta, sin infraestructura nueva (no hay cola/Redis). El sandbox no tiene red a los proveedores ni keys reales.

## Goals / Non-Goals

**Goals:**
- Módulo `agente` con un servicio inyectable que puntúa una entrevista y persiste su `score` validado con Zod.
- Capa de abstracción de proveedor (RNF-06) seleccionable por config BYOK, con la key descifrada en runtime.
- Grafo LangGraph con tools de dominio y salida estructurada validada + reintento (RF-AG-02/03).
- Idempotencia por hash (RF-22c), gobierno de ejecución con traza persistida (RF-AG-07/08).
- Modo `fake` para correr el flujo end-to-end sin proveedor real.

**Non-Goals:**
- El **veredicto** de idea (E6) y su tool `calcularKPIs`.
- KPIs agregados (E5) y el tablero.
- Cola de trabajos durable, reintentos con backoff persistentes, o checkpointer de LangGraph sobre Postgres (se deja como evolución; ver Riesgos).
- Endpoints nuevos: el scoring no expone API propia; se dispara desde `entrevistas` y se observa vía el `estadoScoring`/`score` de la entrevista.

## Decisions

### D1 — Módulo `agente` separado, no dentro de `entrevistas`
`backend/CLAUDE.md` fija que el validador "vive en el módulo `agente` como servicio inyectable desacoplado de los controladores". `entrevistas` importa `AgenteModule` y llama al servicio; el límite de módulo lo da el contexto acotado (el agente es reusable por el veredicto E6), no el grafo de dependencias. Organización interna **por tipo técnico** (módulo de infraestructura, no un agregado): `proveedor/` (factory + adaptadores), `scoring/` (grafo, tools, esquema de salida, servicio), `ejecucion/` (entidad de traza), con `agente.module.ts` en la raíz.

### D2 — Capa de abstracción de proveedor: factory → `BaseChatModel`
`ModeloDeChatFactory.crear(ownerId)` lee la config BYOK del usuario (`ConfiguracionService`), descifra la key (`ServicioDeCifrado`), y mapea `proveedorId → constructor LangChain`: `anthropic → ChatAnthropic`, `openai → ChatOpenAI`, `google → ChatGoogleGenerativeAI`, usando `modeloScoring` de la config. Un `Record<ProveedorId, (args) => BaseChatModel>` aísla las diferencias: añadir un cuarto proveedor es una entrada más. Sin config BYOK → `409 CONFLICTO` ("configura tu proveedor antes de puntuar"); esto se refleja como `estadoScoring: fallido` con motivo, no rompe el registro de la entrevista. *Alternativa descartada:* llamar a los SDKs nativos de cada proveedor — reintroduce el acoplamiento que RNF-06 prohíbe.

### D3 — Grafo LangGraph, no una cadena simple
CLAUDE.md exige LangGraph. Grafo mínimo pero real: `StateGraph` con nodo `agente` (el modelo con tools ligadas) → arista condicional a `ToolNode` (ejecuta las tools y vuelve al agente) o a `FIN`. El `recursionLimit` de LangGraph acota las iteraciones (RF-AG-07). La salida final se obtiene con `withStructuredOutput(EsquemaScoring)` en la llamada de cierre. *Alternativa descartada:* `model.withStructuredOutput()` suelto sin grafo — no permite tools ni el gobierno de iteraciones que pide el SRS.

### D4 — Salida estructurada: Zod nuestro manda, con reintento explícito
Aunque `withStructuredOutput` ya coacciona el formato, la salida se **revalida** con nuestro `EsquemaScoring` (Zod v4) antes de persistir (RNF-20). Si `safeParse` falla, se reintenta pidiendo corrección hasta `AGENTE_MAX_REINTENTOS`; agotados, `estadoScoring: fallido`. Ninguna salida sin validar toca el `score`. El esquema: `score` int 0–10, `justificacion` string, `señales` string[], `confianza` int 0–100.

### D5 — Tools de dominio con Zod, con el scope inyectado
`consultarHipotesis`, `consultarUmbrales`, `consultarEntrevistas` se construyen **por ejecución** cerrando sobre `ownerId`/`ideaId` verificados: el LLM nunca provee el owner (igual que en HTTP, se deriva del contexto, no de la entrada). Args validados con Zod; args inválidos vuelven al agente para autocorrección (RF-AG-05). Consumen `IdeasService` (hipótesis/umbrales viven en el módulo ideas) y el repositorio de entrevistas. `calcularKPIs` queda fuera (E6).

### D6 — Idempotencia por hash de respuestas + versión de rúbrica
`hashScoring = sha256(JSON.stringify(respuestas normalizadas) + '|' + SCORING_VERSION_RUBRICA)`. Se guarda dentro del bloque `score`. Antes de puntuar: si `estadoScoring === 'completado'` y el hash coincide con el actual, se omite (RF-22c). Cambiar respuestas cambia el hash → re-puntúa; subir `SCORING_VERSION_RUBRICA` invalida todos los scores previos sin tocar datos.

### D7 — Disparo asíncrono no bloqueante; `procesando` como estado observable
El scoring de un LLM tarda segundos; acoplar esa latencia al `201`/`200` del registro es inaceptable para "alto volumen". `entrevistas.crear`/`actualizar` invocan `agente.solicitarScoring(entrevista)` **sin `await`** (fire-and-forget con `.catch`), y devuelven la entrevista tal cual (aún `pendiente`, respetando el escenario ya especificado del `201`). En segundo plano el agente mueve `pendiente → procesando`, ejecuta el grafo y persiste `puntuada` (con `score`) o `fallida` (con motivo en la traza). Se reutiliza el vocabulario existente `EstadoScoring` (`pendiente|puntuada|fallida`) y solo se añade el estado intermedio `procesando`; el filtro por `estadoScoring` lo admite. *Alternativas descartadas:* síncrono (bloquea el request); cola Bull/Redis (infra nueva fuera de alcance).

### D8 — Modo `fake` a nivel de servicio
`AGENTE_MODO=fake` corta en `AgenteService`: produce un `ScoreEntrevista` **determinista** derivado del hash (score/confianza estables por contenido), persiste una traza `modo: 'fake'`, y no toca proveedor ni red. Habilita e2e del flujo completo (disparo → transición de estados → `score` persistido) sin key real. El grafo, la factory y la validación se cubren con specs unitarios que mockean el `BaseChatModel`. Mismo patrón pragmático que `BYOK_VALIDAR_KEY=false`.

### D9 — Traza de ejecución: tabla `ejecuciones_agente`
Entidad `EjecucionAgente` (migración nueva): `id`, `entrevista_id`, `owner_id`, `tarea` (`scoring`), `modo` (`real|fake`), `proveedor`, `modelo`, `estado` (`exitosa|fallida`), `iteraciones`, `tokens_entrada`/`tokens_salida` (nullable), `salida` jsonb (nullable), `error` (nullable), `fecha_creacion`. Da trazabilidad (RF-AG-08) y es el insumo para el costo estimado (E8). No es un checkpointer de LangGraph (se deja como evolución).

### D10 — Configuración por entorno (fail-fast)
Nuevas vars en `env.schema.ts` + getter `agente` en `AppConfigService`: `AGENTE_MODO` (`real|fake`, default `real`), `AGENTE_MAX_ITERACIONES` (int, default 6 → `recursionLimit`), `AGENTE_TIMEOUT_MS` (int, default 30000 → `AbortController`), `AGENTE_MAX_REINTENTOS` (int, default 2), `SCORING_VERSION_RUBRICA` (string, default `v1`). Documentadas en `.env.example`.

## Risks / Trade-offs

- **Huérfanas en `procesando` si el proceso cae a mitad de scoring** (fire-and-forget sin cola durable) → Mitigación: editar las respuestas re-dispara; el hash idempotente evita trabajo duplicado; una reconciliación/reintento en background queda como evolución documentada. Aceptable para el MVP.
- **Costo y latencia del LLM en alto volumen** → Gobierno (iteraciones + timeout) e idempotencia por hash acotan el gasto; el modo `fake` evita gasto en dev/test.
- **Interoperabilidad Zod v4 ↔ paquetes `@langchain/*`** (pueden traer Zod v3 internamente para `withStructuredOutput`) → Mitigación: revalidamos SIEMPRE con nuestro Zod v4 propio; si la coacción del binding falla, se degrada a pasar el JSON Schema y validar a mano. La corrección no depende del binding.
- **Instalación de deps en el sandbox (TLS)** → usar `NODE_OPTIONS=--use-system-ca` en `npm install` (memoria del proyecto).
- **El `estadoScoring` es `varchar`**: añadir el estado `procesando` no requiere migración de esquema (`puntuada`/`fallida` ya existen), pero sí actualizar el tipo TS `EstadoScoring` y el enum de filtro del DTO de listado.
