## Why

Con el E1 el usuario ya puede registrar y gestionar sus **ideas**, pero una idea sin **hipótesis** no es falsable y sin **umbrales kill/go** no tiene criterio de decisión: el portafolio actual permite anotar ideas, no validarlas. La tríada de ValidaLab exige que el usuario declare *qué* está poniendo a prueba (problema / mercado / pago) y *con qué listón* se juzgará cada KPI, porque son exactamente los insumos que el agente pondera al emitir el veredicto (E6) y contra los que se leen los KPIs calculados (E5). Este change entrega la épica **E2** en el cliente, cerrando el hueco entre "tengo una idea" y "tengo un experimento con criterios".

Se construye contra `../contrato-api/openapi.yaml` (tag `ideas`, endpoints anidados bajo la idea: `POST/GET /ideas/{id}/hipotesis`, `PATCH/DELETE /ideas/{id}/hipotesis/{idHipotesis}`, `GET /ideas/{id}/umbrales`, `PUT /ideas/{id}/umbrales/{kpi}`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/`): tipos TypeScript que reflejan los esquemas de E2 del OpenAPI — `Hipotesis`, `TipoHipotesis` (`problema`/`mercado`/`pago`), `EstadoHipotesis` (`pendiente`/`confirmada`/`refutada`), `CrearHipotesisRequest`, `ActualizarHipotesisRequest`, `Umbral`, `ActualizarUmbralRequest`, y los catálogos `Kpi` (14 claves), `KpiGrupo` (4 grupos) y `UnidadKpi`. Fuente: el contrato, no el backend.
- **Servicio de hipótesis** (`features/ideas/hipotesis/`): servicio inyectable que encapsula las cuatro operaciones de hipótesis anidadas bajo la idea. La colección es pequeña y **sin paginar** (`HipotesisLista` es un arreglo), así que no participa del sobre `RespuestaPaginada`.
- **Pantalla de hipótesis** (`ideas/:id/hipotesis`): ruta hija protegida con carga diferida que lista las hipótesis de la idea agrupadas o etiquetadas por `tipo`, ofrece **alta** (Signal Forms: `tipo` + `enunciado` no vacío), **edición inline** de `tipo`/`enunciado`, **marcado de estado** (confirmada / refutada / volver a pendiente) y **eliminación** de una hipótesis registrada por error, con confirmación previa. Estados de carga / vacío / error incluidos.
- **Servicio de umbrales** (`features/ideas/umbrales/`): servicio inyectable para `GET /ideas/{id}/umbrales` (conjunto completo, un `Umbral` por KPI del catálogo) y `PUT /ideas/{id}/umbrales/{kpi}` (idempotente, por KPI).
- **Pantalla de umbrales** (`ideas/:id/umbrales`): ruta hija protegida con carga diferida que presenta los umbrales **agrupados por `KpiGrupo`** (outreach, calidad del descubrimiento, señal de problema, señal de mercado/pago), con el valor formateado e introducido según su `UnidadKpi` (porcentaje, conteo, conteo semanal, ratio, puntaje 0–10). La edición y el guardado son **fila por fila**: cada KPI se guarda con su propio `PUT`, de modo que un `422` se atribuye sin ambigüedad al KPI que lo causó y no existe estado sucio global. Los KPIs sin zona kill (`umbralKill: null`) no ofrecen control de kill.
- **Validación local de umbrales**: el cliente MUST impedir enviar `umbralKill > umbralGo` (misma regla que el `422` del contrato) y validar el rango según la `UnidadKpi`; el `422 VALIDACION_FALLIDA` del backend sigue mostrándose campo a campo como respaldo, nunca sustituido por la validación local.
- **Navegación desde el detalle de la idea**: el detalle (`ideas/:id`) gana los accesos a **Hipótesis** y **Umbrales** de esa idea, junto a las acciones ya existentes de editar/archivar/desarchivar.
- **Rutas nuevas**: `ideas/:id/hipotesis` e `ideas/:id/umbrales` como rutas hijas del shell autenticado, con carga diferida, igual que el resto del dominio `ideas`.

**Fuera de alcance** (irá en changes posteriores): el CRM de contactos (E3), las entrevistas y su scoring por IA (E4), el **cálculo** y el tablero de KPIs (E5) —aquí solo se fija el listón, no se mide contra él— y el veredicto del agente (E6). El marcado de `confirmada`/`refutada` es una anotación **manual** del usuario: en esta épica ninguna hipótesis cambia de estado por evidencia automática.

## Capabilities

### New Capabilities
- `hipotesis-y-umbrales`: gestión en el cliente de las hipótesis de una idea (listar, crear, editar `tipo`/`enunciado`, marcar `estado`, eliminar) y de sus umbrales kill/go por KPI (consultar el conjunto completo agrupado por `KpiGrupo`, fijar `umbralGo`/`umbralKill` por KPI con validación local coherente con el contrato), incluyendo estados de carga/vacío/error y la traducción de los errores del contrato ramificada por `codigo` (`VALIDACION_FALLIDA`, `ACCESO_DENEGADO`, `RECURSO_NO_ENCONTRADO`).

### Modified Capabilities
- `portafolio-de-ideas`: el detalle de una idea propia deja de ofrecer únicamente editar/archivar/desarchivar y pasa a ofrecer también el acceso a las **hipótesis** y a los **umbrales** de esa idea.
- `shell-y-navegacion`: el shell aloja dos rutas hijas protegidas más del dominio `ideas` (`ideas/:id/hipotesis` e `ideas/:id/umbrales`) con carga diferida.

## Impact

- **Código**: nuevos árboles `src/app/features/ideas/hipotesis/` y `src/app/features/ideas/umbrales/` (servicio, componentes y specs por sub-feature). `core/api/` gana `hipotesis.model.ts` y `umbral.model.ts` (con los catálogos `Kpi`/`KpiGrupo`/`UnidadKpi`). `app.routes.ts` incorpora las dos rutas hijas. El detalle de idea (`features/ideas/detalle/`) gana los enlaces de navegación.
- **Dependencias**: ninguna nueva — `@angular/common/http`, `@angular/router` y `@angular/forms/signals` ya están presentes.
- **Contrato**: consume los endpoints de hipótesis y umbrales del tag `ideas` del OpenAPI; **no** lo modifica.
- **Zoneless**: todo el estado que la vista lee es signal (`httpResource`/`signal`/`computed`); las mutaciones refrescan la UI recargando el recurso, sin Zone.js.
- **Aislamiento multi-tenant**: el cliente nunca envía `ownerId` ni `ideaId` en el cuerpo (el `ideaId` va siempre en el path); el filtrado por propietario y las respuestas `403 ACCESO_DENEGADO` las gobierna el backend. La UI solo ramifica por el `codigo` estable del error.
- **Aguas abajo**: los umbrales fijados aquí son el criterio que E5 pinta junto a los KPIs calculados y que el agente pondera en E6; las hipótesis son insumo del veredicto. Ningún cálculo ni invocación al agente ocurre en este change.
