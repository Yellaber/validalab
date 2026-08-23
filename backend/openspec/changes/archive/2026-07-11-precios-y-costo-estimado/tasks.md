## 1. Ledger único de ejecuciones (traza ampliada)

- [x] 1.1 Ampliar la entidad `EjecucionAgente`: añadir `idea_id`, hacer `entrevista_id` nullable, y `TareaAgente` gana `veredicto`
- [x] 1.2 `AgenteService.registrarEjecucion` incluye `ideaId` (`entrevista.ideaId`); ajustar sus specs
- [x] 1.3 `VeredictoService` registra una `EjecucionAgente` (`tarea: veredicto`, `ideaId`, `entrevistaId: null`, proveedor/modelo/tokens/estado) tras emitir, en real y `fake`; inyectar el repo y ajustar specs
- [x] 1.4 Migración que ALTERa `ejecuciones_agente` (+`idea_id` nullable, `entrevista_id` nullable); verificar run/revert/run

## 2. Tabla de precios

- [x] 2.1 Crear la entidad `PrecioModelo` (`precios_modelo`) en `proveedores/`: proveedor, modelo_id, precio_entrada/salida/entrada_cacheada por millón, moneda, vigente_desde
- [x] 2.2 Migración de `precios_modelo` con seed de precios reales aproximados por cada modelo del catálogo; verificar run/revert/run
- [x] 2.3 `GET /proveedores/precios` (autenticado) que devuelve la tabla

## 3. Motor y endpoints de costo

- [x] 3.1 Implementar `CostoService`: `costoIdea(ownerId, ideaId)` (agrega `ejecuciones_agente` de la idea × precios, desglose por tarea) y `costoUsuario(ownerId)` (agrega por idea, con títulos); `esEstimado`, `aclaracion`, `urlFacturacion` por proveedor
- [x] 3.2 DTOs Zod `PrecioModelo`, `CostoIdea`, `CostoUsuario`, `DesgloseCostoTarea`, `CostoIdeaResumen` (derivados del contrato)
- [x] 3.3 Controllers `GET /costo` (owner del token) y `GET /ideas/:id/costo` (`asegurarPropia`, 403/404) con Swagger
- [x] 3.4 Cablear en `ProveedoresModule` (`forFeature([PrecioModelo, EjecucionAgente, Idea])`, `IdeasModule`, providers)
- [x] 3.5 Specs unitarios del motor: costo = tokens × precios sobre todas las ejecuciones, desglose por tarea, idea sin consumo → 0, sin precio catalogado → costo 0, aislamiento

## 4. Verificación

- [x] 4.1 `openspec validate --strict`; `npm test` verde; `eslint` en modo check limpio; `build` OK
- [x] 4.2 e2e (modo `fake`): puntuar entrevistas + emitir veredicto → `GET /ideas/{id}/costo` con desglose por tarea (tokens fake → costo 0, llamadas > 0); `GET /costo` agrega por idea; `GET /proveedores/precios` devuelve el seed
