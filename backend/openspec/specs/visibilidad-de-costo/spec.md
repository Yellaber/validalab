# visibilidad-de-costo Specification

## Purpose
TBD - created by archiving change precios-y-costo-estimado. Update Purpose after archive.
## Requirements
### Requirement: Consultar la tabla de precios por modelo
El sistema SHALL exponer, para un usuario autenticado, la tabla de precios por modelo (`GET /proveedores/precios`): por proveedor y modelo, el precio de entrada y de salida por millón de tokens, el de entrada cacheada cuando aplique, la `moneda` y su vigencia. Los precios SHALL ser datos configurables y actualizables sin redesplegar, no valores cableados.

#### Scenario: Devuelve la tabla de precios
- **WHEN** un usuario autenticado consulta la tabla de precios
- **THEN** la respuesta es `200` con una lista de `PrecioModelo` (proveedor, modelo, precio de entrada y de salida por millón, moneda)

#### Scenario: Requiere autenticación
- **WHEN** se consulta la tabla de precios sin un token válido
- **THEN** la respuesta es `401 NO_AUTENTICADO`

### Requirement: Consultar el costo estimado de una idea
El sistema SHALL devolver el costo estimado acumulado del consumo de IA de una idea propia (`GET /ideas/{id}/costo`), calculado localmente como tokens × tabla de precios sobre TODAS las ejecuciones del agente de la idea (scoring y veredicto), con desglose por tarea, tokens y número de llamadas. La respuesta SHALL marcar `esEstimado` en `true`, incluir la `aclaracion` normativa (es un estimado del consumo vía ValidaLab, no el saldo de la cuenta) y, cuando exista, la `urlFacturacion` del proveedor. Una idea ajena SHALL responder `403 ACCESO_DENEGADO`; una inexistente `404 RECURSO_NO_ENCONTRADO`.

#### Scenario: Costo con desglose por tarea
- **WHEN** un usuario autenticado consulta el costo de una idea suya con consumo de scoring y veredicto
- **THEN** la respuesta es `200` con el `costoEstimadoTotal`, el `desglosePorTarea` (una entrada por `scoring`/`veredicto` con llamadas, tokens y costo) y `esEstimado` en `true`

#### Scenario: Idea sin consumo
- **WHEN** un usuario autenticado consulta el costo de una idea sin ejecuciones del agente
- **THEN** la respuesta es `200` con `costoEstimadoTotal` `0` y un desglose vacío o en cero

#### Scenario: Idea ajena
- **WHEN** un usuario autenticado consulta el costo de una idea de otro usuario
- **THEN** la respuesta es `403` con `codigo` `ACCESO_DENEGADO`

### Requirement: Consultar el costo estimado total del usuario
El sistema SHALL devolver el costo estimado acumulado total del usuario autenticado (`GET /costo`), agregado sobre todas sus ideas y con desglose por idea (identificada por su `titulo`). El `owner_id` SHALL derivarse del token. La respuesta SHALL marcar `esEstimado` en `true` e incluir la `aclaracion` normativa y, cuando exista, la `urlFacturacion`.

#### Scenario: Total con desglose por idea
- **WHEN** un usuario autenticado con consumo en varias ideas consulta su costo total
- **THEN** la respuesta es `200` con el `costoEstimadoTotal` y `costoPorIdea` (una entrada por idea con su `titulo` y su costo estimado)

#### Scenario: El costo es un estimado, no el saldo
- **WHEN** un usuario autenticado consulta su costo total
- **THEN** la respuesta trae `esEstimado` en `true` y una `aclaracion` que precisa que es un estimado del consumo vía ValidaLab, no el saldo de la cuenta del proveedor

