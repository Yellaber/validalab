## Context

E5a expone el tablero (`GET /ideas/{id}/kpis`) calculado al vuelo, con la `zona` de semáforo de cada KPI. E5b añade la parte proactiva: avisar cuando un KPI **cruza** su umbral. Un cruce es una transición de zona, así que hace falta comparar la zona actual contra la anterior; como el tablero no se materializa, se persiste la última zona conocida por idea+KPI. El disparo es un evento de dominio: una entrevista puntuada (E4) es lo que mueve los KPIs. El contrato ya define `AlertaKpi` (tipo `go|kill`, valor, umbral, leida), los endpoints y la paginación.

## Goals / Non-Goals

**Goals:**
- Generar alertas de cruce a `go`/`kill` tras cada scoring exitoso, sin duplicar (no re-alerta si la zona no cambió).
- Exponer el listado paginado con filtro por `leida` y el marcado como leída, aislado por owner.
- Reorganizar `kpis` en `tablero/` + `alertas/` según la convención de sub-dominios.

**Non-Goals:**
- Disparar la reevaluación al editar un umbral (se difiere; ver Decisiones/Riesgos).
- Notificaciones externas (email/push): la alerta es un recurso consultable, no un canal.
- El veredicto (E6).

## Decisions

### D1 — Disparo al completar un scoring, desde `AgenteService`
`AgenteService`, tras `finalizarPuntuada`, invoca `AlertasService.evaluarIdea(ownerId, ideaId)` dentro de un `try/catch`: un fallo de alertas nunca debe romper el scoring (que ya es fire-and-forget). `AgenteModule` importa `KpisModule` (donde vive `AlertasService`); no hay ciclo porque `kpis` no depende de `agente`. *Alternativa descartada:* bus de eventos (`@nestjs/event-emitter`) — más desacoplado, pero introduce infraestructura nueva que el proyecto no usa; con un único disparador el acoplamiento directo es más simple y explícito.

### D2 — Detección del cruce por última zona persistida
Tabla `estado_semaforo_kpi` (idea_id, kpi, zona, único por idea+KPI). `evaluarIdea` recalcula el tablero (`KpisService.calcularTablero`) y, por cada KPI: si `zonaNueva != zonaGuardada` y `zonaNueva ∈ {go, kill}`, crea una `AlertaKpi` (`tipo = zonaNueva`, `valor`, `umbral` = umbralGo o umbralKill según el tipo) y actualiza la zona guardada; si solo cambió a `observacion`/`sin_datos`, actualiza la zona sin alertar. En la **primera** evaluación de un (idea, KPI) no hay zona previa: se registra la zona sin alertar (no hay cruce desde la nada). *Alternativa descartada:* derivar la zona previa de la última alerta — falla en re-entradas (kill→observacion→kill se perdería).

### D3 — Reevaluación completa del tablero por scoring
`evaluarIdea` recalcula los 14 KPIs (no solo los afectados): el tablero ya es O(nEntrevistas+nContactos) en una pasada y barato (RNF-02), y así el cruce se detecta consistentemente aunque un scoring afecte a varios KPIs a la vez. No se intenta un cálculo incremental.

### D4 — Reorganización de `kpis` en sub-dominios
Siguiendo la convención (módulo de dominio → por sub-dominio): `kpis/tablero/` (los archivos de E5a: fórmulas, respuesta, service, controller) y `kpis/alertas/` (entidades `AlertaKpi` y `EstadoSemaforoKpi`, service, controller, DTOs). `zona-kpi.ts` sube a la raíz del módulo como tipo **compartido** por ambos sub-dominios. El `kpis.module.ts` (raíz) registra ambos controllers/services y exporta `AlertasService` para el disparo desde el agente.

### D5 — Aislamiento y consulta
`AlertasController` (`/ideas/:id/alertas`) reutiliza `IdeasService.asegurarPropia` (403/404) y `@OwnerId()`. El listado pagina con el sobre `RespuestaPaginada` y filtra por `leida`. El `PATCH` marca `leida` (cuerpo limitado a ese campo). El `ideaId` y el `owner` nunca se aceptan del cliente. La generación es interna: no hay endpoint de creación.

## Risks / Trade-offs

- **Carrera entre scorings concurrentes de la misma idea** (dos entrevistas puntuadas casi a la vez podrían evaluar en paralelo y duplicar una alerta) → Mitigación: `evaluarIdea` corre en una transacción que bloquea las filas de `estado_semaforo_kpi` de la idea (`SELECT … FOR UPDATE`) antes de comparar/actualizar; el segundo scoring ve la zona ya actualizada. Aceptable para el volumen del MVP.
- **Editar un umbral no alerta hasta el siguiente scoring** (disparo diferido) → Mitigación: el usuario ve el tablero recalculado de inmediato al editar; la persistencia de umbrales no cambia. Un disparo por edición de umbral (vía bus de eventos, sin ciclo) queda como evolución.
- **La reevaluación añade trabajo al camino del scoring** → es una consulta acotada del tablero (bounded, RNF-02) por entrevista puntuada, dentro del task de fondo del agente; no afecta la latencia HTTP.
- **Ruido de alertas** si un KPI oscila alrededor del umbral → se mitiga porque solo se alerta al **entrar** en go/kill (no en cada recálculo) y se persiste la zona; oscilaciones observacion↔kill sí generan alertas repetidas, aceptable como señal real de inestabilidad.
