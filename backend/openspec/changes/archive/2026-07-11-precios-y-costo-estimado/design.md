## Context

`ejecuciones_agente` (E4) registra cada scoring con `tokensEntrada`/`tokensSalida`, `proveedor`, `modelo`, `tarea` y `entrevista_id`. El veredicto (E6) guarda proveedor/modelo pero no tokens ni una fila de ejecución. El catálogo de modelos (`modelos_ia`, E7a) está sembrado por migración. El contrato de E8 define la tabla de precios, el costo por idea (desglose por tarea) y el costo total del usuario (desglose por idea), todos marcados como estimados del consumo vía ValidaLab (RNF-17), con enlace a facturación del proveedor (RF-22g).

## Goals / Non-Goals

**Goals:**
- Fuente única y reconstruible del costo: `ejecuciones_agente` como ledger de todas las ejecuciones del agente (scoring + veredicto), con `idea_id`.
- Tabla de precios configurable (RNF-18) sembrada con precios reales aproximados.
- Costo por idea (desglose por tarea) y total del usuario (desglose por idea), calculados al vuelo.

**Non-Goals:**
- Re-evaluación en lote (E8b).
- Precio de entrada cacheada aplicado al cálculo (se cataloga; no se rastrean tokens cacheados por ejecución).
- Persistir/cachear el costo (se recalcula desde el ledger).

## Decisions

### D1 — `ejecuciones_agente` como ledger único
Se añade `idea_id` (nullable en la migración por las filas existentes; lo llenan las ejecuciones nuevas) y `entrevista_id` se hace nullable (el veredicto no tiene entrevista). `TareaAgente` gana `veredicto`. `AgenteService.registrarEjecucion` pasa `ideaId` (`entrevista.ideaId`). `VeredictoService`, tras emitir (real o `fake`), registra una `EjecucionAgente` con `tarea: 'veredicto'`, `ideaId`, `entrevistaId: null`, proveedor/modelo/tokens y estado. Esto además cierra la trazabilidad del veredicto (RF-AG-08). *Alternativa descartada:* tokens en `veredictos` + agregación de dos fuentes — el ledger único simplifica el cálculo y unifica la traza.

### D2 — Tabla de precios `precios_modelo` (RNF-18), sembrada
Entidad `PrecioModelo` (proveedor, modelo_id, precio_entrada_por_millon, precio_salida_por_millon, precio_entrada_cacheada_por_millon nullable, moneda, vigente_desde). Datos, no código: sembrada por migración con precios reales **aproximados** por cada modelo del catálogo, y editable sin redesplegar. `GET /proveedores/precios` la devuelve. Los precios son placeholders realistas que administración actualiza; el valor del feature es el mecanismo, no las cifras exactas.

### D3 — Cálculo del costo al vuelo, contando todas las ejecuciones
`costo(ejecucion) = (tokensEntrada/1e6)·precioEntrada + (tokensSalida/1e6)·precioSalida`, buscando el precio por `(proveedor, modelo)`. Tokens nulos (modo `fake`, o proveedor que no reporta) → 0. Ejecución sin precio catalogado → 0 (se cuentan sus tokens/llamadas, costo 0). Se agregan **todas** las ejecuciones de la idea (incluidos re-scorings superados: cada llamada real consumió tokens). `costoIdea` agrupa por `tarea`; `costoUsuario` agrupa por `idea_id` (con el `titulo` de la idea). Sin precio de entrada cacheada por ahora (no se rastrean tokens cacheados). *Alternativa descartada:* contar solo el score vigente — subestimaría el consumo real facturable.

### D4 — Ubicación en `proveedores`, aislado por owner
`CostoService` vive en `proveedores` (mismo contexto que precios/BYOK; los endpoints van con `tag: proveedores`). Inyecta el repo de `EjecucionAgente` (solo lectura), el de `PrecioModelo`, el repo de `Idea` (títulos para el desglose) y `IdeasService` (aislamiento en `/ideas/:id/costo`). `/costo` deriva el owner del token; `/ideas/:id/costo` usa `asegurarPropia` (403/404). Ningún filtro por owner se omite.

### D5 — Aclaración normativa y enlace de facturación
Ambas respuestas fijan `esEstimado: true`, la `aclaracion` normativa (SRS §8.9.1: estimado del consumo vía ValidaLab, no el saldo; el saldo solo en el panel del proveedor) y `moneda: USD`. La `urlFacturacion` sale de un mapa estable por proveedor (dato de plataforma, no un modelo cableado). El `proveedor` del costo es el de la config BYOK del usuario (o `null` si no hay consumo/BYOK).

## Risks / Trade-offs

- **Precios sembrados quedan desactualizados** → son datos editables (RNF-18); una tarea de administración los mantiene. Se documenta que son aproximados. Aceptable: el feature entrega el mecanismo y un valor por defecto útil.
- **`idea_id` nullable en filas históricas** (scorings previos a esta migración) → esas ejecuciones no se atribuyen a una idea en `/ideas/:id/costo` ni en el desglose del usuario, pero sus tokens siguen en la traza. Aceptable para el MVP; un backfill desde `entrevista_id → idea` queda como evolución.
- **Costo cuenta re-scorings superados** → es deliberado (D3): refleja el consumo real, no el score vigente. La idempotencia (RF-22c) ya evita re-scorings redundantes.
- **Sin costo de entrada cacheada** → subestima levemente si el proveedor cachea; se cataloga el precio para aplicarlo cuando se rastreen tokens cacheados (evolución).
