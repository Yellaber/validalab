## Why

Con E0–E4 ya definidos (cuentas, ideas, hipótesis/umbrales, contactos y entrevistas con scoring), el siguiente paso del camino crítico del MVP es **E5 (KPIs y tablero de decisión)**. Las entrevistas puntuadas (E4) son la materia prima; E5 las **consolida en indicadores** y los contrasta contra los umbrales kill/go (E2) en un tablero con semáforo, para que el validador vea de inmediato dónde está cada señal y cuándo conviene invocar al agente (E6). El `tag` `kpis` ya está declarado pero aún sin endpoints. Los enums de KPIs (`Kpi`, `KpiGrupo`, `UnidadKpi`) y el `Umbral` ya existen desde E2; falta el **valor calculado** y el **veredicto-semáforo** por KPI.

## What Changes

- **Definir el contrato del tablero de KPIs por idea** (RF-11/12, HU-15/16) bajo el `tag` `kpis`, anidado en la idea: `GET /ideas/{id}/kpis` devuelve el conjunto completo de KPIs **calculados** a partir de las entrevistas de la idea, cada uno con su `valor`, sus umbrales vigentes y su `zona` de semáforo (`go`/`observacion`/`kill`/`sin_datos`).
- **Modelar el KPI calculado** (`KpiCalculado`): `kpi`, `grupo`, `unidad`, `valor` (nullable cuando no hay evidencia), `numerador`/`denominador` (nullable, para transparencia y reconstruibilidad RNF-15), `umbralGo`, `umbralKill` (nullable) y `zona`. El score promedio usa el **ajuste del usuario** cuando existe (E4).
- **Modelar el tablero** (`TableroIdea`): `ideaId`, `fechaCalculo`, un `resumen` con el conteo por zona y el arreglo de `KpiCalculado` (uno por cada KPI del catálogo de la sección 7).
- **Definir las alertas de cruce de umbral** (RF-13, HU-17) anidadas en la idea: `GET /ideas/{id}/alertas` (paginado, con filtro por `leida`) y `PATCH /ideas/{id}/alertas/{idAlerta}` para marcarlas leídas. Las alertas las **genera el sistema** cuando un KPI cruza su umbral kill o go; no las crea el cliente.
- **Añadir los schemas de dominio** a `components.schemas`: `ZonaKpi`, `KpiCalculado`, `ResumenTablero`, `TableroIdea`, `TipoAlerta`, `AlertaKpi`, `ActualizarAlertaRequest`, `AlertasPaginadas`; más los parámetros `idAlerta` y el filtro `leida`.
- **Reflejar el aislamiento multi-tenant:** todo se calcula y consulta solo sobre la idea del usuario autenticado; idea ajena → `403 ACCESO_DENEGADO`.
- **Respetar las convenciones** y reutilizar componentes existentes (`bearerAuth`, `Error`/`CodigoError`, paginación, respuestas compartidas, `idIdea`, y los enums `Kpi`/`KpiGrupo`/`UnidadKpi` de E2).

## Capabilities

### New Capabilities
- `kpis`: KPIs agregados por idea y tablero de decisión (épica E5) — cálculo de los indicadores de la sección 7 del SRS a partir de las entrevistas, contraste contra los umbrales con semáforo, y alertas de cruce de umbral, todo aislado por usuario. La expresión de esta capacidad es el detalle del `tag` `kpis` en el contrato de API.

### Modified Capabilities
<!-- Ninguna: E5 introduce la capacidad `kpis`; reutiliza los enums y el `Umbral` de `ideas` (E2) sin cambiar sus requisitos. -->

## Impact

- **`contrato-api/openapi.yaml`:** se añaden los `paths` `/ideas/{id}/kpis` y `/ideas/{id}/alertas[...]` y sus schemas de dominio bajo el `tag` `kpis`. No se tocan otros módulos.
- **Convenciones:** se reutilizan los componentes existentes; este cambio **no** introduce convenciones ni códigos de error nuevos.
- **Equipos:** frontend (tablero con semáforo, panel de alertas) y backend (módulo NestJS `kpis` con el cálculo de la sección 7) ya pueden desarrollar E5 contra el contrato.
- **Fuera de alcance:** el **veredicto** del agente (E6) —que consume un *snapshot* de estos KPIs—, la config BYOK (E7), el costo y la re-evaluación en lote (E8) y todo código de runtime (fórmulas, recálculo, generación de alertas). Este cambio solo define cómo se exponen los KPIs calculados, el semáforo y las alertas. Las **fórmulas y los valores por defecto** de cada KPI viven en el dominio (SRS §7), no en el contrato.
