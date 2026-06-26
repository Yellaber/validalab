## Why

Con E0–E6 ya definidos (hasta el veredicto del agente), falta la pieza de la que **depende** la capa agéntica: la **configuración BYOK del proveedor de IA** (E7). El agente es multi-proveedor y cada usuario aporta su propia API key (HU-23). Sin este contrato, el frontend no puede ofrecer la pantalla de configuración ni poblar la lista de modelos, y el backend no sabe con qué proveedor/modelo/credencial invocar al agente en E4 (scoring) y E6 (veredicto) —de hecho, `POST /ideas/{id}/veredictos` ya responde `409` "sin proveedor BYOK configurado", precondición que esta épica satisface—. El `tag` `proveedores` ya está declarado pero aún sin endpoints.

## What Changes

- **Definir el catálogo curado de proveedores y modelos** (RF-19, HU-24) bajo el `tag` `proveedores`: `GET /proveedores` devuelve los proveedores soportados (`anthropic`, `openai`, `google`) y, por cada uno, la **lista curada de modelos idóneos**. Los ids de modelo son **datos** (cadenas), no un enum cableado: el catálogo es configurable y actualizable sin redesplegar (RNF-18).
- **Definir la configuración BYOK del usuario** (RF-18/22/22b, HU-23/27/28) como recurso singleton por usuario: `GET /proveedores/configuracion` (la config propia, **sin** la API key), `PUT /proveedores/configuracion` (crear/cambiar proveedor, modelos y key) y `DELETE /proveedores/configuracion` (revocar). Incluye **dos modelos por tarea**: `modeloScoring` (económico) y `modeloVeredicto` (potente).
- **Validar la API key contra el proveedor al guardarla** (RF-20, HU-25): un `PUT` con una key inválida responde `422 API_KEY_INVALIDA`; si el proveedor no responde durante la validación, `503 PROVEEDOR_IA_NO_DISPONIBLE`.
- **Proteger la credencial** (RF-21, RNF-07, HU-26): la `apiKey` es **write-only** —se envía al guardar pero **nunca** se devuelve—; la configuración expone solo `apiKeyRegistrada` (booleano) para indicar su presencia.
- **Añadir los schemas de dominio** a `components.schemas`: `ProveedorId`, `ModeloIA`, `ProveedorIA`, `ConfiguracionByok`, `GuardarByokRequest`; y la `response` reutilizable `ApiKeyInvalida` (`422`, código ya existente en el catálogo). Se reutiliza `ProveedorNoDisponible` (`503`) de E6.
- **Reflejar el aislamiento:** la configuración es estrictamente del usuario autenticado; el catálogo de proveedores es global (curado por administración) pero requiere autenticación.

## Capabilities

### New Capabilities
- `proveedores`: configuración BYOK del proveedor de IA (épica E7). Catálogo curado de proveedores y modelos, y la configuración propia del usuario (proveedor, dos modelos por tarea y API key cifrada validada contra el proveedor), nunca exponiendo la credencial. La expresión de esta capacidad es el detalle del `tag` `proveedores` en el contrato de API.

### Modified Capabilities
<!-- Ninguna en spec: E7 introduce la capacidad `proveedores`. La precondición "sin BYOK → 409" del veredicto (E6) ya estaba declarada; no cambia su requisito. -->

## Impact

- **`contrato-api/openapi.yaml`:** se añaden los `paths` `/proveedores` y `/proveedores/configuracion`, sus schemas de dominio y la `response` `ApiKeyInvalida` bajo el `tag` `proveedores`. No se tocan otros módulos.
- **Convenciones:** **no** se introducen códigos de error nuevos (`API_KEY_INVALIDA` y `PROVEEDOR_IA_NO_DISPONIBLE` ya están en el catálogo); solo se añade un envoltorio `responses` para el primero.
- **Equipos:** frontend (pantalla de configuración BYOK, selector de proveedor y modelos, manejo de key write-only) y backend (módulo NestJS `proveedores`, cifrado en reposo, validación contra el proveedor, adaptador común RNF-06) ya pueden desarrollar E7 contra el contrato.
- **Fuera de alcance:** el **costo estimado** y la tabla de precios, el prompt caching, el scoring idempotente y la re-evaluación en lote (E8), y todo código de runtime (cifrado, validación real contra el proveedor, adaptador de proveedores). Este cambio solo define cómo se expone el catálogo y cómo se guarda/consulta la configuración BYOK.
