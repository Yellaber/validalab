## Context

El scoring (E4) marca cada score con `hashEntrada = hash(respuestas + versionRubrica)` para la idempotencia (RF-22c): no re-puntúa si el hash coincide. Al subir `SCORING_VERSION_RUBRICA`, los scores previos quedan con un hash desactualizado. El ledger `ejecuciones_agente` (E8a) guarda los tokens reales de cada scoring; la tabla de precios (E8a) permite estimar el costo. El contrato de E8b fija dos endpoints (estimar sin ejecutar; ejecutar el lote) con conteos e importes reales, e idempotencia por hash.

## Goals / Non-Goals

**Goals:**
- Detectar las entrevistas afectadas por un cambio de rúbrica (hash desactualizado) sin ejecutar nada.
- Estimar tokens y costo del lote a partir del histórico y la tabla de precios.
- Re-evaluar en lote de forma síncrona, con idempotencia, reportando reevaluadas/omitidas y el costo real.

**Non-Goals:**
- Disparar la re-evaluación automáticamente al cambiar la rúbrica (es explícita, RF-22h).
- Colas/ejecución en segundo plano (es síncrona por el contrato; el volumen por idea es acotado).
- Re-evaluar el veredicto en lote (fuera de alcance).

## Decisions

### D1 — Afectadas = puntuadas con hash desactualizado
Una entrevista está **afectada** si `estadoScoring === 'puntuada'` y `score.hashEntrada !== hash(respuestas, SCORING_VERSION_RUBRICA vigente)`. Es exactamente lo que un cambio de rúbrica produce (mismo respuestas, nueva versión → hash distinto). Las `pendiente`/`fallida` no entran (no tienen un score previo del cual "cambió la entrada"; el scoring automático las cubre). Se calcula en la app sobre las puntuadas de la idea.

### D2 — Estimación de tokens por promedio histórico
Sin ejecutar no se conocen los tokens futuros. Se estiman con el **promedio** de `tokensEntrada`/`tokensSalida` de los scorings reales exitosos del usuario (`ejecuciones_agente`, `tarea='scoring'`, tokens no nulos) × nº de afectadas. Sin histórico real (p. ej. solo modo `fake`) → promedio 0 → costo estimado 0 (honesto: el modo `fake` no consume). El costo usa el `modeloScoring` de la config BYOK × la tabla de precios (E8a); sin BYOK, `modeloScoring` es `null` y el costo 0. *Alternativa descartada:* estimar tokens por longitud de respuestas (heurística chars/4) — menos fiel que el histórico real del propio usuario.

### D3 — Scoring síncrono `AgenteService.reevaluar`
El scoring automático (E4) es asíncrono, `void` y traga errores (deja la entrevista `fallida`). El lote necesita lo contrario: síncrono, con resultado y errores propagados. Se añade `AgenteService.reevaluar(ownerId, entrevista): { reevaluada, tokensEntrada, tokensSalida }` que reutiliza la maquinaria existente: comprueba el hash (si coincide → `reevaluada:false`, omitida por idempotencia); si no, **puntúa primero** (real o `fake`; lanza antes de tocar estado si falta BYOK o cae el proveedor), luego persiste `puntuada` + `score` y deja traza. El comportamiento del scoring automático no cambia. *Alternativa descartada:* reutilizar `solicitarScoring` (async, fire-and-forget) — no puede reportar conteos ni costo reales.

### D4 — Ejecución del lote y mapeo de errores
`ReevaluacionService.ejecutar(ownerId, ideaId, idsEntrevistas?)`: `asegurarPropia`; el conjunto objetivo son las afectadas (por defecto) o las entrevistas de la idea cuyos `idsEntrevistas` se pidieron; por cada una llama a `reevaluar` y agrega. La idempotencia de `reevaluar` produce las `omitidas` (relevante cuando el usuario pasa ids explícitos, algunos ya al día). Mapeo de errores: `ConflictoException` (sin BYOK) se propaga → `409`; cualquier otro error de proveedor → `ProveedorNoDisponibleException` → `503`, abortando el lote. El costo real del lote = tokens acumulados × precio del `modeloScoring`.

### D5 — Ubicación en `entrevistas`, reutilizando E8a y el agente
El recurso cuelga de `ideas/:id/entrevistas/reevaluacion` (tag `entrevistas`), así que vive en el módulo `entrevistas` (sub-dominio `reevaluacion/`). Importa `ProveedoresModule` (que exporta `ConfiguracionService` y ahora también `PreciosService`) y `AgenteModule` (`AgenteService`), y consume el repo de `EjecucionAgente` (promedio de tokens) e `IdeasService` (aislamiento). Sin ciclos: `proveedores` no importa `entrevistas` ni `agente`.

## Risks / Trade-offs

- **Estimación por promedio histórico es aproximada** (varía con la longitud de las entrevistas) → es un estimado explícito (`esEstimado: true`) y con la aclaración normativa; el lote real reporta el costo efectivo. Aceptable.
- **Re-evaluación síncrona bloquea el request** mientras re-puntúa el lote → el volumen por idea es acotado (RNF-02 ~200 entrevistas) y solo las afectadas; en modo real puede tardar. Si el volumen creciera, una cola es evolución (fuera de alcance).
- **Fallo de proveedor a mitad de lote** deja las ya re-puntuadas persistidas y aborta con `503` → el lote es reanudable (volver a ejecutar omite por idempotencia las ya al día). Aceptable.
- **Concurrencia:** una edición de respuestas concurrente durante el lote es rara; `reevaluar` persiste bajo el mismo patrón de estado que el scoring. Aceptable para el MVP.
