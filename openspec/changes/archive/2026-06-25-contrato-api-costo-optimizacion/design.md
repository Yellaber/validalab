## Context

El contrato ya tiene `usuarios` (E0) … `proveedores` (E7). Este cambio cierra el contrato con la épica **E8 (Optimización y visibilidad de costo)** del SRS §8.9. El scoring corre en cada entrevista (E4) y el gasto crece con el volumen; como es BYOK (E7), el usuario paga con su propia key y necesita ver cuánto lleva gastado, sin que ValidaLab afirme conocer el saldo real de la cuenta (RNF-17). E8 es mayormente **Should/Could**: cierra el MVP con transparencia y control de costo. El **runtime** (cálculo real, hashing, prompt caching, llamadas al proveedor) queda fuera del contrato.

## Goals / Non-Goals

**Goals:**
- Exponer el **costo estimado** acumulado por idea y por usuario, dejando explícito que es un estimado del consumo vía ValidaLab (RNF-17) y enlazando al panel de facturación del proveedor (RF-22g).
- Exponer la **tabla de precios por modelo** como datos configurables (RNF-18), no cableados.
- Registrar **tokens y costo por llamada** del agente en `ScoreEntrevista` (RF-22e) y soportar el **scoring idempotente** vía `hashEntrada` (RF-22c).
- Definir la **re-evaluación en lote** con estimación de costo previa, como acción explícita del usuario (RF-22h).
- Mantener el contrato como un único documento, sin códigos de error nuevos.

**Non-Goals:**
- **No** se modela el prompt caching como flujo del contrato (es runtime; solo se refleja `precioEntradaCacheadaPorMillon`).
- **No** se calcula el costo en el contrato: el contrato describe la **forma** del costo estimado, no su cómputo.
- **No** se afirma conocer el saldo de la cuenta del proveedor: el contrato solo expone un estimado local y un enlace de recarga.

## Decisions

### Decisión 1: El costo es un estimado local, nunca el saldo
- `CostoIdea`/`CostoUsuario` llevan `esEstimado` (siempre `true`) y un campo `aclaracion` con el texto normativo del SRS §8.9.1, además de `urlFacturacion` (enlace al panel del proveedor para recargar).
- **Por qué:** las API keys de inferencia no exponen el saldo (RNF-17, supuesto §10.1); ValidaLab no intermedia pagos. El contrato comunica explícitamente la naturaleza del dato para que el frontend nunca lo presente como "saldo".

### Decisión 2: Costo por idea anidado, costo de usuario en la raíz
- `GET /ideas/{id}/costo` (acumulado de una idea, con `desglosePorTarea`) y `GET /costo` (acumulado del usuario, con `costoPorIdea`).
- **Por qué `/costo` en la raíz:** es el agregado de todas las ideas del usuario autenticado; no cuelga de ninguna idea concreta. El `owner_id` sale del token. Ambos endpoints se etiquetan con el `tag` `proveedores` porque el costo es una preocupación del consumo BYOK, manteniendo la familia de costo navegable junto a la configuración del proveedor.

### Decisión 3: La tabla de precios son datos, no valores cableados
- `GET /proveedores/precios` devuelve `PrecioModelo[]` (precio de entrada, de salida y de entrada cacheada por millón de tokens, por proveedor y modelo, con `moneda` y `vigenteDesde`).
- **Por qué:** RF-22e/RNF-18 exigen una tabla "configurable y actualizable sin redesplegar" porque los precios cambian rápido. Cablearlos en el contrato obligaría a redesplegar; igual que el catálogo de modelos (E7), son datos curados por administración.

### Decisión 4: El scoring es idempotente vía hash
- Se enriquece `ScoreEntrevista` con `hashEntrada` (hash de respuestas + versión de rúbrica), `tokensEntrada`, `tokensSalida`, `costoEstimado` y `moneda`.
- **Por qué:** RF-22c/HU-30 piden no re-puntuar si nada cambió. Guardar o actualizar una entrevista cuyo `hashEntrada` no cambia **no** re-invoca al agente; se conservan el `score` y el `costoEstimado` previos. El hash es el criterio observable de idempotencia; los tokens/costo cumplen RF-22e (registrar consumo por llamada).

### Decisión 5: Re-evaluación en lote en dos pasos (estimar → ejecutar)
- `GET /ideas/{id}/entrevistas/reevaluacion/estimacion` calcula el costo estimado **sin** ejecutar (no muta); `POST /ideas/{id}/entrevistas/reevaluacion` ejecuta tras la confirmación.
- **Por qué dos endpoints y no un flag:** separar el cálculo (idempotente, GET) de la ejecución (mutación, POST) evita dos formas de respuesta en una misma operación y modela limpiamente "ver el costo antes de confirmar" (HU-32). El cambio de rúbrica **no** dispara re-análisis automático: la re-evaluación es siempre explícita.
- `ReevaluacionLoteRequest.idsEntrevistas` es opcional: por defecto re-evalúa todas las entrevistas de la idea cuya rúbrica cambió (las que cambiaron de `hashEntrada`); un subconjunto se puede pasar explícitamente.

### Decisión 6: Schemas, responses y aislamiento
- Schemas: `Moneda` (enum, `USD`), `DesgloseCostoTarea`, `CostoIdea`, `CostoIdeaResumen`, `CostoUsuario`, `PrecioModelo`, `EstimacionReevaluacion`, `ReevaluacionLoteRequest`, `ResultadoReevaluacion`; y los campos de costo en `ScoreEntrevista`.
- Responses: **ninguna nueva** ni código de error nuevo. Re-evaluación sin BYOK → `409 CONFLICTO` (coherente con E6); proveedor caído durante la re-evaluación → `503 PROVEEDOR_IA_NO_DISPONIBLE` (reutilizada).
- Aislamiento: costo y re-evaluación son del usuario autenticado; la tabla de precios es global. No se aceptan ids de otro usuario.

## Risks / Trade-offs

- **[Costo estimado vs. saldo real]** Riesgo de que el usuario lo lea como saldo. → Mitigado en el contrato con `esEstimado`, `aclaracion` y `urlFacturacion`; el frontend debe rotular siempre "estimado vía ValidaLab".
- **[Tabla de precios como datos]** El contrato no fija los precios; la exactitud depende de mantener la tabla. → Aceptado y deseado (RNF-18): la forma es estable, el contenido es volátil.
- **[Re-evaluación en dos pasos]** El cliente debe encadenar estimación + ejecución. → Aceptado: es el flujo que pide HU-32 ("ver el costo antes de confirmar"); evita ejecutar gasto sin confirmación.
- **[Prompt caching fuera del contrato]** No hay endpoint de caching. → Aceptado: es runtime; solo se refleja en `precioEntradaCacheadaPorMillon` y, si el proveedor lo reporta, en los tokens.

## Open Questions

- Ninguna pendiente. Resueltas: costo como **estimado local** (no saldo) con enlace de recarga; costo por idea anidado y por usuario en la raíz; tabla de precios como **datos**; idempotencia vía `hashEntrada` con tokens/costo en `ScoreEntrevista`; re-evaluación en **dos pasos** (estimar → ejecutar); sin códigos de error nuevos.
