# gestion-de-guiones Specification

## Purpose
TBD - created by archiving change guion-de-entrevista. Update Purpose after archive.
## Requirements
### Requirement: Crear un guión de entrevista con preguntas ordenadas
El sistema SHALL permitir a un usuario autenticado crear un guión reutilizable con `nombre`, opcional `descripcion` y una lista de `preguntas` (al menos una), cada una con su `orden` y `texto`. El guión SHALL asociarse al usuario autenticado (`ownerId` derivado del token, nunca del cuerpo). Cada pregunta creada SHALL recibir un `id`. Un payload inválido (sin `nombre`, sin preguntas, o pregunta sin `texto`) SHALL responder `VALIDACION_FALLIDA`.

#### Scenario: Creación con preguntas ordenadas
- **WHEN** un usuario autenticado crea un guión con `nombre` y una lista de `preguntas` con su `orden` y `texto`
- **THEN** la respuesta es `201` con el `Guion` y sus preguntas ordenadas, cada una con `id`
- **AND** el `ownerId` es el del usuario autenticado, no un valor del cuerpo

#### Scenario: Sin preguntas
- **WHEN** un usuario autenticado crea un guión con una lista de `preguntas` vacía
- **THEN** la respuesta es `VALIDACION_FALLIDA`

#### Scenario: Sin token
- **WHEN** se crea un guión sin `Authorization: Bearer`
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Listar los guiones propios
El sistema SHALL devolver, paginados, únicamente los guiones del usuario autenticado. NUNCA SHALL incluir guiones de otro usuario.

#### Scenario: Listado paginado
- **WHEN** un usuario autenticado lista sus guiones
- **THEN** la respuesta es `200` con una página de `Guion` propios y su bloque `paginacion`

### Requirement: Consultar un guión propio
El sistema SHALL devolver un guión por su `id` solo si pertenece al usuario autenticado. Un guión de otro propietario SHALL responder `403 ACCESO_DENEGADO`; un `idGuion` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta de guión propio
- **WHEN** un usuario autenticado consulta un guión suyo
- **THEN** la respuesta es `200` con el `Guion`

#### Scenario: Guión ajeno
- **WHEN** un usuario autenticado consulta un guión de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

#### Scenario: Guión inexistente
- **WHEN** un usuario autenticado consulta un `idGuion` que no existe
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Editar un guión propio
El sistema SHALL permitir editar el `nombre`, la `descripcion` y/o las `preguntas` de un guión propio; al enviar `preguntas`, SHALL reemplazar el conjunto ordenado completo. Un guión ajeno SHALL responder `403 ACCESO_DENEGADO`; un `idGuion` inexistente `404 RECURSO_NO_ENCONTRADO`; un payload inválido `VALIDACION_FALLIDA`.

#### Scenario: Editar el nombre y las preguntas
- **WHEN** un usuario autenticado edita un guión suyo con un `nombre` nuevo y una nueva lista de `preguntas`
- **THEN** la respuesta es `200` con el `Guion` actualizado y su nuevo conjunto de preguntas ordenadas

#### Scenario: Editar un guión ajeno
- **WHEN** un usuario autenticado edita un guión de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Eliminar un guión propio
El sistema SHALL permitir eliminar un guión propio. La respuesta exitosa SHALL ser `204` sin contenido. Un guión ajeno SHALL responder `403 ACCESO_DENEGADO`; un `idGuion` inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado elimina un guión suyo
- **THEN** la respuesta es `204` sin contenido

#### Scenario: Eliminar un guión ajeno
- **WHEN** un usuario autenticado elimina un guión de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

