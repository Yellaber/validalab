## 1. Schemas de dominio del veredicto

- [x] 1.1 Añadir los enums `TipoVeredicto` (`go`|`pivote`|`kill`) y `EstadoVeredicto` (`pendiente`|`aprobado`|`anulado`)
- [x] 1.2 Añadir el schema `JustificacionKpi` (`kpi` reutilizando el enum `Kpi` de E2, `lectura`)
- [x] 1.3 Añadir el schema `VerificacionVeredicto` solo lectura (`resultado` `aprobado`|`anulado`, `nota`, `fecha`)
- [x] 1.4 Añadir el schema `Veredicto` (`id`, `ideaId` solo lectura, `veredicto`, `confianza` 0–100, `justificacionPorKPI` `JustificacionKpi[]`, `recomendaciones` `string[]`, `proveedor`, `modelo`, `snapshotKpis` `KpiCalculado[]` reutilizando E5, `estadoVerificacion`, `verificacion` nullable, `fechaEmision`); bloques del agente y snapshot de solo lectura
- [x] 1.5 Añadir el request `VerificarVeredictoRequest` (`resultado` requerido, `nota`) y el sobre `VeredictosPaginados`
- [x] 1.6 Añadir el parámetro de path `idVeredicto`

## 2. Responses reutilizables del agente

- [x] 2.1 Añadir la `response` `SalidaAgenteInvalida` (`502`, código `SALIDA_AGENTE_INVALIDA`) y `ProveedorNoDisponible` (`503`, código `PROVEEDOR_IA_NO_DISPONIBLE`), envolviendo códigos ya existentes del catálogo

## 3. Endpoints del veredicto (tag `agente`, anidados en la idea)

- [x] 3.1 Definir `POST /ideas/{id}/veredictos` (sin cuerpo) → `201` `Veredicto` en verificación `pendiente`, errores `401`/`403`/`404`/`409` (sin BYOK)/`502` (salida inválida)/`503` (proveedor caído)
- [x] 3.2 Definir `GET /ideas/{id}/veredictos` (paginado) → `200` `VeredictosPaginados`, errores `401`/`403`/`404`
- [x] 3.3 Definir `GET /ideas/{id}/veredictos/{idVeredicto}` → `200` `Veredicto`, errores `401`/`403`/`404`

## 4. Endpoint de verificación humana

- [x] 4.1 Definir `POST /ideas/{id}/veredictos/{idVeredicto}/verificacion` con `VerificarVeredictoRequest` → `200` `Veredicto` (aprobar fija el estado de la idea; anular exige `nota`), errores `401`/`403`/`404`/`409` (ya verificado)/`422` (anular sin nota)

## 5. Verificación

- [x] 5.1 Validar que el OpenAPI sigue siendo válido y parseable, con todas las `$ref` resueltas
- [x] 5.2 Confirmar el aislamiento: rutas `/ideas/{id}/...` ajenas → `403`, idea/veredicto inexistente → `404`
- [x] 5.3 Confirmar que `POST /veredictos` no recibe cuerpo y que el bloque del agente y el `snapshotKpis` son de solo lectura
- [x] 5.4 Confirmar el mapeo de fallos del agente: sin BYOK → `409`, salida inválida → `502`, proveedor caído → `503`
- [x] 5.5 Confirmar que aprobar cambia el estado de la idea (`go`/`pivote`/`kill`), que anular exige `nota` y que re-verificar → `409`
- [x] 5.6 Confirmar que `snapshotKpis` reutiliza `KpiCalculado` (E5) y `JustificacionKpi.kpi` el enum `Kpi` (E2)
- [x] 5.7 Confirmar que sigue siendo un único documento y que no se añadieron códigos de error nuevos (solo `responses` para códigos existentes)
