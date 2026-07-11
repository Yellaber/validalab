## Context

E4 dejó la fundación agéntica (factory de proveedor RNF-06, runner de grafo ReAct con salida Zod + reintento, modo `fake`, gobierno de ejecución) y E5 el tablero (`KpisService.calcularTablero`, ya importado por `agente` en E5b). El veredicto es la segunda función del agente: bajo demanda, analiza los KPIs vigentes y dictamina `go`/`pivote`/`kill`. El contrato ya fija los endpoints, los esquemas (`Veredicto`, `JustificacionKpi`, `VerificarVeredictoRequest`), que la emisión es **síncrona** (`201` con el veredicto) y el gobierno consultivo (aprobar cambia el estado de la idea; anular exige nota). Los códigos `SALIDA_AGENTE_INVALIDA` (502) y `PROVEEDOR_IA_NO_DISPONIBLE` (503) ya están catalogados.

## Goals / Non-Goals

**Goals:**
- Emitir el veredicto razonado del agente sobre una idea, síncrono, con snapshot de KPIs congelado y salida validada con Zod.
- Historial/consulta de veredictos y gobierno consultivo (aprobar/anular) que fija el estado de la idea solo con aprobación humana.
- Reutilizar la fundación agéntica sin duplicarla ni alterar el scoring.
- Modo `fake` para e2e local sin proveedor.

**Non-Goals:**
- E8 (costo estimado desde los tokens persistidos) y cualquier cambio de estado automático sin humano (prohibido, RNF-09).
- Re-emitir automáticamente el veredicto cuando cambian los KPIs (es bajo demanda).

## Decisions

### D1 — El veredicto vive en `agente/veredicto/`
Es la segunda función del Validador Inteligente (CLAUDE.md), así que va en el módulo `agente` junto a `scoring/`, en el sub-dominio `veredicto/` (entidad, service, controller, esquema, prompt, tools). El controller expone `ideas/:id/veredictos` aunque el módulo sea `agente` (el recurso cuelga de la idea, el dueño del comportamiento es el agente).

### D2 — Emisión síncrona, con el mapeo de errores del contrato
A diferencia del scoring (asíncrono, alto volumen), el veredicto es bajo demanda y baja frecuencia: el `POST` ejecuta el agente y devuelve `201` con el `Veredicto`. Sin config BYOK → `ConflictoException` (409); salida inválida tras los reintentos → `SalidaAgenteInvalidaException` (502, código ya catalogado); proveedor inalcanzable/timeout → `ProveedorNoDisponibleException` (503). *Trade-off:* en modo real el request bloquea unos segundos; aceptable por la baja frecuencia. El modo `fake` es inmediato.

### D3 — Snapshot de KPIs congelado y reproducible
Al emitir, se calcula el tablero una vez (`KpisService.calcularTablero`) y se **congela** como `snapshotKpis` (array de `KpiCalculado`) junto al proveedor y el modelo (RNF-09). El agente razona sobre ese snapshot; la tool `calcularKPIs` devuelve el MISMO snapshot congelado (no recalcula), de modo que el razonamiento y lo persistido son consistentes y el veredicto es reproducible aunque los KPIs cambien después.

### D4 — Runner de grafo genérico por esquema (refactor interno)
`ejecutarScoring`/`extraerSalidaEstructurada` se generalizan a un runner `ejecutarAgente(params, esquema)` parametrizado por el esquema Zod de salida y el set de tools, reutilizado por scoring (esquema de scoring) y veredicto (esquema de veredicto). El comportamiento del scoring no cambia (lo garantizan sus tests). Evita duplicar el bucle ReAct + validación/reintento + gobierno.

### D5 — Factory de proveedor por tarea
`ModeloDeChatFactory.crear(ownerId, tarea)` con `tarea` ∈ `scoring|veredicto`, y `ConfiguracionService.credencialPara(ownerId, tarea)` que devuelve `modeloScoring` o `modeloVeredicto` (ambos ya en la config BYOK de E7). Así el veredicto usa el modelo potente sin cablear nombres (RNF-06/18).

### D6 — Salida Zod y tools del veredicto
Esquema `salidaVeredictoSchema`: `veredicto` (`go|pivote|kill`), `confianza` (int 0–100), `justificacionPorKPI[]` (`{ kpi, lectura }`), `recomendaciones[]` (strings). Tools (RF-AG-04): `calcularKPIs` (snapshot congelado), `consultarHipotesis`, `consultarUmbrales`, acotadas por owner/idea. La salida se revalida con Zod y se reintenta; agotados los reintentos → 502.

### D7 — Gobierno consultivo de la verificación
`POST .../verificacion` con `{ resultado, nota? }`. **Aprobar**: exige `estadoVerificacion === 'pendiente'` (si no → 409); marca el veredicto `aprobado`, registra `verificacion { resultado, fecha }` y fija `idea.estado = veredicto.veredicto` (`go`/`pivote`/`kill`) vía un método nuevo de `IdeasService` —único camino legítimo—. **Anular**: exige `nota` (si falta → 422), marca `anulado` con la nota, y NO toca la idea. El bloque del agente es inmutable; la verificación se añade aparte (se conservan ambas versiones, RNF-09).

### D8 — Modo `fake` determinista desde el snapshot
En modo `fake`, el veredicto se deriva del `resumen` del snapshot: más KPIs en `kill` que en `go` → `kill`; más en `go` → `go`; empate/mixto → `pivote`. La `confianza` baja con la proporción de KPIs `sin_datos`. `justificacionPorKPI` se genera por cada KPI del snapshot y `recomendaciones` por plantilla. Recorre el mismo camino de persistencia y validación que el real, sin proveedor.

## Risks / Trade-offs

- **Latencia del real en el request** (emisión síncrona por contrato) → aceptable por baja frecuencia; el gobierno (timeout/iteraciones) acota la espera; `fake` evita gasto en dev/test.
- **Emitir sin evidencia suficiente** (KPIs `sin_datos`) → el agente devuelve `confianza` baja; no se bloquea (el humano decide). Documentado.
- **Varios veredictos `pendiente` a la vez** → se permiten (cada emisión crea uno nuevo); aprobar cualquiera fija el estado de la idea. Los demás quedan `pendiente` (histórico). Aceptable para el MVP.
- **El estado de la idea solo lo mueve la aprobación** → se centraliza en `IdeasService`; ninguna otra vía fija `go`/`pivote`/`kill` (coherente con E1, que ya lo prohíbe por edición).
- **Interop Zod v4 ↔ LangChain** → ya resuelto en E4 (revalidación propia con Zod v4); el veredicto reutiliza el mismo runner.
