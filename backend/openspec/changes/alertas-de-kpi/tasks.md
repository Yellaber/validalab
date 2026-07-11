## 1. Reorganización del módulo kpis

- [x] 1.1 Mover los archivos de E5a a `kpis/tablero/` (fórmulas, respuesta, service, controller y specs) y `zona-kpi.ts` a la raíz del módulo (tipo compartido); actualizar imports
- [x] 1.2 Verificar que `npm test` y `build` siguen verdes tras el movimiento (sin cambios de lógica)

## 2. Persistencia (alertas y semáforo)

- [x] 2.1 Crear la entidad `AlertaKpi` (`alertas`) en `kpis/alertas/`: idea_id, kpi, tipo, valor, umbral, leida, fecha_creacion
- [x] 2.2 Crear la entidad `EstadoSemaforoKpi` (`estado_semaforo_kpi`) con único `(idea_id, kpi)`
- [x] 2.3 Migración de ambas tablas; verificar run/revert/run

## 3. Servicio de alertas

- [x] 3.1 Implementar `AlertasService.evaluarIdea(ownerId, ideaId)`: recalcula el tablero, compara zona vs. `estado_semaforo_kpi` (en transacción con bloqueo), crea `AlertaKpi` al cruzar a go/kill y actualiza la zona; primera vez sin alertar
- [x] 3.2 Implementar `listar(ownerId, ideaId, query)` (paginado, filtro `leida`) y `marcarLeida(ownerId, ideaId, idAlerta, leida)` (403/404)
- [x] 3.3 Specs unitarios: cruce a kill genera alerta, misma zona no duplica, primera evaluación no alerta, a observacion no alerta; aislamiento en marcar/listar

## 4. Endpoint y disparo

- [x] 4.1 DTOs Zod de alertas (`AlertaKpi`, `ActualizarAlertaRequest`, `AlertasPaginadas`, filtro `leida`) derivados del contrato
- [x] 4.2 `AlertasController`: `GET /ideas/:id/alertas` y `PATCH /ideas/:id/alertas/:idAlerta` (`@OwnerId()`, `@ApiBearerAuth`, respuestas 200/401/403/404/422)
- [x] 4.3 Cablear en `KpisModule` (`forFeature([AlertaKpi, EstadoSemaforoKpi])`, providers, exportar `AlertasService`)
- [x] 4.4 Disparo desde `AgenteService` tras `finalizarPuntuada` (try/catch); `AgenteModule` importa `KpisModule`; ajustar specs del agente

## 5. Verificación

- [x] 5.1 `openspec validate --strict`; `npm test` verde; `eslint` en modo check limpio; `build` OK
- [x] 5.2 e2e (modo `fake`): puntuar entrevistas de una idea hasta cruzar un umbral → `GET /ideas/{id}/alertas` muestra la alerta; re-puntuar sin cambio de zona no duplica; `PATCH` marca `leida`
