## 1. Dependencias y configuración

- [x] 1.1 Añadir deps agénticas (`@langchain/langgraph`, `@langchain/core`, `@langchain/anthropic`, `@langchain/openai`, `@langchain/google-genai`) con `NODE_OPTIONS=--use-system-ca`
- [x] 1.2 Añadir a `env.schema.ts` las vars `AGENTE_MODO`, `AGENTE_MAX_ITERACIONES`, `AGENTE_TIMEOUT_MS`, `AGENTE_MAX_REINTENTOS`, `SCORING_VERSION_RUBRICA` con defaults y coerción
- [x] 1.3 Añadir el getter `agente` a `AppConfigService` y actualizar `env.schema.spec.ts`
- [x] 1.4 Documentar las nuevas vars en `.env.example` y añadirlas al `.env` local (modo `fake`)

## 2. Traza de ejecución (persistencia)

- [x] 2.1 Crear la entidad `EjecucionAgente` (`ejecuciones_agente`) en `agente/ejecucion/`
- [x] 2.2 Generar y limpiar a mano la migración de `ejecuciones_agente`; verificar run/revert/run

## 3. Capa de abstracción de proveedor (RNF-06)

- [x] 3.1 Definir el esquema Zod de salida de scoring (`EsquemaScoring`) y el tipo `ScoreEntrevista` (reutilizar el de `entrevista.types`)
- [x] 3.2 Implementar `ModeloDeChatFactory.crear(ownerId)`: lee config BYOK, descifra la key, mapea `proveedorId → BaseChatModel` con `modeloScoring`
- [x] 3.3 Spec unitario de la factory: proveedor correcto por config, sin config BYOK → error de dominio, key descifrada

## 4. Grafo y tools de scoring

- [x] 4.1 Implementar las tools Zod `consultarHipotesis`, `consultarUmbrales`, `consultarEntrevistas` acotadas por `ownerId`/`ideaId` (consumiendo `IdeasService` y el repo de entrevistas)
- [x] 4.2 Construir el `StateGraph` de scoring (nodo agente + `ToolNode` + cierre con `withStructuredOutput`), con `recursionLimit` y `AbortController` por timeout
- [x] 4.3 Revalidar la salida con `EsquemaScoring` (Zod) y reintentar hasta `AGENTE_MAX_REINTENTOS`; specs unitarios con `BaseChatModel` mockeado (salida válida, salida inválida→reintento→fallido)

## 5. Servicio del agente

- [x] 5.1 Implementar `AgenteService.solicitarScoring(entrevista)`: hash idempotente, guardas de gobierno, transición de estados y persistencia de `score` + traza
- [x] 5.2 Implementar el modo `fake`: salida determinista derivada del hash, misma transición y traza sin proveedor real
- [x] 5.3 Cablear `AgenteModule` (providers, entidad, imports de `ProveedoresModule`/`IdeasModule`) y registrarlo en `AppModule`
- [x] 5.4 Specs unitarios de `AgenteService`: idempotencia (skip si hash igual), fake completa, fallo→`fallido`, aislamiento por owner

## 6. Disparo desde entrevistas

- [x] 6.1 Ampliar el tipo `EstadoScoring` con `procesando` (reutilizando `puntuada`/`fallida`); actualizar el enum de filtro del DTO de listado
- [x] 6.2 Inyectar `AgenteService` en `EntrevistasService` e invocar `solicitarScoring` (fire-and-forget con `.catch`) en `crear` y en `actualizar` cuando cambian las `respuestas`
- [x] 6.3 Ajustar los specs de `EntrevistasService` al nuevo colaborador (mock del agente); verificar que editar solo citas no dispara el agente

## 7. Verificación

- [x] 7.1 `openspec validate --strict`; `npm test` verde; `eslint` en modo check (sin `--fix`) limpio
- [x] 7.2 e2e local en modo `fake`: registrar entrevista → `estadoScoring` llega a `puntuada` con `score`; editar respuestas → re-scoring; verificar fila en `ejecuciones_agente`
- [x] 7.3 Actualizar `contrato-api/openapi.yaml`: estado `procesando` en el filtro y el esquema de `Entrevista`
