## ADDED Requirements

### Requirement: Consultar el catálogo curado de proveedores y modelos
El sistema SHALL devolver, a un usuario autenticado, el catálogo curado de proveedores de IA soportados (`anthropic`, `openai`, `google`) y, por cada uno, su lista de modelos idóneos para el análisis. Los ids de modelo SHALL ser datos (cadenas) actualizables sin redesplegar, no un enum del contrato. El catálogo es global (curado por administración), no aislado por usuario. Sin token SHALL responder `401 NO_AUTENTICADO`.

#### Scenario: Listar proveedores y sus modelos
- **WHEN** un usuario autenticado hace `GET /proveedores`
- **THEN** la respuesta es `200` con los proveedores soportados y, por cada uno, su lista curada de `ModeloIA` (cada modelo con su `id` y `nombre`)

#### Scenario: Los ids de modelo son datos actualizables
- **WHEN** administración actualiza un modelo del catálogo en la base de datos
- **THEN** el cambio se refleja en `GET /proveedores` sin redesplegar, porque los modelos son datos y no un enum del contrato

#### Scenario: Sin token
- **WHEN** se hace `GET /proveedores` sin `Authorization: Bearer`
- **THEN** la respuesta es `401` con `codigo` `NO_AUTENTICADO`
