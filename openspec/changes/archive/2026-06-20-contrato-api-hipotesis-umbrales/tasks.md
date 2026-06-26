## 1. Schemas de dominio de hipótesis

- [x] 1.1 Añadir los enums `TipoHipotesis` (`problema`|`mercado`|`pago`) y `EstadoHipotesis` (`pendiente`|`confirmada`|`refutada`)
- [x] 1.2 Añadir el schema `Hipotesis` (`id`, `ideaId` solo lectura, `tipo`, `enunciado`, `estado`, `fechaCreacion`, `fechaActualizacion`)
- [x] 1.3 Añadir los requests `CrearHipotesisRequest` (`tipo`, `enunciado`) y `ActualizarHipotesisRequest` (`tipo`, `enunciado`, `estado`, todos opcionales; sin `ideaId`)
- [x] 1.4 Añadir el sobre `HipotesisLista` (arreglo de `Hipotesis`, sin paginar)
- [x] 1.5 Añadir el parámetro de path `idHipotesis`

## 2. Schemas de dominio de umbrales

- [x] 2.1 Añadir el enum `Kpi` con las claves estables de los 14 KPIs del SRS §7 (outreach, calidad, problema, mercado/pago)
- [x] 2.2 Añadir los enums `KpiGrupo` (`outreach`|`calidad_descubrimiento`|`senal_problema`|`senal_mercado_pago`) y `UnidadKpi` (`porcentaje`|`conteo`|`conteo_semanal`|`ratio`|`puntaje_0_10`)
- [x] 2.3 Añadir el schema `Umbral` (`kpi`, `grupo` solo lectura, `unidad` solo lectura, `umbralGo`, `umbralKill` nullable)
- [x] 2.4 Añadir el request `ActualizarUmbralRequest` (`umbralGo` requerido, `umbralKill` nullable) y el sobre `UmbralesIdea` (arreglo de `Umbral`)
- [x] 2.5 Añadir el parámetro de path `kpi` (referenciando el enum `Kpi`)

## 3. Endpoints de hipótesis (anidados en la idea)

- [x] 3.1 Definir `POST /ideas/{id}/hipotesis` con `CrearHipotesisRequest` → `201` `Hipotesis` en `pendiente`, errores `401`/`403`/`404`/`422`
- [x] 3.2 Definir `GET /ideas/{id}/hipotesis` → `200` `HipotesisLista`, errores `401`/`403`/`404`
- [x] 3.3 Definir `PATCH /ideas/{id}/hipotesis/{idHipotesis}` con `ActualizarHipotesisRequest` → `200` `Hipotesis`, errores `401`/`403`/`404`/`422`
- [x] 3.4 Definir `DELETE /ideas/{id}/hipotesis/{idHipotesis}` → `204` sin contenido, errores `401`/`403`/`404`

## 4. Endpoints de umbrales (anidados en la idea)

- [x] 4.1 Definir `GET /ideas/{id}/umbrales` → `200` `UmbralesIdea` (un `Umbral` por KPI, con valores vigentes/por defecto), errores `401`/`403`/`404`
- [x] 4.2 Definir `PUT /ideas/{id}/umbrales/{kpi}` con `ActualizarUmbralRequest` → `200` `Umbral`, errores `401`/`403`/`404` (kpi fuera de catálogo)/`422` (`umbralGo` ausente o `umbralKill` > `umbralGo`)

## 5. Verificación

- [x] 5.1 Validar que el OpenAPI sigue siendo válido y parseable tras los cambios
- [x] 5.2 Confirmar el aislamiento: rutas `/ideas/{id}/...` sobre idea ajena → `403`, idea/sub-recurso inexistente → `404`
- [x] 5.3 Confirmar que `CrearHipotesisRequest` no acepta `ideaId` ni `estado`, y que la hipótesis nace `pendiente`
- [x] 5.4 Confirmar que `umbralKill` es nullable y que los KPIs sin zona kill del SRS (`volumen_evidencia`, `densidad_citas`) lo reflejan
- [x] 5.5 Confirmar que sigue siendo un único documento (solo se tocó `paths` del tag `ideas` y `components`) y que no se añadieron códigos de error nuevos
