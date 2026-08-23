# embudo-de-outreach Specification

## Purpose
TBD - created by archiving change crm-de-contactos. Update Purpose after archive.
## Requirements
### Requirement: Transicionar un contacto por el embudo de outreach
El sistema SHALL permitir mover un contacto propio entre los estados del embudo `por_contactar → contactado → respondio → agendado → entrevistado → descartado`. El cuerpo SHALL llevar el `estado` destino. `descartado` SHALL ser alcanzable desde cualquier estado no terminal. `entrevistado` NUNCA SHALL ser alcanzable por esta vía (solo se asigna al registrar una entrevista, E4). Una transición inválida (saltar estados, avanzar desde un estado terminal, o pedir `entrevistado`) SHALL responder `409 CONFLICTO`. Un `estado` fuera del catálogo `EstadoOutreach` SHALL responder `VALIDACION_FALLIDA`. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Avance válido en el embudo
- **WHEN** un usuario autenticado transiciona a `contactado` un contacto en `por_contactar`
- **THEN** la respuesta es `200` con el `Contacto` en estado `contactado`

#### Scenario: Descartar un contacto
- **WHEN** un usuario autenticado transiciona a `descartado` un contacto en `contactado`
- **THEN** la respuesta es `200` con el `Contacto` en estado `descartado`

#### Scenario: Transición inválida
- **WHEN** un usuario autenticado intenta una transición no permitida (p. ej. de `por_contactar` directamente a `agendado`)
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`

#### Scenario: Marcar entrevistado manualmente no permitido
- **WHEN** un usuario autenticado transiciona a `entrevistado`
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`, porque ese estado solo se alcanza al registrar una entrevista (E4)

#### Scenario: Estado fuera del catálogo
- **WHEN** un usuario autenticado transiciona a un `estado` que no existe en `EstadoOutreach`
- **THEN** la respuesta es `VALIDACION_FALLIDA`

### Requirement: Registrar toques de outreach con límite de dos
El sistema SHALL permitir registrar un toque de outreach sobre un contacto propio, con su fecha. El primer toque SHALL fijar `primerToqueEn` y el segundo (único follow-up) `segundoToqueEn`. La `fecha` es opcional; si se omite, SHALL asumirse el momento del registro. Un tercer toque SHALL responder `409 CONFLICTO` por exceder el límite de dos. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; un `idContacto` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Primer toque
- **WHEN** un usuario autenticado registra un toque sobre un contacto sin toques previos
- **THEN** la respuesta es `200` con el `Contacto` cuyo `primerToqueEn` queda registrado

#### Scenario: Segundo toque (follow-up)
- **WHEN** un usuario autenticado registra un toque sobre un contacto que ya tiene `primerToqueEn`
- **THEN** la respuesta es `200` con el `Contacto` cuyo `segundoToqueEn` queda registrado

#### Scenario: Tercer toque excede el límite
- **WHEN** un usuario autenticado registra un toque sobre un contacto que ya tiene dos toques
- **THEN** la respuesta es `409` con `codigo` `CONFLICTO`

