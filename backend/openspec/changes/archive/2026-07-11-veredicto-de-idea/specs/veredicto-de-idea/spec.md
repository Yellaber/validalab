## ADDED Requirements

### Requirement: Emitir un veredicto razonado sobre una idea
El sistema SHALL permitir a un usuario autenticado invocar al Validador Inteligente sobre una idea propia (`POST /ideas/{id}/veredictos`, sin cuerpo) para que analice sus KPIs vigentes y emita un `Veredicto` con `veredicto` (`go`/`pivote`/`kill`), `confianza` (0–100), `justificacionPorKPI` y `recomendaciones`. El sistema SHALL usar el modelo de veredicto de la config BYOK del usuario. La salida SHALL validarse con Zod y reintentarse ante una salida inválida. El veredicto SHALL nacer con `estadoVerificacion` `pendiente` y SHALL congelar el `snapshotKpis`, el `proveedor` y el `modelo` (reproducibilidad). Sin config BYOK → `409 CONFLICTO`; salida inválida tras los reintentos → `502 SALIDA_AGENTE_INVALIDA`; proveedor no disponible → `503 PROVEEDOR_IA_NO_DISPONIBLE`. Una idea ajena → `403 ACCESO_DENEGADO`; inexistente → `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Emisión exitosa
- **WHEN** un usuario con config BYOK invoca el veredicto de una idea suya
- **THEN** la respuesta es `201` con el `Veredicto` (`veredicto`, `confianza`, `justificacionPorKPI`, `recomendaciones`), `estadoVerificacion` `pendiente` y el `snapshotKpis`/`proveedor`/`modelo` congelados

#### Scenario: Sin configuración BYOK
- **WHEN** un usuario sin config BYOK invoca el veredicto
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`

#### Scenario: Salida del agente inválida tras reintentos
- **WHEN** el agente no produce una salida que cumpla el esquema tras los reintentos permitidos
- **THEN** la respuesta es `502` con `codigo` `SALIDA_AGENTE_INVALIDA` y no se persiste veredicto

#### Scenario: Idea ajena
- **WHEN** un usuario invoca el veredicto sobre una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Consultar el historial y un veredicto
El sistema SHALL devolver, paginado, el historial de veredictos de una idea propia (recientes primero) y SHALL devolver un veredicto concreto con su salida, su `snapshotKpis` y su `estadoVerificacion`/`verificacion`. Una idea o veredicto ajeno → `403 ACCESO_DENEGADO`; un identificador inexistente → `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Historial paginado
- **WHEN** un usuario autenticado lista los veredictos de una idea suya
- **THEN** la respuesta es `200` con una página de `Veredicto` y su bloque `paginacion`

#### Scenario: Consultar un veredicto
- **WHEN** un usuario autenticado consulta un veredicto suyo
- **THEN** la respuesta es `200` con el `Veredicto`, incluyendo su `snapshotKpis` y su verificación (o `null` si está `pendiente`)

### Requirement: Verificar un veredicto en modo consultivo
El sistema SHALL permitir verificar un veredicto propio `pendiente` (`POST /ideas/{id}/veredictos/{idVeredicto}/verificacion`) con `resultado` `aprobado` o `anulado`. Al **aprobar**, el sistema SHALL marcar el veredicto `aprobado`, registrar la `verificacion` y fijar el `estado` de la idea al valor del veredicto (`go`/`pivote`/`kill`) —único camino legítimo para fijarlo—. Al **anular**, el sistema SHALL exigir una `nota` (si falta → `422 VALIDACION_FALLIDA`), marcar `anulado` con la nota y NO cambiar el estado de la idea. En ambos casos SHALL conservar el bloque del agente intacto (ambas versiones). Un veredicto ya verificado → `409 CONFLICTO`. Un veredicto ajeno → `403`; inexistente → `404`.

#### Scenario: Aprobar fija el estado de la idea
- **WHEN** un usuario aprueba un veredicto `pendiente` cuyo `veredicto` es `pivote`
- **THEN** la respuesta es `200` con el veredicto `aprobado` y su `verificacion`, y la idea queda en estado `pivote`

#### Scenario: Anular exige nota y no cambia la idea
- **WHEN** un usuario anula un veredicto `pendiente` con una `nota`
- **THEN** la respuesta es `200` con el veredicto `anulado` (conservando el bloque del agente) y la idea NO cambia de estado

#### Scenario: Anular sin nota
- **WHEN** un usuario anula un veredicto sin `nota`
- **THEN** la respuesta es `422` con `codigo` `VALIDACION_FALLIDA`

#### Scenario: Veredicto ya verificado
- **WHEN** un usuario verifica un veredicto que ya está `aprobado` o `anulado`
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`

### Requirement: Modo fake del veredicto para entornos sin proveedor
El sistema SHALL soportar un modo `fake` de la capa agéntica que emite un veredicto válido y determinista a partir del snapshot de KPIs, sin invocar a ningún proveedor ni salir a la red. El modo `fake` SHALL recorrer el mismo flujo de validación, persistencia y verificación que el modo real.

#### Scenario: Emisión en modo fake
- **WHEN** el entorno está en modo `fake` y se invoca el veredicto de una idea
- **THEN** la respuesta es `201` con un `Veredicto` determinista (derivado del snapshot) y una traza sin proveedor real
