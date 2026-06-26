## Context

El contrato ya tiene `usuarios` (E0), `ideas` (E1+E2), `contactos` (E3), `entrevistas` con scoring (E4) y `kpis` con tablero (E5, incluido `KpiCalculado`). Este cambio introduce el módulo **`agente`** (épica E6, *Validador Inteligente — veredicto de idea*). Es el cierre del ciclo: a solicitud del usuario, el agente recibe un snapshot estructurado de la idea (descripción, hipótesis, KPIs, umbrales, volumen/cobertura y citas; SRS §8.3), razona KPI por KPI (§8.4) y emite un veredicto `go/pivote/kill` con confianza, justificación y recomendaciones (§8.5). Opera en **modo consultivo**: el usuario verifica y la idea solo cambia de estado tras la aprobación (§8.6). Cada veredicto se conserva con su proveedor, modelo y snapshot de KPIs para reproducibilidad (§8.7, RNF-09). El **runtime** del agente (grafo LangGraph, tools, esquemas Zod) y la **config BYOK** (E7) quedan fuera de este contrato.

## Goals / Non-Goals

**Goals:**
- Definir la invocación del agente sobre una idea y la forma de la salida del veredicto.
- Conservar el snapshot reproducible (proveedor, modelo, KPIs) en cada veredicto.
- Definir el gobierno de verificación humana (aprobar/anular) y su efecto sobre el estado de la idea.
- Definir el historial de veredictos por idea.
- Reutilizar `KpiCalculado` (E5) y mapear los modos de fallo del agente a los códigos ya existentes en el catálogo.

**Non-Goals:**
- **No** se define la config BYOK (proveedor/modelo/API key): es E7, de la que depende la invocación.
- **No** se modela el runtime del agente (grafo, nodos, tools, esquemas Zod, persistencia de ejecuciones).
- **No** se modela el costo estimado ni la re-evaluación en lote (E8), ni la exportación del resumen (HU-22, *Could*).
- **No** se re-especifica el cálculo de KPIs (E5) ni el estado de la idea (E1); solo se referencian.

## Decisions

### Decisión 1: Los veredictos son una colección anidada bajo la idea, con historial
- `POST /ideas/{id}/veredictos` (emitir), `GET /ideas/{id}/veredictos` (historial paginado), `GET /ideas/{id}/veredictos/{idVeredicto}` (consultar).
- **Por qué una colección y no un recurso único:** el SRS exige conservar el **historial** de veredictos por idea (RF-17, HU-21) para comparar cómo evoluciona el juicio; cada invocación crea un nuevo `Veredicto`, nunca sobrescribe el anterior.
- Van bajo el `tag` `agente` (es la salida del Validador Inteligente), anidados en la idea para heredar el aislamiento por `ownerId`.

### Decisión 2: La invocación es síncrona y sin cuerpo
- `POST /ideas/{id}/veredictos` no recibe cuerpo: el `proveedor`/`modelo` se toman de la config BYOK del usuario (E7); el agente lee los KPIs vigentes de la idea.
- **Por qué síncrona (a diferencia del scoring de E4):** el veredicto es de **baja frecuencia y bajo demanda**; el usuario lo invoca y espera el resultado. La respuesta `201` trae el `Veredicto` ya emitido. Los fallos del agente se mapean a códigos HTTP en la misma respuesta, en vez de un `estado` de emisión como en el scoring (alto volumen, en segundo plano).
- **Modos de fallo** (reutilizando el catálogo `CodigoError` existente): sin BYOK → `409 CONFLICTO`; salida inválida tras reintentos → `502 SALIDA_AGENTE_INVALIDA`; proveedor caído → `503 PROVEEDOR_IA_NO_DISPONIBLE`. Se añaden dos `responses` reutilizables (`SalidaAgenteInvalida`, `ProveedorNoDisponible`) que envuelven esos códigos ya existentes.

### Decisión 3: La salida del agente es de solo lectura y estructurada
- `Veredicto`: `veredicto` (`TipoVeredicto` = `go`|`pivote`|`kill`), `confianza` (0–100), `justificacionPorKPI` (`JustificacionKpi[]`), `recomendaciones` (`string[]`).
- `JustificacionKpi`: `kpi` (`Kpi`, reutilizado de E2) y `lectura` (cómo lee el agente ese KPI y su peso en la conclusión). Modela el requisito "justificación KPI por KPI" (RF-15, HU-19) de forma navegable.
- Todo el bloque del agente es `readOnly`: ninguna respuesta sin validar puede fijarlo (RNF-20); el cliente nunca lo envía.

### Decisión 4: Snapshot reproducible embebido (reutiliza `KpiCalculado`)
- `Veredicto` conserva `proveedor`, `modelo` y `snapshotKpis` (`KpiCalculado[]`), todos `readOnly` (RNF-09, §8.7).
- **Por qué reutilizar `KpiCalculado` de E5:** el snapshot son los KPIs (valores, umbrales y zona) congelados al emitir; reutilizar el schema evita duplicar y deja claro que es el mismo tablero, fijado en el tiempo.
- **Por qué no se snapshotean hipótesis ni citas en el recurso:** RNF-09 normativa el snapshot de **KPIs**; las hipótesis/citas son insumos del razonamiento (§8.3) pero la reproducibilidad auditable se ancla en los KPIs y el motor. Mantener el snapshot acotado a KPIs evita inflar el recurso.

### Decisión 5: Verificación humana como acción que cambia el estado de la idea
- `POST /ideas/{id}/veredictos/{idVeredicto}/verificacion` con `VerificarVeredictoRequest` (`resultado` `aprobado`|`anulado`, `nota`).
- **Aprobar:** el veredicto queda firme y la idea pasa al estado del veredicto (`go`/`pivote`/`kill`). Este es el **único camino legítimo** para fijar esos estados: el `PATCH` de idea (E1) los prohíbe explícitamente.
- **Anular:** exige `nota` (SRS: "anularlo con una nota"); la idea no cambia de estado. Aprobar no exige `nota`.
- **Por qué una acción y no `PATCH`:** verificar no edita la salida del agente; la complementa y dispara un efecto de dominio (cambio de estado de la idea). Se conservan ambas versiones (agente + usuario), incluso si difieren (§8.6).
- **Por qué `409` al re-verificar:** un veredicto se verifica una vez; un veredicto ya `aprobado`/`anulado` no se re-verifica (para un juicio nuevo, se invoca de nuevo al agente y se crea otro `Veredicto`).
- `EstadoVeredicto`: `pendiente` | `aprobado` | `anulado`. `VerificacionVeredicto` (sub-objeto, nullable hasta verificar): `resultado`, `nota`, `fecha`.

### Decisión 6: Schemas y aislamiento
- Schemas nuevos: `TipoVeredicto`, `EstadoVeredicto`, `JustificacionKpi`, `VerificacionVeredicto`, `Veredicto`, `VerificarVeredictoRequest`, `VeredictosPaginados`. Parámetro `idVeredicto`. Reutiliza `Kpi` (E2) y `KpiCalculado` (E5).
- Toda ruta `/ideas/{id}/...` ajena → `403`; idea/veredicto inexistente → `404`; sin token → `401`. Se reutilizan las `responses` compartidas y se añaden las dos del agente.

## Risks / Trade-offs

- **[Invocación síncrona puede tardar]** El agente puede tardar segundos. → Aceptado: es bajo demanda y baja frecuencia; el cliente muestra un estado de carga. Si en el futuro se requiere asincronía, se añadiría un estado de emisión sin romper el recurso.
- **[Snapshot de KPIs, no de toda la entrada §8.3]** El recurso no congela hipótesis ni citas. → Aceptado: RNF-09 ancla la reproducibilidad en KPIs + motor; congelar todo sería costoso y no lo exige la norma.
- **[`409` por BYOK no configurado reutiliza `CONFLICTO`]** No hay un código específico "sin BYOK". → Aceptado: `CONFLICTO` (conflicto de estado: falta una precondición) encaja sin inflar el catálogo; el `mensaje` aclara. La validación de la API key vive en E7 (`API_KEY_INVALIDA`).

## Open Questions

- Ninguna pendiente. Resueltas: los veredictos son **historial** (no recurso único); la invocación es **síncrona y sin cuerpo** con fallos mapeados a `409`/`502`/`503`; el snapshot reutiliza `KpiCalculado`; la verificación es una **acción** que aprueba (cambia el estado de la idea) o anula (con nota), conservando ambas versiones.
