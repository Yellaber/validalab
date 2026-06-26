## 1. Schemas de costo (tag `proveedores`)

- [x] 1.1 Añadir el enum `Moneda` (`USD`) — moneda del costo estimado y la tabla de precios
- [x] 1.2 Añadir el schema `DesgloseCostoTarea` (`tarea` `scoring`|`veredicto`, `llamadas`, `tokensEntrada`, `tokensSalida`, `costoEstimado`)
- [x] 1.3 Añadir el schema `CostoIdea` (`ideaId`, `proveedor`, `moneda`, `costoEstimadoTotal`, `desglosePorTarea[]`, tokens, `llamadas`, `esEstimado`, `aclaracion`, `urlFacturacion`, `fechaCalculo`)
- [x] 1.4 Añadir el schema `CostoIdeaResumen` (`ideaId`, `titulo`, `costoEstimado`) para el desglose por idea
- [x] 1.5 Añadir el schema `CostoUsuario` (`moneda`, `costoEstimadoTotal`, `costoPorIdea[]`, `proveedor`, tokens, `esEstimado`, `aclaracion`, `urlFacturacion`, `fechaCalculo`)
- [x] 1.6 Añadir el schema `PrecioModelo` (`proveedor`, `modeloId`, `precioEntradaPorMillon`, `precioSalidaPorMillon`, `precioEntradaCacheadaPorMillon` nullable, `moneda`, `vigenteDesde`)

## 2. Schemas de re-evaluación e idempotencia (tag `entrevistas`)

- [x] 2.1 Añadir el schema `EstimacionReevaluacion` (`entrevistasAfectadas`, `modeloScoring`, `moneda`, `costoEstimado`, tokens estimados, `esEstimado`, `aclaracion`)
- [x] 2.2 Añadir el request `ReevaluacionLoteRequest` (`idsEntrevistas?` uuid[], opcional)
- [x] 2.3 Añadir el schema `ResultadoReevaluacion` (`entrevistasReevaluadas`, `entrevistasOmitidas`, `moneda`, `costoEstimado`, tokens)
- [x] 2.4 Enriquecer `ScoreEntrevista` con `tokensEntrada`, `tokensSalida`, `costoEstimado`, `moneda` y `hashEntrada` (RF-22e, idempotencia RF-22c)

## 3. Endpoints de visibilidad de costo (tag `proveedores`)

- [x] 3.1 Definir `GET /proveedores/precios` → `200` arreglo de `PrecioModelo` (tabla configurable), error `401`
- [x] 3.2 Definir `GET /ideas/{id}/costo` → `200` `CostoIdea`, errores `401`/`403`/`404`
- [x] 3.3 Definir `GET /costo` → `200` `CostoUsuario` (agregado del usuario), error `401`

## 4. Endpoints de re-evaluación en lote (tag `entrevistas`)

- [x] 4.1 Definir `GET /ideas/{id}/entrevistas/reevaluacion/estimacion` → `200` `EstimacionReevaluacion` (sin ejecutar), errores `401`/`403`/`404`
- [x] 4.2 Definir `POST /ideas/{id}/entrevistas/reevaluacion` con `ReevaluacionLoteRequest` → `200` `ResultadoReevaluacion`, errores `401`/`403`/`404`/`409` (sin BYOK)/`503` (proveedor caído)

## 5. Verificación

- [x] 5.1 Validar que el OpenAPI sigue siendo válido y parseable, con todas las `$ref` resueltas
- [x] 5.2 Confirmar que el costo se expone como **estimado** (`esEstimado`, `aclaracion`) y nunca como saldo, con `urlFacturacion` para recargar (RNF-17, RF-22g)
- [x] 5.3 Confirmar que la tabla de precios son **datos** (cadenas/números configurables), no valores cableados (RNF-18)
- [x] 5.4 Confirmar que `ScoreEntrevista` lleva `hashEntrada` + tokens + `costoEstimado` (RF-22c/e) y que el scoring idempotente conserva score y costo previos
- [x] 5.5 Confirmar el flujo de re-evaluación en dos pasos (estimación GET sin mutar → ejecución POST) y el mapeo `409` (sin BYOK)/`503` (proveedor caído)
- [x] 5.6 Confirmar que sigue siendo un único documento y que **no** se añadieron códigos de error nuevos
