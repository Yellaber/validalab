## 1. Schemas de dominio del tablero

- [x] 1.1 Añadir el enum `ZonaKpi` (`go`|`observacion`|`kill`|`sin_datos`)
- [x] 1.2 Añadir el schema `KpiCalculado` (`kpi`, `grupo`, `unidad`, `valor` nullable, `numerador`/`denominador` nullable, `umbralGo`, `umbralKill` nullable, `zona`), reutilizando los enums `Kpi`/`KpiGrupo`/`UnidadKpi` de E2
- [x] 1.3 Añadir el schema `ResumenTablero` (conteo por zona: `enZonaGo`, `enObservacion`, `enZonaKill`, `sinDatos`, `totalKpis`)
- [x] 1.4 Añadir el schema `TableroIdea` (`ideaId`, `fechaCalculo`, `resumen`, `kpis` `KpiCalculado[]`)

## 2. Schemas de dominio de alertas

- [x] 2.1 Añadir el enum `TipoAlerta` (`go`|`kill`)
- [x] 2.2 Añadir el schema `AlertaKpi` (`id`, `ideaId` solo lectura, `kpi`, `tipo`, `valor`, `umbral`, `fecha`, `leida`)
- [x] 2.3 Añadir el request `ActualizarAlertaRequest` (`leida`) y el sobre `AlertasPaginadas`
- [x] 2.4 Añadir el parámetro de path `idAlerta` y el parámetro de query `filtroLeida`

## 3. Endpoints del tablero (tag `kpis`, anidados en la idea)

- [x] 3.1 Definir `GET /ideas/{id}/kpis` → `200` `TableroIdea` (un `KpiCalculado` por KPI del catálogo, con su `zona`), errores `401`/`403`/`404`

## 4. Endpoints de alertas (tag `kpis`, anidados en la idea)

- [x] 4.1 Definir `GET /ideas/{id}/alertas` (paginado + filtro por `leida`) → `200` `AlertasPaginadas`, errores `401`/`403`/`404`
- [x] 4.2 Definir `PATCH /ideas/{id}/alertas/{idAlerta}` con `ActualizarAlertaRequest` → `200` `AlertaKpi`, errores `401`/`403`/`404`/`422`

## 5. Verificación

- [x] 5.1 Validar que el OpenAPI sigue siendo válido y parseable, con todas las `$ref` resueltas
- [x] 5.2 Confirmar el aislamiento: rutas `/ideas/{id}/...` ajenas → `403`, idea/alerta inexistente → `404`
- [x] 5.3 Confirmar que `KpiCalculado` reutiliza los enums `Kpi`/`KpiGrupo`/`UnidadKpi` de E2 y que `valor`/`umbralKill` son nullable
- [x] 5.4 Confirmar que la `zona` cubre `sin_datos` y que los KPIs sin zona kill nunca quedan en `kill`
- [x] 5.5 Confirmar que las alertas no se crean desde el cliente (solo `GET` y `PATCH` de `leida`)
- [x] 5.6 Confirmar que sigue siendo un único documento (solo se tocó `paths` y `components`) y que no se añadieron códigos de error nuevos
