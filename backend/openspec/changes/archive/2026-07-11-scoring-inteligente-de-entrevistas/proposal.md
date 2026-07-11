## Why

El registro de entrevistas ya guarda las respuestas y nace con `estadoScoring` `pendiente`, pero nadie las puntúa: el bloque `score` siempre queda `null`. El Validador Inteligente —el componente distintivo del producto (SRS §8)— es quien puntúa cada entrevista de forma automática al guardarla. Sin él, los KPIs de señal (E5) y el veredicto (E6) no tienen insumo. Este cambio incorpora el agente de scoring: la primera de las dos funciones del Validador (la segunda, el veredicto, es E6).

## What Changes

- **Nuevo módulo de dominio `agente`** (RNF-10): un servicio LangGraph.js inyectable, desacoplado de los controladores. Ningún controlador nuevo; el scoring se dispara desde `entrevistas`.
- **Capa de abstracción de proveedor (RNF-06):** una factory que, según la config BYOK del usuario, descifra la API key con `ServicioDeCifrado` y devuelve un `BaseChatModel` común de `@langchain/{anthropic,openai,google-genai}`. Añadir un cuarto proveedor no se propaga al resto.
- **Grafo LangGraph de scoring:** puntúa una entrevista a partir de sus respuestas y del contexto de la idea. La salida SIEMPRE se **valida con Zod** (`score` 0–10, `justificacion`, `señales`, `confianza` 0–100); una salida inválida se **reintenta** solicitando corrección (RF-AG-03) y nunca se persiste sin validar (RF-AG-02, RNF-20).
- **Tools con Zod (RF-AG-04/05):** `consultarHipotesis`, `consultarUmbrales`, `consultarEntrevistas`, con argumentos validados por Zod; argumentos inválidos se devuelven al agente para autocorrección. (`calcularKPIs` corresponde al veredicto, E6.)
- **Idempotencia (RF-22c):** hash de las respuestas + versión de rúbrica; no se re-puntúa si nada cambió.
- **Gobierno de ejecución (RF-AG-07/08):** límite de iteraciones y timeout por ejecución configurables por entorno; se persiste la traza de cada ejecución (estado, tools, salida, tokens) para trazabilidad.
- **Modo `fake`** de la capa agéntica: con `AGENTE_MODO=fake` el agente devuelve una salida estructurada determinista sin salir a los proveedores, para desarrollo y pruebas e2e locales sin key ni red reales (mismo patrón que `BYOK_VALIDAR_KEY`).
- **Disparo desde `entrevistas`:** crear una entrevista y editar sus `respuestas` disparan el scoring del agente; el `estadoScoring` transita `pendiente → procesando → puntuada` (o `fallida` si el agente no produce salida válida dentro del gobierno).

## Capabilities

### New Capabilities
- `scoring-inteligente-de-entrevistas`: el agente LangGraph de scoring de entrevistas — capa de abstracción de proveedor por config BYOK, salida estructurada validada con Zod y reintento, tools de consulta de dominio, idempotencia por hash de respuestas + versión de rúbrica, gobierno de ejecución (iteraciones/timeout) con traza persistida, y modo `fake` para entornos sin proveedor real.

### Modified Capabilities
- `gestion-de-entrevistas`: crear una entrevista y editar sus `respuestas` ahora DISPARAN el scoring del agente (antes solo dejaban `estadoScoring` `pendiente`); se introduce el estado intermedio `procesando` (los estados terminales `puntuada`/`fallida` ya existen), y el filtro por `estadoScoring` admite el nuevo estado.

## Impact

- **Código:** nuevo `src/agente/` (módulo, servicio del validador, factory de proveedor, grafo y tools de scoring, entidad `EjecucionAgente`, modo `fake`). `entrevistas` importa `AgenteModule` e invoca el scoring en `crear`/`actualizar`. `AppModule` registra el nuevo módulo.
- **Persistencia:** nueva tabla `ejecuciones_agente` (traza) vía migración; el `estadoScoring` de `entrevistas` amplía su dominio con `procesando` (sin cambio de esquema: es `varchar`; `puntuada`/`fallida` ya existían).
- **Dependencias npm (nuevas):** `@langchain/langgraph`, `@langchain/core`, `@langchain/anthropic`, `@langchain/openai`, `@langchain/google-genai`.
- **Entorno:** nuevas variables `AGENTE_MODO` (`real`|`fake`), `AGENTE_MAX_ITERACIONES`, `AGENTE_TIMEOUT_MS`, `SCORING_VERSION_RUBRICA`, validadas al arrancar (fail-fast) y documentadas en `.env.example`.
- **Reutiliza la fundación:** `ServicioDeCifrado` y el `ConfiguracionService`/`CatalogoService` de `proveedores`; `IdeasService`, `GuionesService` y los repositorios de hipótesis/umbrales para las tools; el sobre `Error` y sus excepciones de dominio.
