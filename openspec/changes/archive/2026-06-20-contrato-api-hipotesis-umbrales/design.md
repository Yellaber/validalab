## Context

El contrato (`contrato-api/openapi.yaml`) ya tiene los módulos `usuarios` (E0) e `ideas` (E1, portafolio) y las convenciones transversales. Este cambio amplía el `tag` `ideas` con la épica **E2 (hipótesis y criterios kill/go)**. Ambos recursos cuelgan de una `Idea`: una hipótesis es una afirmación falsable sobre el problema, el mercado o la disposición a pagar (SRS §1.4), y un umbral kill/go es un criterio cuantitativo fijado de antemano sobre un KPI (SRS §7), editable por idea (RF-04). E2 cubre la **captura** de hipótesis (HU-04/06, RF-03) y de umbrales (HU-05, RF-04); el **cálculo** de los KPIs (E5) y el **veredicto** del agente (E6) son épicas posteriores.

## Goals / Non-Goals

**Goals:**
- Definir en el contrato el CRUD de hipótesis tipificadas anidadas por idea, con su estado de aprendizaje.
- Definir en el contrato la consulta y edición de umbrales kill/go, uno por KPI del catálogo de la sección 7 del SRS, editables por idea.
- Reutilizar convenciones y componentes existentes (errores, auth, paginación, `idIdea`).
- Mantener el contrato como un único documento (solo se añade bajo el `tag` `ideas` y en `components`).

**Non-Goals:**
- **No** se calcula ningún KPI ni se compara contra su umbral (eso es E5/tablero); aquí solo se capturan los umbrales.
- **No** se modela el veredicto del agente (E6) ni cómo pondera los umbrales.
- **No** código de runtime (módulo NestJS, persistencia, guardas, *seeding* de defaults).

## Decisions

### Decisión 1: Recursos anidados bajo la idea, no de primer nivel
- Hipótesis y umbrales siempre pertenecen a una idea, así que se anidan: `/ideas/{id}/hipotesis` y `/ideas/{id}/umbrales`.
- **Por qué anidar:** refuerza en el propio path la pertenencia a la idea y, con ella, el aislamiento por `ownerId` (el de la idea padre). Acceder a `/ideas/{id}/...` de una idea ajena ya devuelve `403` por la convención existente, sin rutas nuevas de autorización.
- Se reutiliza el parámetro de path `idIdea` para el `{id}` de la idea y se añaden parámetros de path propios para los sub-recursos (`idHipotesis`, `kpi`).

### Decisión 2: Endpoints de hipótesis (todos autenticados)
- `POST /ideas/{id}/hipotesis` — crear una hipótesis (`tipo`, `enunciado`); nace en estado `pendiente`.
- `GET /ideas/{id}/hipotesis` — listar las hipótesis de la idea.
- `PATCH /ideas/{id}/hipotesis/{idHipotesis}` — editar `enunciado`/`tipo` y/o marcar el `estado` (`confirmada`/`refutada`/`pendiente`, HU-06).
- `DELETE /ideas/{id}/hipotesis/{idHipotesis}` — eliminar una hipótesis registrada por error.
- **Por qué un listado sin paginar:** las hipótesis por idea son pocas (típicamente 3–6, una por dimensión); devolver un arreglo simple (`HipotesisLista`) es más claro que paginar. La paginación queda reservada a colecciones potencialmente grandes (ideas, contactos, entrevistas).
- **Por qué el `estado` se edita por `PATCH` y no por una acción dedicada:** marcar `confirmada`/`refutada`/`pendiente` es una actualización de un campo acotado por enum, no una transición con efectos colaterales; un `PATCH` con `estado` opcional es suficiente y evita multiplicar endpoints.

### Decisión 3: Endpoints de umbrales (todos autenticados)
- `GET /ideas/{id}/umbrales` — devuelve el conjunto completo de umbrales de la idea: un `Umbral` por cada KPI del catálogo, con los valores vigentes (los de la idea, o los por defecto del SRS si no se han editado).
- `PUT /ideas/{id}/umbrales/{kpi}` — fija (idempotente) el `umbralGo` y, si aplica, el `umbralKill` de un KPI concreto para esa idea (HU-05: "guarda ambos umbrales").
- **Por qué `PUT` por KPI y no `PATCH` de toda la tabla:** el usuario edita un KPI a la vez (HU-05); `PUT` sobre `/{kpi}` es idempotente y deja explícito qué KPI se está fijando. El `{kpi}` es una clave estable del enum `Kpi`; un valor fuera del catálogo → `404 RECURSO_NO_ENCONTRADO`.
- **Por qué no hay `POST`/`DELETE` de umbrales:** el conjunto de KPIs es un catálogo fijo (SRS §7), no una colección que el usuario cree o borre; cada idea tiene exactamente esos umbrales, solo se editan sus valores. Restaurar los valores por defecto se considera fuera de alcance de este contrato.

### Decisión 4: Schemas de dominio (en `components.schemas`)
- `TipoHipotesis`: `problema` | `mercado` | `pago`.
- `EstadoHipotesis`: `pendiente` | `confirmada` | `refutada` (default `pendiente`).
- `Hipotesis`: `id` (uuid), `ideaId` (uuid, **solo lectura**), `tipo` (`TipoHipotesis`), `enunciado`, `estado` (`EstadoHipotesis`), `fechaCreacion`, `fechaActualizacion`.
- `CrearHipotesisRequest`: `tipo`, `enunciado` (sin `estado` ni `ideaId`; nace `pendiente`).
- `ActualizarHipotesisRequest`: `tipo`, `enunciado`, `estado`, todos opcionales (sin `ideaId`).
- `Kpi`: enum de los 14 KPIs del SRS §7 con claves estables (p. ej. `tasa_respuesta`, `volumen_evidencia`, `senal_disposicion_pago`, `tasa_referidos`).
- `KpiGrupo`: `outreach` | `calidad_descubrimiento` | `senal_problema` | `senal_mercado_pago`.
- `UnidadKpi`: `porcentaje` | `conteo` | `conteo_semanal` | `ratio` | `puntaje_0_10` — informa cómo interpretar el número del umbral (necesario para que el frontend formatee bien el semáforo).
- `Umbral`: `kpi` (`Kpi`), `grupo` (`KpiGrupo`, solo lectura), `unidad` (`UnidadKpi`, solo lectura), `umbralGo` (number), `umbralKill` (number, **nullable**: algunos KPIs no tienen zona kill).
- `ActualizarUmbralRequest`: `umbralGo` (requerido), `umbralKill` (nullable). HU-05 guarda ambos.
- `UmbralesIdea`: arreglo de `Umbral`; `HipotesisLista`: arreglo de `Hipotesis`.
- **Por qué `umbralKill` nullable:** en el SRS, *Volumen de evidencia* y *Densidad de citas* no definen umbral kill ("—"); el contrato lo modela como `null`, no como `0`.
- **Por qué `ideaId` de solo lectura en `Hipotesis`:** informa la pertenencia para trazabilidad, pero nunca se acepta como entrada (regla de aislamiento; el vínculo lo da el path).

### Decisión 5: Aislamiento y mapeo de errores
- Toda ruta `/ideas/{id}/...` sobre una idea ajena → `403 ACCESO_DENEGADO`; idea inexistente → `404 RECURSO_NO_ENCONTRADO`; sin token → `401 NO_AUTENTICADO`.
- Sub-recurso inexistente (`idHipotesis` o `kpi` desconocidos) → `404 RECURSO_NO_ENCONTRADO`.
- Payload inválido (p. ej. `enunciado` vacío, `umbralGo` ausente) → `422 VALIDACION_FALLIDA`. Como regla de negocio, `umbralKill` mayor que `umbralGo` es incoherente para los KPIs del catálogo ("más es mejor"): el contrato lo documenta como `422 VALIDACION_FALLIDA`.
- Se reutilizan las `responses` compartidas (`NoAutenticado`, `AccesoDenegado`, `NoEncontrado`, `ValidacionFallida`) y el parámetro `idIdea`.

## Risks / Trade-offs

- **[Catálogo de KPIs cableado en el enum `Kpi`]** El conjunto de KPIs vive en el contrato como enum, mientras que sus *valores por defecto* y *fórmulas* viven en el dominio (E5). → Aceptado: el catálogo de KPIs es estructural y estable (SRS §7); los modelos de IA (que sí cambian rápido, RF-19) no se cablean, pero los KPIs sí son parte del contrato de dominio.
- **[`GET /umbrales` devuelve defaults aunque no se hayan editado]** El contrato describe que la respuesta incluye siempre un `Umbral` por KPI con su valor vigente (default o editado). → Aceptado: simplifica al frontend (siempre recibe la tabla completa para el semáforo) y refleja que "editar por idea" parte de un default conocido (SRS §7).
- **[`umbralKill > umbralGo` validado como error]** Asume que todos los KPIs son "más es mejor". → Correcto para el catálogo actual del SRS §7 (todos comparan `≥ go` / `< kill`); si en el futuro hubiera un KPI invertido, la regla se revisaría junto con su definición.

## Open Questions

- Ninguna pendiente. Resueltas: el listado de hipótesis **no** se pagina (colección pequeña); los umbrales se editan **por KPI** con `PUT` idempotente y el `GET` devuelve el conjunto completo con valores por defecto cuando no se han editado.
