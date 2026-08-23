## ADDED Requirements

### Requirement: Sobre de error estándar en toda respuesta de error
El sistema SHALL responder a todo error con el sobre `Error` del contrato: un objeto con `codigo` (valor estable del catálogo `CodigoError`), `mensaje` (texto legible e informativo) y, cuando aplique, `detalles` con errores de validación campo a campo. Ningún endpoint SHALL emitir errores con una forma distinta a este sobre.

#### Scenario: Excepción de dominio normalizada
- **WHEN** un manejador lanza una excepción de la aplicación
- **THEN** la respuesta es el sobre `Error` con el `codigo` correspondiente del catálogo `CodigoError`
- **AND** el estado HTTP coincide con el mapeado para ese código

#### Scenario: Error inesperado
- **WHEN** ocurre una excepción no controlada
- **THEN** la respuesta es el sobre `Error` con `codigo` `ERROR_INTERNO` y estado HTTP 500
- **AND** no se filtran trazas de pila ni detalles internos al cliente

### Requirement: Mapeo estable de excepciones a códigos y estados
El sistema SHALL mapear de forma explícita y estable cada categoría de error al par (`CodigoError`, estado HTTP) definido por el contrato: `NO_AUTENTICADO`→401, `ACCESO_DENEGADO`→403, `RECURSO_NO_ENCONTRADO`→404, `CONFLICTO`→409, `VALIDACION_FALLIDA`→400/422, `LIMITE_TASA`→429, `ERROR_INTERNO`→500. Los errores de validación de Zod SHALL traducirse a `VALIDACION_FALLIDA` con `detalles` de la forma `{ campo, problema }`.

#### Scenario: Fallo de validación con detalles
- **WHEN** la validación de entrada falla en dos campos
- **THEN** la respuesta usa `codigo` `VALIDACION_FALLIDA`
- **AND** `detalles` contiene una entrada `{ campo, problema }` por cada campo inválido

#### Scenario: No revelar recursos ajenos
- **WHEN** se solicita un recurso perteneciente a otro `owner_id` y el contrato exige no revelar su existencia
- **THEN** la respuesta no distingue entre "no existe" y "no es tuyo" más allá de lo que el contrato permite
