## Why

Con E0–E7 ya definidos (hasta la configuración BYOK), falta la última pieza del contrato: **optimización y visibilidad de costo** (E8). El scoring se ejecuta en cada entrevista registrada (E4) y el consumo de la API crece con el volumen; como el costo lo paga cada usuario con su propia key (BYOK, E7), el producto debe **mostrarle cuánto lleva gastado** y **evitar llamadas innecesarias**. Sin este contrato, el frontend no puede pintar el contador de costo por idea/usuario ni el flujo de re-evaluación, y el backend no tiene forma estable de exponer la tabla de precios, los tokens/costo por llamada del agente, ni la re-evaluación en lote tras un cambio de rúbrica.

## What Changes

- **Costo estimado por idea y por usuario** (RF-22f, HU-29) bajo el `tag` `proveedores`: `GET /ideas/{id}/costo` (costo acumulado de una idea, con desglose por tarea) y `GET /costo` (costo total del usuario, con desglose por idea). Ambos dejan explícito que es un **estimado del consumo vía ValidaLab, NO el saldo** de la cuenta del proveedor (RNF-17), e incluyen el **enlace al panel de facturación** del proveedor para recargar (RF-22g, HU-31).
- **Tabla de precios por modelo** (RF-22e, RNF-18): `GET /proveedores/precios` devuelve la tabla configurable (precio de entrada/salida y de entrada cacheada por millón de tokens, por proveedor y modelo). Es **datos** actualizables sin redesplegar, no valores cableados.
- **Registro de tokens y costo por llamada del agente** (RF-22e): se **enriquece** el schema `ScoreEntrevista` (E4) con `tokensEntrada`, `tokensSalida`, `costoEstimado`, `moneda` y `hashEntrada` para trazabilidad de costo e idempotencia.
- **Scoring idempotente** (RF-22c, HU-30): se documenta como requisito que guardar/actualizar una entrevista **sin** cambiar sus respuestas ni la versión de rúbrica **NO** re-invoca al agente; se conservan el `score` y el `costoEstimado` previos. El criterio es el `hashEntrada` (hash de respuestas + versión de rúbrica).
- **Re-evaluación en lote con estimación previa** (RF-22h, HU-32) bajo el `tag` `entrevistas`: `GET /ideas/{id}/entrevistas/reevaluacion/estimacion` (calcula el costo estimado **sin** ejecutar) y `POST /ideas/{id}/entrevistas/reevaluacion` (ejecuta tras la confirmación del usuario). El cambio de rúbrica **no** dispara re-análisis automático: es una acción explícita del usuario.
- **Añadir los schemas de dominio** a `components.schemas`: `Moneda`, `DesgloseCostoTarea`, `CostoIdea`, `CostoIdeaResumen`, `CostoUsuario`, `PrecioModelo`, `EstimacionReevaluacion`, `ReevaluacionLoteRequest`, `ResultadoReevaluacion`; y los campos de costo en `ScoreEntrevista`.
- **Reflejar el aislamiento:** costo y re-evaluación son estrictamente del usuario autenticado (derivado del token); la tabla de precios es global (curada por administración) pero requiere autenticación.

## Capabilities

### New Capabilities
<!-- Ninguna: E8 no introduce un módulo de dominio nuevo; el `tag` catálogo es fijo. La visibilidad de costo se expresa sobre `proveedores` y la re-evaluación sobre `entrevistas`. -->

### Modified Capabilities
- `proveedores`: se añade la **visibilidad de costo** (costo estimado por idea y por usuario, con la aclaración de que es un estimado vía ValidaLab y no el saldo, y el enlace al panel de facturación) y la **tabla de precios por modelo** (configurable, actualizable sin redesplegar). La expresión es el detalle adicional del `tag` `proveedores` en el contrato.
- `entrevistas`: se añade el **scoring idempotente** (no re-puntuar si no cambiaron respuestas ni rúbrica, conservando score y costo previos), el **registro de tokens/costo por scoring** y la **re-evaluación en lote** con estimación de costo previa. La expresión es el detalle adicional del `tag` `entrevistas`.

## Impact

- **`contrato-api/openapi.yaml`:** se añaden los `paths` `/proveedores/precios`, `/ideas/{id}/costo`, `/costo`, `/ideas/{id}/entrevistas/reevaluacion` y `/ideas/{id}/entrevistas/reevaluacion/estimacion`; sus schemas de dominio; y los campos de costo en `ScoreEntrevista`. No se tocan otros módulos.
- **Convenciones:** **no** se introducen códigos de error nuevos. La re-evaluación sin BYOK reutiliza `409 CONFLICTO`; el proveedor caído durante la re-evaluación, `503 PROVEEDOR_IA_NO_DISPONIBLE`.
- **Equipos:** frontend (contador de costo por idea/usuario, aclaración "estimado, no saldo", enlace de recarga, flujo de re-evaluación con costo previo) y backend (cálculo local de costo desde tokens × tabla de precios, hash de idempotencia, prompt caching cuando el proveedor lo permita, re-scoring en lote) ya pueden desarrollar E8 contra el contrato.
- **Fuera de alcance:** el **prompt caching** (RF-22d) es un mecanismo de runtime del backend, no una superficie del contrato (se refleja solo como `precioEntradaCacheadaPorMillon` en la tabla de precios y, opcionalmente, en los tokens reportados); y todo código de runtime (cálculo real, hashing, llamadas al proveedor). Este cambio solo define cómo se expone el costo y cómo se solicita la re-evaluación.
