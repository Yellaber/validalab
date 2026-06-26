## Why

Con E0 (`usuarios`) y E1 (portafolio de `ideas`) ya definidos en el contrato, el siguiente paso del camino crítico del MVP es **E2 (hipótesis y criterios kill/go)**. El `tag` `ideas` ya declara que cubre las épicas E1 **y E2**, pero solo E1 está definida. Las hipótesis y los umbrales cuelgan de cada `Idea` y son la base del juicio posterior: las hipótesis hacen explícito qué se debe probar (problema/mercado/pago) y los umbrales kill/go fijan, **de antemano**, el criterio que el agente pondera para emitir su veredicto (E6) y que el tablero usa para el semáforo (E5). Sin este contrato, frontend y backend no pueden construir la captura de hipótesis ni la edición de umbrales sobre la que se apoyan E5 y E6.

## What Changes

- **Definir el contrato de hipótesis por idea** (RF-03, HU-04/06) bajo el `tag` `ideas`, anidado en `/ideas/{id}/hipotesis`: crear, listar, editar (incluido marcar `confirmada`/`refutada`/`pendiente`) y eliminar hipótesis tipificadas (`problema`|`mercado`|`pago`).
- **Definir el contrato de umbrales kill/go por idea** (RF-04, HU-05) anidado en `/ideas/{id}/umbrales`: consultar el conjunto de umbrales (uno por KPI del catálogo de la sección 7 del SRS, con sus valores por defecto editables) y fijar el `umbralGo`/`umbralKill` de un KPI concreto.
- **Añadir los schemas de dominio** a `components.schemas`: `Hipotesis`, `TipoHipotesis`, `EstadoHipotesis`, `CrearHipotesisRequest`, `ActualizarHipotesisRequest`; `Umbral`, `Kpi`, `KpiGrupo`, `UnidadKpi`, `ActualizarUmbralRequest` y los sobres de colección correspondientes.
- **Reflejar el aislamiento multi-tenant (RF-02, RNF-04/05):** todas las rutas operan solo sobre recursos del usuario autenticado; el `ownerId` se deriva del token de la idea padre, y operar sobre una idea (o hipótesis) ajena devuelve `403 ACCESO_DENEGADO`.
- **Respetar las convenciones ya definidas** y reutilizar componentes existentes (`bearerAuth` global, `Error`/`CodigoError`, parámetros de paginación, respuestas compartidas, parámetro `idIdea`).

## Capabilities

### New Capabilities
<!-- No hay capacidad nueva: E2 extiende la capacidad `ideas` existente con hipótesis y umbrales. -->

### Modified Capabilities
- `ideas`: se amplía con la gestión de **hipótesis tipificadas** y **umbrales kill/go por KPI** anidados en cada idea (épica E2), conservando el aislamiento por usuario. La expresión de esta ampliación es el detalle del `tag` `ideas` en el contrato de API.

## Impact

- **`contrato-api/openapi.yaml`:** se añaden los `paths` anidados `/ideas/{id}/hipotesis[...]` y `/ideas/{id}/umbrales[...]` y sus schemas de dominio. No se tocan otros módulos.
- **Convenciones:** se reutilizan los componentes existentes; este cambio no introduce convenciones ni códigos de error nuevos.
- **Equipos:** frontend (formularios de hipótesis y de edición de umbrales por idea) y backend (módulo NestJS `ideas`) ya pueden desarrollar E2 contra el contrato.
- **Fuera de alcance:** el **cálculo** de los KPIs y el tablero/semáforo (E5), el veredicto del agente (E6) y todo código de runtime. Los umbrales **no** son la decisión: son el criterio que el agente ponderará; este cambio solo define cómo se capturan y editan, no cómo se calculan ni se interpretan.
