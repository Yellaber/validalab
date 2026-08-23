## Why

El scoring (E4) puntúa entrevistas y el tablero (E5) agrega KPIs, pero nadie emite el juicio final sobre la idea. El veredicto es la segunda —y culminante— función del Validador Inteligente (SRS §8, RF-14/15/16): bajo demanda, el agente analiza los KPIs vigentes y dictamina `go`/`pivote`/`kill` con su razonamiento. Es el cierre del núcleo del producto y opera en **modo consultivo**: el agente propone, el humano decide; la idea solo cambia de estado tras aprobación (RNF-09).

## What Changes

- **Emitir un veredicto** (`POST /ideas/{id}/veredictos`): el agente analiza los KPIs vigentes de una idea propia y emite un `Veredicto` razonado —`veredicto`, `confianza`, `justificacionPorKPI[]`, `recomendaciones[]`— usando el modelo **veredicto** de la config BYOK. La salida se **valida con Zod** y se reintenta ante una salida inválida. El veredicto nace con verificación `pendiente` y **congela** el snapshot de KPIs, el proveedor y el modelo (reproducibilidad, RNF-09). Sin BYOK → `409`; salida inválida tras reintentos → `502 SALIDA_AGENTE_INVALIDA`; proveedor no disponible → `503`.
- **Consultar** el historial (`GET /ideas/{id}/veredictos`, paginado) y un veredicto concreto (`GET .../{idVeredicto}`) con su `snapshotKpis` y su verificación.
- **Verificar** (`POST .../{idVeredicto}/verificacion`): al **aprobar**, el veredicto queda firme y la idea cambia al estado del veredicto (`go`/`pivote`/`kill`) —único camino legítimo para fijarlo—; al **anular**, se exige `nota` y la idea no cambia. Se conservan ambas versiones (agente + usuario). Un veredicto ya verificado → `409`.
- **Modo `fake`** del veredicto: dictamen determinista sin proveedor real, para e2e local (mismo patrón que el scoring).

## Capabilities

### New Capabilities
- `veredicto-de-idea`: la emisión bajo demanda del veredicto razonado del agente sobre una idea (con snapshot de KPIs congelado, salida Zod y reintento, modo `fake`), su historial/consulta, y el gobierno consultivo de verificación (aprobar → fija el estado de la idea; anular → conserva ambas versiones).

### Modified Capabilities
_(ninguna a nivel de spec: se refactoriza internamente el runner del grafo y la factory de proveedor para reutilizarlos entre scoring y veredicto, sin cambiar el comportamiento del scoring)._

## Impact

- **Código:** el módulo `agente` gana el sub-dominio `veredicto/` (entidad `Veredicto`, service, controller `ideas/:id/veredictos`, esquema Zod, prompt, tools). Se generaliza el runner del grafo (`ejecutarScoring` → runner genérico por esquema) y `ModeloDeChatFactory.crear(ownerId, tarea)` para elegir el modelo de scoring o veredicto; el scoring no cambia de comportamiento (cubierto por sus tests).
- **Tools del agente (RF-AG-04):** `calcularKPIs` (devuelve el snapshot congelado), `consultarHipotesis`, `consultarUmbrales`, con Zod.
- **Reutiliza:** `KpisService.calcularTablero` (ya importado por `agente` en E5b) para el snapshot; `IdeasService` para el aislamiento y para fijar el estado de la idea al aprobar; la fundación de errores (`SalidaAgenteInvalidaException` nueva sobre el código `SALIDA_AGENTE_INVALIDA` ya catalogado).
- **Persistencia:** tabla nueva `veredictos` (idea_id, veredicto, confianza, justificacion_por_kpi jsonb, recomendaciones jsonb, proveedor, modelo, snapshot_kpis jsonb, estado_verificacion, verificacion jsonb, fecha_emision) vía migración.
- **Configuración:** nuevas vars de gobierno del veredicto reutilizando el patrón del scoring (timeout/iteraciones/reintentos si difieren; por defecto comparten los del agente).
- **Contrato:** `contrato-api/openapi.yaml` ya define `Veredicto`, `TipoVeredicto`, `EstadoVeredicto`, `JustificacionKpi`, `VerificarVeredictoRequest`, `VeredictosPaginados` y los endpoints; no requiere cambios.
- **Fuera de alcance:** E8 (costo estimado desde los tokens persistidos) y cualquier automatización del cambio de estado sin humano (prohibido por RNF-09).
