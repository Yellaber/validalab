## ADDED Requirements

### Requirement: Costo estimado acumulado por idea
El contrato SHALL definir `GET /ideas/{id}/costo` (autenticado) que devuelve el costo estimado acumulado del consumo de IA de una idea propia (RF-22f, HU-29), con un desglose por tarea (`scoring`/`veredicto`), los tokens consumidos y el número de llamadas. La respuesta MUST declarar explícitamente que es un **estimado del consumo vía ValidaLab y NO el saldo** de la cuenta del proveedor (RNF-17), mediante `esEstimado` y `aclaracion`, y MUST incluir `urlFacturacion`, el enlace al panel de facturación del proveedor para recargar (RF-22g, HU-31). Pedir el costo de una idea ajena MUST devolver `403 ACCESO_DENEGADO`; una idea inexistente, `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Consultar el costo de una idea
- **WHEN** un usuario autenticado hace `GET /ideas/{id}/costo` sobre una idea propia con entrevistas puntuadas
- **THEN** el contrato responde `200` con el costo estimado acumulado, su desglose por tarea y los tokens consumidos

#### Scenario: La respuesta aclara que es un estimado, no el saldo
- **WHEN** un usuario autenticado consulta el costo de una idea
- **THEN** la respuesta incluye `esEstimado` en `true`, una `aclaracion` de que es el consumo vía ValidaLab y no el saldo, y `urlFacturacion` para recargar en el proveedor

#### Scenario: Costo de una idea ajena
- **WHEN** un usuario autenticado pide `GET /ideas/{id}/costo` de una idea de otro usuario
- **THEN** el contrato responde `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Costo estimado acumulado por usuario
El contrato SHALL definir `GET /costo` (autenticado) que devuelve el costo estimado acumulado total del usuario autenticado (RF-22f, HU-29), agregado sobre todas sus ideas y con un desglose por idea (`costoPorIdea`). El `owner_id` MUST derivarse del token. La respuesta MUST declarar que es un estimado del consumo vía ValidaLab y no el saldo (RNF-17) e incluir `urlFacturacion` (RF-22g). Sin token MUST devolver `401 NO_AUTENTICADO`.

#### Scenario: Consultar el costo total propio
- **WHEN** un usuario autenticado hace `GET /costo`
- **THEN** el contrato responde `200` con su costo estimado total y el desglose por idea, aclarando que es un estimado y no el saldo

#### Scenario: Sin token
- **WHEN** se hace `GET /costo` sin `Authorization: Bearer`
- **THEN** el contrato responde `401` con `codigo` `NO_AUTENTICADO`

### Requirement: Tabla de precios por modelo
El contrato SHALL definir `GET /proveedores/precios` (autenticado) que devuelve la tabla de precios por modelo (RF-22e): por cada proveedor y modelo, el precio de entrada, de salida y de entrada cacheada por millón de tokens, con su `moneda` y `vigenteDesde`. Los precios MUST ser datos configurables y actualizables sin redesplegar (RNF-18), no valores cableados en el contrato. Sin token MUST devolver `401 NO_AUTENTICADO`.

#### Scenario: Listar la tabla de precios
- **WHEN** un usuario autenticado hace `GET /proveedores/precios`
- **THEN** el contrato responde `200` con un arreglo de `PrecioModelo`, cada uno con sus precios por millón de tokens y su `moneda`

#### Scenario: Los precios son datos actualizables
- **WHEN** administración actualiza un precio del catálogo
- **THEN** el cambio se refleja en `GET /proveedores/precios` sin redesplegar, porque los precios son datos y no un enum del contrato
