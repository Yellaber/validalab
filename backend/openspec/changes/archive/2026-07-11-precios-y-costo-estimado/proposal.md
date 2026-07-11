## Why

El agente ya consume tokens (scoring E4, veredicto E6), pero el usuario no ve cuánto le cuesta ese consumo vía ValidaLab. El SRS (RF-22e/f/g, HU-29/31) pide **visibilidad de costo estimado**: una tabla de precios por modelo y el costo acumulado por idea y total del usuario, calculado localmente desde los tokens × precios. Es un **estimado del consumo vía ValidaLab, NO el saldo de la cuenta** del proveedor (RNF-17): las API keys de inferencia no exponen el saldo; para recargar, se enlaza al panel del proveedor.

## What Changes

- **Ledger único de ejecuciones del agente:** `ejecuciones_agente` pasa a ser el registro de TODA ejecución del agente. Se le añade `idea_id` (y `entrevista_id` se hace nullable), y las emisiones de veredicto (E6) se registran también ahí (`tarea` = `veredicto`), completando de paso la trazabilidad del veredicto (RF-AG-08) que quedó pendiente. El costo se agrega desde una sola tabla × la tabla de precios.
- **Tabla de precios por modelo (RF-22e):** nueva tabla `precios_modelo` (proveedor, modelo, precio de entrada/salida/entrada-cacheada por millón, moneda, vigencia), datos configurables y actualizables sin redesplegar (RNF-18), sembrada con precios reales aproximados. Expuesta en `GET /proveedores/precios`.
- **Costo estimado (RF-22f):** `GET /ideas/{id}/costo` (desglose por tarea) y `GET /costo` (total del usuario, desglose por idea), calculados al vuelo desde `ejecuciones_agente` × `precios_modelo`, contando **todas** las ejecuciones (incluidos re-scorings superados). Ambos marcan `esEstimado: true`, la `aclaracion` normativa y la `urlFacturacion` del proveedor (RF-22g).

## Capabilities

### New Capabilities
- `visibilidad-de-costo`: la tabla de precios por modelo (`GET /proveedores/precios`) y el costo estimado acumulado del consumo de IA —por idea (`GET /ideas/{id}/costo`, desglose por tarea) y total del usuario (`GET /costo`, desglose por idea)—, calculado localmente (tokens × precios), reconstruible desde el ledger de ejecuciones, con la aclaración normativa de que es un estimado, no el saldo.

### Modified Capabilities
- `scoring-inteligente-de-entrevistas`: la traza de ejecución (`ejecuciones_agente`) amplía su alcance a todas las tareas del agente —añade `idea_id`, admite `entrevista_id` nulo, y su `tarea` incluye `veredicto`— para servir de fuente única del costo estimado.

## Impact

- **Persistencia:** migración que ALTERa `ejecuciones_agente` (+`idea_id` nullable, `entrevista_id` nullable) y crea `precios_modelo` con su seed; sin tablas de costo (se calcula al vuelo, reconstruible).
- **Código:** `AgenteService.registrarEjecucion` incluye `ideaId`; `VeredictoService` registra una `EjecucionAgente` (`tarea: veredicto`) tras emitir; el tipo `TareaAgente` gana `veredicto`. Nuevo en `proveedores`: `PrecioModelo` (catálogo de precios), `CostoService` (motor de agregación) y los controllers `GET /proveedores/precios`, `GET /costo`, `GET /ideas/:id/costo`. Reutiliza `IdeasService` (aislamiento + títulos de idea) y el repo de `EjecucionAgente`.
- **Contrato:** `contrato-api/openapi.yaml` ya define `PrecioModelo`, `CostoIdea`, `CostoUsuario`, `DesgloseCostoTarea`, `Moneda` y los endpoints; no requiere cambios.
- **Fuera de alcance:** la **re-evaluación en lote** (`/ideas/{id}/entrevistas/reevaluacion[/estimacion]`) va en el siguiente change (E8b, `reevaluacion-en-lote`). El precio de entrada **cacheada** se cataloga pero no se aplica aún (no se rastrean tokens cacheados por ejecución); se documenta.
