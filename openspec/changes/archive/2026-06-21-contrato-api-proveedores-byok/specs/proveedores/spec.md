## ADDED Requirements

### Requirement: Catálogo curado de proveedores y modelos
El contrato SHALL definir `GET /proveedores` (autenticado) que devuelve el catálogo curado de proveedores de IA soportados (`anthropic`, `openai`, `google`) y, por cada uno, la lista de modelos idóneos para el análisis (RF-19, HU-24). Los ids de modelo MUST ser datos (cadenas), no un enum fijo del contrato, de modo que el catálogo sea actualizable sin redesplegar (RNF-18). Sin token MUST devolver `401 NO_AUTENTICADO`.

#### Scenario: Listar proveedores y sus modelos
- **WHEN** un usuario autenticado hace `GET /proveedores`
- **THEN** el contrato responde `200` con los proveedores soportados y, por cada uno, su lista curada de `ModeloIA`

#### Scenario: Poblar el selector al elegir proveedor
- **WHEN** el frontend necesita los modelos de un proveedor para el selector
- **THEN** los obtiene del catálogo de `GET /proveedores`, sin conocer el catálogo completo del proveedor

#### Scenario: Sin token
- **WHEN** se hace `GET /proveedores` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Consultar la configuración BYOK propia
El contrato SHALL definir `GET /proveedores/configuracion` (autenticado) que devuelve la configuración BYOK del usuario autenticado: `proveedor`, `modeloScoring`, `modeloVeredicto` y `apiKeyRegistrada` (RF-18). La respuesta MUST NOT incluir nunca la API key (RNF-07, RF-21); solo el booleano `apiKeyRegistrada` indica su presencia. Si el usuario no ha configurado BYOK, MUST devolver `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consulta de la configuración existente
- **WHEN** un usuario autenticado con BYOK configurado hace `GET /proveedores/configuracion`
- **THEN** el contrato responde `200` con su `proveedor`, sus dos modelos y `apiKeyRegistrada` `true`
- **AND** la respuesta no contiene la API key en ninguna forma

#### Scenario: Sin configuración aún
- **WHEN** un usuario autenticado que no ha configurado BYOK hace `GET /proveedores/configuracion`
- **THEN** el contrato responde `404` con `codigo` `RECURSO_NO_ENCONTRADO`

### Requirement: Guardar o cambiar la configuración BYOK
El contrato SHALL definir `PUT /proveedores/configuracion` (autenticado, idempotente) que crea o reemplaza la configuración BYOK del usuario con `proveedor`, `apiKey`, `modeloScoring` y `modeloVeredicto` (RF-18/22/22b, HU-23/27/28). El `proveedor` MUST ser uno soportado y `modeloScoring`/`modeloVeredicto` MUST pertenecer a su catálogo curado; en caso contrario, `422 VALIDACION_FALLIDA`. La `apiKey` MUST validarse contra el proveedor al guardarla (RF-20); una key inválida MUST devolver `422 API_KEY_INVALIDA` y, si el proveedor no responde durante la validación, `503 PROVEEDOR_IA_NO_DISPONIBLE`. La `apiKey` MUST ser write-only: se acepta en la petición pero la respuesta MUST NOT devolverla (RNF-07). La respuesta exitosa MUST devolver la `ConfiguracionByok` (sin la key).

#### Scenario: Guardar configuración válida
- **WHEN** un usuario autenticado hace `PUT /proveedores/configuracion` con `proveedor` `anthropic`, una `apiKey` válida y dos modelos del catálogo de Anthropic
- **THEN** el contrato responde `200` con la `ConfiguracionByok` (con `apiKeyRegistrada` `true`), sin devolver la key

#### Scenario: Cambiar de proveedor o modelo
- **WHEN** un usuario autenticado vuelve a hacer `PUT /proveedores/configuracion` con otro `proveedor` y otros modelos
- **THEN** el contrato responde `200` con la configuración reemplazada

#### Scenario: API key inválida
- **WHEN** un usuario autenticado hace `PUT /proveedores/configuracion` con una `apiKey` que no valida contra el proveedor
- **THEN** el contrato responde `422` con `codigo` `API_KEY_INVALIDA`

#### Scenario: Modelo fuera del catálogo del proveedor
- **WHEN** un usuario autenticado hace `PUT /proveedores/configuracion` con un `modeloScoring` que no pertenece al proveedor elegido
- **THEN** el contrato responde `422` con `codigo` `VALIDACION_FALLIDA`

#### Scenario: Proveedor no disponible al validar
- **WHEN** el proveedor no responde mientras se valida la API key
- **THEN** el contrato responde `503` con `codigo` `PROVEEDOR_IA_NO_DISPONIBLE`

### Requirement: Revocar la configuración BYOK
El contrato SHALL definir `DELETE /proveedores/configuracion` (autenticado) que elimina la configuración BYOK del usuario, incluida su credencial cifrada. La respuesta exitosa MUST ser `204` sin contenido. Si el usuario no tenía configuración, MUST devolver `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Revocar configuración existente
- **WHEN** un usuario autenticado con BYOK configurado hace `DELETE /proveedores/configuracion`
- **THEN** el contrato responde `204` sin contenido y la credencial deja de existir

#### Scenario: Revocar sin configuración previa
- **WHEN** un usuario autenticado sin BYOK configurado hace `DELETE /proveedores/configuracion`
- **THEN** el contrato responde `404` con `codigo` `RECURSO_NO_ENCONTRADO`
