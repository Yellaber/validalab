## Why

El tablero de KPIs (E5a) ya muestra la zona de semáforo de cada indicador, pero el usuario tiene que mirarlo para enterarse. El SRS (RF-13, HU-17) pide que el sistema **avise proactivamente** cuando un KPI cruza su umbral kill o go: son los momentos de decisión (una señal entró en zona de riesgo o de avance). Este cambio cierra E5 generando y exponiendo esas alertas.

## What Changes

- **Generación de alertas dirigida por evento:** tras cada scoring exitoso de una entrevista (el evento que cambia los KPIs), el sistema **reevalúa el tablero** de esa idea y, comparando la zona de cada KPI contra su **última zona conocida**, emite una `AlertaKpi` cuando un KPI **cruza** hacia zona `go` o `kill`. Se persiste la última zona por idea+KPI para detectar el cruce (no re-alerta si la zona no cambió).
- **Endpoints de consulta:** `GET /ideas/{id}/alertas` (paginado, filtro opcional por `leida`) y `PATCH /ideas/{id}/alertas/{idAlerta}` (marcar `leida`). Las alertas **no** se crean desde el cliente.
- **Reorganización del módulo `kpis`** en subdominios `tablero/` y `alertas/` (convención de organización por sub-dominio), con `zona-kpi` como tipo compartido en la raíz del módulo.

## Capabilities

### New Capabilities
- `alertas-de-kpi`: la generación dirigida por evento de alertas de cruce de umbral (tras un scoring exitoso, comparando contra la última zona persistida por idea+KPI) y su consulta —listado paginado con filtro por `leida` y marcado como leída—, aislada por owner.

### Modified Capabilities
_(ninguna: la generación se engancha al evento de scoring sin cambiar el contrato del scoring ni del tablero)._

## Impact

- **Código:** el módulo `kpis` se reorganiza en `tablero/` (los archivos de E5a) y `alertas/` (nuevo: `AlertasService`, `AlertasController`, DTOs, entidades). `zona-kpi.ts` pasa a la raíz del módulo como tipo compartido. `AgenteService`, al finalizar un scoring `puntuada`, dispara `AlertasService.evaluarIdea` (con try/catch: un fallo de alertas nunca rompe el scoring). `AgenteModule` importa `KpisModule`; `AppModule` sin cambios (ya registra `KpisModule`).
- **Persistencia:** dos tablas nuevas vía migración — `alertas` (idea_id, kpi, tipo, valor, umbral, leida, fecha) y `estado_semaforo_kpi` (idea_id, kpi, zona; único por idea+KPI), esta última para detectar el cruce.
- **Contrato:** `contrato-api/openapi.yaml` ya define `AlertaKpi`, `TipoAlerta`, `ActualizarAlertaRequest`, `AlertasPaginadas`, `filtroLeida` y los endpoints; no requiere cambios.
- **Fuera de alcance:** disparar la reevaluación al **editar un umbral** (evitaría el ciclo `ideas → kpis`; se difiere, se documenta) y cualquier notificación externa (email/push). El siguiente hito es E6 (veredicto).
