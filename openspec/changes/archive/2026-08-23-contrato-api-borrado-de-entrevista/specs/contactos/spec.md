## MODIFIED Requirements

### Requirement: Transicionar un contacto por el embudo de outreach
El contrato SHALL definir `POST /ideas/{id}/contactos/{idContacto}/estado` (autenticado) que mueve un contacto propio entre los estados del embudo `por_contactar → contactado → respondio → agendado → entrevistado → descartado` (RF-06, HU-08). El cuerpo MUST llevar el `estado` destino (`TransicionEstadoRequest`). El estado `descartado` MUST ser alcanzable desde cualquier estado no terminal. El estado `entrevistado` MUST NOT ser alcanzable por esta vía: solo se asigna al registrar una entrevista (E4). Una transición inválida (p. ej. saltar de `por_contactar` a `agendado`, o avanzar desde un estado terminal) MUST devolver `409 CONFLICTO`. La respuesta exitosa MUST devolver el `Contacto` con su nuevo `estado`. Un contacto o idea ajena MUST devolver `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`; un `estado` fuera del catálogo `EstadoOutreach` `422 VALIDACION_FALLIDA`.

`entrevistado` SHALL ser el único estado del embudo con **entrada y salida automáticas**, ambas gobernadas por el ciclo de vida de la entrevista y ninguna alcanzable por transición manual: se asigna al **registrar** una entrevista y se abandona —volviendo a `agendado`— al **eliminarla**.

#### Scenario: Avance válido en el embudo
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/estado` con `estado` `contactado` sobre un contacto en `por_contactar`
- **THEN** el contrato responde `200` con el `Contacto` en estado `contactado`

#### Scenario: Descartar un contacto
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/estado` con `estado` `descartado` sobre un contacto en `contactado`
- **THEN** el contrato responde `200` con el `Contacto` en estado `descartado`

#### Scenario: Transición inválida
- **WHEN** un usuario autenticado intenta una transición no permitida del embudo (p. ej. de `por_contactar` directamente a `agendado`)
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`

#### Scenario: Marcar entrevistado manualmente no permitido
- **WHEN** un usuario autenticado hace `POST /ideas/{id}/contactos/{idContacto}/estado` con `estado` `entrevistado`
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`, porque ese estado solo se alcanza al registrar una entrevista (E4)

#### Scenario: Abandonar entrevistado tampoco es manual
- **WHEN** un contacto está en `entrevistado` y el usuario intenta moverlo por transición manual a un estado anterior del embudo
- **THEN** el contrato responde `409` con `codigo` `CONFLICTO`, porque ese estado solo se abandona al eliminar la entrevista que lo originó
