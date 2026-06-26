## 1. Schemas de dominio del catálogo

- [x] 1.1 Añadir el enum `ProveedorId` (`anthropic`|`openai`|`google`)
- [x] 1.2 Añadir el schema `ModeloIA` (`id` cadena, `nombre`, `descripcion`) — los ids son datos, no enum
- [x] 1.3 Añadir el schema `ProveedorIA` (`id` `ProveedorId`, `nombre`, `modelos` `ModeloIA[]`)

## 2. Schemas de dominio de la configuración BYOK

- [x] 2.1 Añadir el schema `ConfiguracionByok` (`proveedor`, `modeloScoring`, `modeloVeredicto`, `apiKeyRegistrada` boolean, `fechaActualizacion`) — sin la API key
- [x] 2.2 Añadir el request `GuardarByokRequest` (`proveedor`, `apiKey` write-only, `modeloScoring`, `modeloVeredicto`)

## 3. Response reutilizable

- [x] 3.1 Añadir la `response` `ApiKeyInvalida` (`422`, código `API_KEY_INVALIDA` ya existente); reutilizar `ProveedorNoDisponible` (`503`) de E6

## 4. Endpoints del catálogo y la configuración (tag `proveedores`)

- [x] 4.1 Definir `GET /proveedores` → `200` arreglo de `ProveedorIA` (catálogo curado), error `401`
- [x] 4.2 Definir `GET /proveedores/configuracion` → `200` `ConfiguracionByok` (sin key), errores `401`/`404` (sin configurar)
- [x] 4.3 Definir `PUT /proveedores/configuracion` con `GuardarByokRequest` → `200` `ConfiguracionByok`, errores `401`/`422` (`VALIDACION_FALLIDA` o `API_KEY_INVALIDA`)/`503`
- [x] 4.4 Definir `DELETE /proveedores/configuracion` → `204` sin contenido, errores `401`/`404`

## 5. Verificación

- [x] 5.1 Validar que el OpenAPI sigue siendo válido y parseable, con todas las `$ref` resueltas
- [x] 5.2 Confirmar que `apiKey` es write-only y que ni `ConfiguracionByok` ni ninguna respuesta la devuelven (RNF-07)
- [x] 5.3 Confirmar que los ids de modelo son cadenas (no enum) y que `ProveedorId` sí es enum de los tres proveedores
- [x] 5.4 Confirmar el mapeo de fallos: key inválida → `422 API_KEY_INVALIDA`, modelo fuera de catálogo → `422 VALIDACION_FALLIDA`, proveedor caído → `503`
- [x] 5.5 Confirmar que `GET /proveedores/configuracion` sin configurar → `404` y que la config lleva los dos modelos por tarea
- [x] 5.6 Confirmar que sigue siendo un único documento y que no se añadieron códigos de error nuevos (solo la `response` `ApiKeyInvalida` para un código existente)
