## Context

E2 es la segunda épica de dominio del frontend. E1 ya fijó el **patrón de feature de dominio** (servicio de recurso + modelos del contrato en `core/api/` + carga con `httpResource` + Signal Forms + rutas hijas del shell) y este change lo aplica, sin reinventarlo, a las dos colecciones que cuelgan de una idea: sus **hipótesis** y sus **umbrales kill/go**.

Las dos son colecciones anidadas bajo `/ideas/{id}`, pero tienen formas muy distintas y por eso no se resuelven igual:

- **Hipótesis** — colección **abierta y pequeña**: el usuario crea, edita y elimina filas; el contrato la devuelve como arreglo plano (`HipotesisLista`), sin sobre `RespuestaPaginada`. Es un CRUD clásico.
- **Umbrales** — conjunto **cerrado y fijo**: `GET /ideas/{id}/umbrales` devuelve siempre **un `Umbral` por cada KPI del catálogo** (14 filas, ya sea con el valor editado o con el valor por defecto). No se crean ni se borran filas: solo se **fijan** valores, con un `PUT` idempotente por KPI. Es una hoja de parámetros, no una lista.

Restricciones heredadas de E0/E1 y de `frontend/CLAUDE.md`: Angular 22 standalone, **zoneless** (detección por signals), organización por feature/sub-feature, el contrato OpenAPI como fuente de verdad (sin mirar `backend/`), y la plomería HTTP ya resuelta (interceptor de autorización con `Bearer`+refresh, `errorInterceptor` → `ErrorApi` ramificable por `codigo`). Las mecánicas concretas de Angular las gobierna la skill **`angular-developer`**, que debe consultarse al empezar la implementación; aquí solo se resuelven las tensiones no triviales.

## Goals / Non-Goals

**Goals:**
- CRUD de `Hipotesis` bajo una idea propia (listar, crear, editar `tipo`/`enunciado`, marcar `estado`, eliminar).
- Consulta y edición de los umbrales kill/go por KPI, agrupados por `KpiGrupo` y presentados según su `UnidadKpi`.
- Guardado **fila por fila** de los umbrales, con validación local `umbralKill ≤ umbralGo` alineada con el `422` del contrato.
- Dos rutas hijas del shell con carga diferida y su acceso desde el detalle de la idea.
- Estados de carga/vacío/error y traducción de errores por `codigo`, reafirmando el patrón de E1.

**Non-Goals:**
- **Calcular** KPIs o mostrar su valor real frente al umbral (E5) — aquí solo se fija el listón.
- Ponderar umbrales o hipótesis para producir un veredicto (E6); ninguna llamada al agente ocurre aquí.
- Confirmar o refutar hipótesis **automáticamente** a partir de evidencia: en E2 el `estado` es una anotación manual del usuario.
- Editar el catálogo de KPIs, sus fórmulas o sus valores por defecto: el catálogo `Kpi` es estable y lo gobierna el contrato/dominio.
- Historial o auditoría de cambios de umbral (el contrato no lo expone).
- Notificaciones/toasts globales: los errores se muestran en la propia vista, como en E0/E1.

## Decisions

### D1 — Dos servicios de recurso separados, uno por colección
`HipotesisService` (`features/ideas/hipotesis/`) y `UmbralesService` (`features/ideas/umbrales/`), ambos `providedIn: 'root'`, cada uno envolviendo su tramo del contrato y devolviendo los tipos del OpenAPI. Ambos reciben el `ideaId` como argumento y lo interpolan en el **path**; ninguno lo acepta ni lo envía en el cuerpo, y ninguno envía `ownerId`. Se separan porque sus ciclos de vida y sus formas no tienen nada en común (CRUD abierto vs. hoja de parámetros fija), y fusionarlos en un `IdeaCriteriosService` produciría un servicio con dos mitades sin relación. Alternativa descartada: extender `IdeasService` — ya concentra la entidad raíz y crecería a diez operaciones heterogéneas.

### D2 — Carga con `httpResource`; mutaciones imperativas
Igual que D2 de E1: cada pantalla modela su carga con un `httpResource` cuya *request* deriva del `ideaId` de la ruta, exponiendo `value`/`isLoading`/`error` como signals que la vista consume directamente. Las mutaciones (crear/editar/eliminar hipótesis, fijar umbral) son **imperativas** en el servicio y devuelven el recurso actualizado. Encaje natural con zoneless; ninguna capa de estado adicional.

### D3 — Tras mutar hipótesis se recarga el recurso; tras fijar un umbral se actualiza solo su fila
Divergen a propósito. Las hipótesis son una colección abierta cuya cardinalidad cambia (crear/eliminar), así que tras cada mutación se hace `reload()` del recurso — se acepta la petición extra frente a mantener un caché manual desincronizable (mismo criterio que E1). Los umbrales, en cambio, tienen cardinalidad **fija** y el `PUT` devuelve el `Umbral` completo y autoritativo del KPI afectado: recargar las 14 filas por guardar una es desperdicio, y además descartaría las ediciones en curso de las otras filas. Por eso el `PUT` **reemplaza puntualmente su fila** en el estado local.

### D4 — El agrupamiento y la unidad se leen de la respuesta, no de una tabla cableada en el cliente
El esquema `Umbral` del contrato ya trae `grupo` (`KpiGrupo`) y `unidad` (`UnidadKpi`) como campos `readOnly`. La vista agrupa las filas por el `grupo` **que viene en la respuesta** y elige el control de edición por la `unidad` **que viene en la respuesta**. Lo único local es la tabla de **etiquetas legibles** (nombre humano y descripción corta de cada `Kpi`, `KpiGrupo` y orden de los grupos), análoga a `ETIQUETA_ESTADO` de E1. Así, si el catálogo de KPIs crece, el cliente sigue renderizando y solo le falta la etiqueta (con degradación a la clave cruda). Alternativa descartada: cablear en el cliente el mapa KPI→grupo/unidad — duplica la fuente de verdad y se desincroniza en silencio.

### D5 — Los porcentajes se editan en puntos porcentuales y se transportan como tasa 0–1
El contrato define `unidad: porcentaje` como proporción `0–1` (`0.25` = 25%). Pedirle al usuario que escriba `0.25` para "25%" es una fuente de error de un orden de magnitud en un valor que decide un kill. La fila con `unidad: porcentaje` presenta un control en **puntos porcentuales (0–100)** con sufijo `%`, y convierte al enviar (`/100`) y al recibir (`×100`), **redondeando** a la precisión mostrada para no arrastrar ruido de coma flotante (`0.1 + 0.2`). Las demás unidades se editan en crudo: `conteo` y `conteo_semanal` en enteros ≥ 0, `ratio` y `puntaje_0_10` en decimales (este último acotado a 0–10). Alternativa descartada: editar la tasa cruda en todas las unidades — coherente con el transporte, pero hostil y propenso a errores donde más caro es equivocarse.

### D6 — Guardado fila por fila con estado local por fila derivado del recurso
Cada fila de umbral mantiene su propio borrador (valor editado, en-curso, error), derivado del valor del recurso mediante `linkedSignal` de modo que una recarga del recurso resiembra los borradores no tocados. El `PUT` se emite **por fila** y su resultado sólo afecta a esa fila. Consecuencias buscadas: no hay estado sucio global, un `422` se atribuye sin ambigüedad al KPI que lo causó, y el guardado es reintentable fila a fila. La acción de guardar de una fila permanece deshabilitada mientras la fila no haya cambiado o sea inválida localmente. Alternativa descartada: guardado masivo por grupo (N `PUT` en paralelo) — un fallo parcial deja el grupo a medio aplicar y obliga a reconciliar qué filas quedaron sin guardar.

### D7 — Validación local de umbrales que **espeja** la del contrato, sin sustituirla
El cliente bloquea el envío cuando `umbralGo` no es un número, cuando `umbralKill > umbralGo`, o cuando el valor sale del rango de su `UnidadKpi`. Es la misma regla que produce el `422` del contrato, adelantada para dar feedback inmediato. El `422 VALIDACION_FALLIDA` del backend **se sigue manejando y mostrando** campo a campo desde `detalles`: la validación local es una comodidad, nunca la autoridad. Los KPIs con `umbralKill: null` (sin zona kill) **no renderizan control de kill** y su petición omite el campo.

### D8 — Un formulario Signal Forms de hipótesis reutilizado por alta y edición inline
Siguiendo D3 de E1, un mismo modelo de formulario (`{ tipo, enunciado }`, con `enunciado` requerido no vacío y `tipo` del enum) sirve para el alta (parte vacío → `POST`) y para la edición inline de una fila (se inicializa con la hipótesis → `PATCH`). El marcado de `estado` (confirmada / refutada / pendiente) **no** pasa por el formulario: es una acción directa que emite un `PATCH` con solo `estado`, porque es una anotación de un clic, no una edición de texto. Alternativa descartada: formularios separados para alta y edición — duplica validación y plantilla.

### D9 — La eliminación de una hipótesis se confirma **en línea**, sin `window.confirm`
`DELETE` es la única operación irreversible del change. Se confirma con un paso intermedio en la propia fila (el control de eliminar se transforma en "¿Eliminar? Sí / Cancelar") en lugar de un diálogo nativo: `window.confirm` bloquea el hilo, no es estilizable y es hostil en pruebas. No hay librería de UI en el proyecto, así que se resuelve con un signal de fila, sin añadir dependencias.

### D10 — Modelos del contrato a mano en `core/api/`
Siguiendo D4 de E1: `core/api/hipotesis.model.ts` (`Hipotesis`, `TipoHipotesis`, `EstadoHipotesis`, `CrearHipotesisRequest`, `ActualizarHipotesisRequest`) y `core/api/umbral.model.ts` (`Umbral`, `ActualizarUmbralRequest`, y los catálogos `Kpi`, `KpiGrupo`, `UnidadKpi` como uniones de literales). Los catálogos se escriben como **unión de literales más un arreglo `const` de orden** cuando la vista necesita iterarlos; los tipos se derivan del arreglo para que no puedan divergir.

### D11 — Dos rutas hijas del shell, alcanzables desde el detalle de la idea
`app.routes.ts` añade `ideas/:id/hipotesis` e `ideas/:id/umbrales` como hijas de la ruta del shell (ya protegida por `sesionGuard`), con `loadComponent`. Al colgar del shell, el `CanMatch` del padre ya impide cargar sus chunks sin sesión. El detalle de la idea gana los enlaces a ambas, junto a editar/archivar/desarchivar. Alternativa descartada: renderizarlas como secciones dentro del detalle — obligaría al detalle a cargar tres recursos y la hoja de 14 umbrales dominaría una pantalla cuyo objeto es la idea.

### D12 — Ramificación de la UI por `codigo` del `ErrorApi`, nunca por `mensaje`
Reafirma D6 de E1 en el terreno de E2: `VALIDACION_FALLIDA` → error por campo desde `detalles`; `ACCESO_DENEGADO` → acceso denegado sin revelar contenido; `RECURSO_NO_ENCONTRADO` → idea, hipótesis o KPI inexistente (el contrato responde `404` también para un `{kpi}` fuera del catálogo); `ERROR_RED`/`ERROR_INTERNO` → error con reintento.

## Risks / Trade-offs

- **Conversión de porcentaje (×100 / ÷100)** → introduce ruido de coma flotante y una doble representación (lo que se ve vs. lo que se transporta). Mitigación: redondear explícitamente a la precisión mostrada en ambos sentidos y cubrirlo con tests de ida y vuelta; la unidad se lee del contrato, no se adivina por el nombre del KPI.
- **El contrato no distingue umbral "editado" por la idea de umbral "por defecto"** → `GET /ideas/{id}/umbrales` devuelve los valores vigentes sin marcar su procedencia. La UI **no debe** prometer esa distinción (nada de insignias "personalizado" ni "restablecer al valor por defecto", que no tienen endpoint). Se muestran los valores vigentes y punto.
- **Catálogo de 14 KPIs en una sola pantalla** → riesgo de muro de formularios. Mitigación: agrupar por `KpiGrupo` con encabezado y una línea de contexto por grupo; el orden de los grupos sigue la sección 7 del SRS (outreach → calidad → problema → mercado/pago).
- **Estado local por fila vs. recarga del recurso** → si el recurso se recargara mientras una fila está editada, el borrador podría perderse. Mitigación: los umbrales **no** se recargan tras guardar (D3); la única recarga es el reintento explícito tras un error de carga, donde no hay borradores que preservar.
- **Marcar `confirmada`/`refutada` es manual y podría leerse como un dictamen del sistema** → contradice el modo consultivo del producto. Mitigación: la UI presenta el marcado como anotación del usuario; ningún texto sugiere que la evidencia lo determine por sí sola.
- **Colección de hipótesis sin paginar** → si una idea acumulara decenas de hipótesis la vista crecería sin control. Se acepta: el contrato la define explícitamente como colección pequeña y en la práctica son 3–6 por idea.
- **`ideaId` en el path de dos servicios más** → más superficie donde un `ideaId` equivocado pediría datos ajenos. Mitigación: el `ideaId` se toma siempre de la ruta activa y el backend responde `403 ACCESO_DENEGADO` ante una idea ajena; el cliente nunca lo compone a mano ni lo envía en el cuerpo.
