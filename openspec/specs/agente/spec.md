# agente Specification

## Purpose
TBD - created by archiving change contrato-api-veredicto-agente. Update Purpose after archive.
## Requirements
### Requirement: Invocar al agente para emitir un veredicto de idea
El contrato SHALL definir `POST /ideas/{id}/veredictos` (autenticado) que invoca al Validador Inteligente sobre una idea propia para que analice sus KPIs vigentes y emita un veredicto razonado (RF-14, HU-18). La operación NO recibe cuerpo: el `proveedor` y el `modelo` provienen de la configuración BYOK del usuario (E7). La respuesta exitosa MUST devolver el recurso `Veredicto` emitido, en estado de verificación `pendiente`. Si el usuario no tiene un proveedor BYOK configurado, el contrato MUST responder `409 CONFLICTO`. Si la salida del agente no valida contra su esquema tras reintentos (RF-AG-03, RNF-20), MUST responder `502 SALIDA_AGENTE_INVALIDA`, sin dejar un veredicto a medias. Si el proveedor de IA no responde, MUST responder `503 PROVEEDOR_IA_NO_DISPONIBLE`. Una idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `id` inexistente `404 RECURSO_NO_ENCONTRADO`; sin token `401 NO_AUTENTICADO`.

#### Scenario: Emisión exitosa
- **WHEN** un usuario autenticado con proveedor BYOK configurado hace `POST /ideas/{id}/veredictos` sobre una idea suya
- **THEN** el contrato responde `201` con el `Veredicto` (con `veredicto`, `confianza`, `justificacionPorKPI` y `recomendaciones`) en estado de verificación `pendiente`

#### Scenario: Evidencia escasa produce confianza baja
- **WHEN** la idea tiene poca evidencia y un usuario invoca al agente
- **THEN** el contrato responde `201` con un `Veredicto` cuya `confianza` es baja, sin impedir la emisión

#### Scenario: Sin proveedor BYOK configurado
- **WHEN** un usuario sin configuración BYOK hace `POST /ideas/{id}/veredictos`
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`

#### Scenario: Salida del agente inválida
- **WHEN** el agente no produce una salida válida contra su esquema tras los reintentos
- **THEN** el contrato responde `502` con `codigo` `SALIDA_AGENTE_INVALIDA`

#### Scenario: Proveedor no disponible
- **WHEN** el proveedor de IA elegido no responde
- **THEN** el contrato responde `503` con `codigo` `PROVEEDOR_IA_NO_DISPONIBLE`

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/veredictos` sobre una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Veredicto razonado con justificación por KPI y confianza
El contrato SHALL modelar el recurso `Veredicto` con la salida estructurada del agente (RF-15, HU-19, SRS §8.5): `veredicto` (`go` | `pivote` | `kill`), `confianza` (0–100), `justificacionPorKPI` (la lectura del agente por cada KPI relevante) y `recomendaciones` (acciones sugeridas). El bloque del agente MUST ser de solo lectura: lo produce el Validador Inteligente, nunca el cliente.

#### Scenario: El veredicto explica cada KPI
- **WHEN** un usuario consulta un `Veredicto` emitido
- **THEN** el `Veredicto` incluye `justificacionPorKPI`, con la lectura del agente para los KPIs relevantes, y un nivel de `confianza`

#### Scenario: El cliente no fija el veredicto
- **WHEN** un usuario invoca al agente
- **THEN** el contrato no contempla recibir el `veredicto`, la `confianza` ni la justificación en el cuerpo (los produce el agente)

### Requirement: Snapshot reproducible del veredicto
El contrato SHALL conservar en cada `Veredicto`, para auditoría y reproducibilidad (RNF-09, SRS §8.7), el `proveedor` y el `modelo` con que se emitió y el `snapshotKpis`: el conjunto de `KpiCalculado` (valores, umbrales y zona) sobre el que el agente razonó. Estos campos MUST ser de solo lectura.

#### Scenario: El veredicto guarda su motor y sus datos
- **WHEN** un usuario consulta un `Veredicto`
- **THEN** el `Veredicto` incluye el `proveedor`, el `modelo` y el `snapshotKpis` sobre el que se emitió

#### Scenario: Comparar veredictos sucesivos
- **WHEN** una idea acumula varios veredictos a medida que entra evidencia
- **THEN** cada uno conserva su propio `snapshotKpis`, permitiendo comparar cómo evoluciona el juicio

### Requirement: Verificación humana del veredicto (modo consultivo)
El contrato SHALL definir `POST /ideas/{id}/veredictos/{idVeredicto}/verificacion` (autenticado) que permite al usuario **aprobar** o **anular** un veredicto propio (RF-16, HU-20, SRS §8.6). Al **aprobar**, el veredicto queda firme y la idea cambia de estado al del veredicto (`go`/`pivote`/`kill`) —único camino legítimo para fijar esos estados (E1)—. Al **anular**, el contrato MUST exigir una `nota` con el motivo y la idea NO cambia de estado. El contrato MUST conservar ambas versiones: la del agente y la verificación del usuario. Un veredicto ya verificado MUST responder `409 CONFLICTO`. Una idea o veredicto ajeno MUST devolver `403 ACCESO_DENEGADO`; un `idVeredicto` inexistente `404 RECURSO_NO_ENCONTRADO`; anular sin `nota` (o payload inválido) `422 VALIDACION_FALLIDA`.

#### Scenario: Aprobar un veredicto
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/veredictos/{idVeredicto}/verificacion` con `resultado` `aprobado`
- **THEN** el contrato responde `200` con el `Veredicto` en estado `aprobado`
- **AND** la idea queda en el estado del veredicto (`go`/`pivote`/`kill`)

#### Scenario: Anular un veredicto con nota
- **WHEN** un usuario autenticado hace la verificación con `resultado` `anulado` y una `nota`
- **THEN** el contrato responde `200` con el `Veredicto` en estado `anulado`, conservando la salida del agente, y la idea no cambia de estado

#### Scenario: Anular sin nota
- **WHEN** un usuario autenticado hace la verificación con `resultado` `anulado` sin `nota`
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA`

#### Scenario: Veredicto ya verificado
- **WHEN** un usuario autenticado intenta verificar un veredicto que ya fue aprobado o anulado
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`

### Requirement: Historial de veredictos de una idea
El contrato SHALL definir `GET /ideas/{id}/veredictos` (autenticado, paginado) que devuelve el historial de veredictos de una idea propia, y `GET /ideas/{id}/veredictos/{idVeredicto}` que devuelve uno con su salida, su snapshot y su verificación (RF-17, HU-21). Una idea o veredicto ajeno MUST devolver `403 ACCESO_DENEGADO`; un identificador inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Listado del historial
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/veredictos` sobre una idea suya
- **THEN** el contrato responde `200` con una página de `Veredicto` y su bloque `paginacion`

#### Scenario: Consultar un veredicto del historial
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/veredictos/{idVeredicto}` sobre un veredicto suyo
- **THEN** el contrato responde `200` con el `Veredicto`, incluyendo su `snapshotKpis` y su estado de verificación

