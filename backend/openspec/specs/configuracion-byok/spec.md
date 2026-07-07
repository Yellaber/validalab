# configuracion-byok Specification

## Purpose
TBD - created by archiving change configuracion-byok. Update Purpose after archive.
## Requirements
### Requirement: Guardar o cambiar la configuración BYOK
El sistema SHALL permitir a un usuario autenticado crear o reemplazar (idempotente) su configuración BYOK con `proveedor`, `apiKey`, `modeloScoring` y `modeloVeredicto`. `modeloScoring` y `modeloVeredicto` MUST pertenecer al catálogo del `proveedor` elegido; si no, `422 VALIDACION_FALLIDA`. La `apiKey` MUST validarse contra el proveedor al guardarla: una key inválida MUST responder `422 API_KEY_INVALIDA`; si el proveedor no responde durante la validación, `503 PROVEEDOR_IA_NO_DISPONIBLE`. La `apiKey` MUST cifrarse en reposo y MUST ser write-only: la respuesta NUNCA la devuelve. La respuesta exitosa MUST devolver la `ConfiguracionByok` (sin la key).

#### Scenario: Guardar configuración válida
- **WHEN** un usuario autenticado guarda su BYOK con un `proveedor`, una `apiKey` válida y dos modelos del catálogo de ese proveedor
- **THEN** la respuesta es `200` con la `ConfiguracionByok` (con `apiKeyRegistrada` `true`), sin devolver la key

#### Scenario: Reemplazo idempotente
- **WHEN** un usuario autenticado guarda de nuevo su BYOK con otro proveedor y otros modelos
- **THEN** la respuesta es `200` con la configuración reemplazada (una sola configuración por usuario)

#### Scenario: API key inválida
- **WHEN** un usuario autenticado guarda su BYOK con una `apiKey` que no valida contra el proveedor
- **THEN** la respuesta es `422` con `codigo` `API_KEY_INVALIDA`

#### Scenario: Modelo fuera del catálogo del proveedor
- **WHEN** un usuario autenticado guarda su BYOK con un `modeloScoring` que no pertenece al proveedor elegido
- **THEN** la respuesta es `422` con `codigo` `VALIDACION_FALLIDA`

#### Scenario: Proveedor no disponible al validar
- **WHEN** el proveedor no responde mientras se valida la API key
- **THEN** la respuesta es `503` con `codigo` `PROVEEDOR_IA_NO_DISPONIBLE`

### Requirement: Consultar la configuración BYOK propia
El sistema SHALL devolver la configuración BYOK del usuario autenticado con `proveedor`, `modeloScoring`, `modeloVeredicto` y `apiKeyRegistrada`. La respuesta NUNCA MUST incluir la API key en ninguna forma (RNF-07); solo el booleano `apiKeyRegistrada` indica su presencia. Si el usuario no ha configurado BYOK, MUST responder `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta de la configuración existente
- **WHEN** un usuario autenticado con BYOK configurado consulta su configuración
- **THEN** la respuesta es `200` con su `proveedor`, sus dos modelos y `apiKeyRegistrada` `true`
- **AND** la respuesta no contiene la API key en ninguna forma

#### Scenario: Sin configuración aún
- **WHEN** un usuario autenticado que no ha configurado BYOK consulta su configuración
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Revocar la configuración BYOK
El sistema SHALL permitir eliminar la configuración BYOK del usuario, incluida su credencial cifrada. La respuesta exitosa MUST ser `204` sin contenido. Si el usuario no tenía configuración, MUST responder `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Revocar configuración existente
- **WHEN** un usuario autenticado con BYOK configurado revoca su configuración
- **THEN** la respuesta es `204` sin contenido y la credencial cifrada deja de existir

#### Scenario: Revocar sin configuración previa
- **WHEN** un usuario autenticado sin BYOK configurado revoca su configuración
- **THEN** la respuesta es `404` con `codigo` `RECURSO_NO_ENCONTRADO`

