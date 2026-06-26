## Context

El contrato ya tiene `usuarios` (E0) … `agente` (E6). Este cambio introduce el módulo **`proveedores`** (épica E7, *Configuración del proveedor de IA — BYOK*), del que depende la capa agéntica (E4 scoring, E6 veredicto). El agente es multi-proveedor: el usuario elige `anthropic`/`openai`/`google`, aporta su propia API key (BYOK) y, dentro del proveedor, dos modelos —uno económico para scoring y uno potente para veredicto— de una lista curada que administración mantiene actualizable sin redesplegar (SRS §8.8). La credencial se cifra en reposo y nunca se devuelve al frontend (RNF-07). El **runtime** (cifrado, validación real contra el proveedor, adaptador común RNF-06) y el **costo** (E8) quedan fuera de este contrato.

## Goals / Non-Goals

**Goals:**
- Exponer el catálogo curado de proveedores y modelos (datos, no enum cableado).
- Definir la configuración BYOK del usuario como un singleton: proveedor, dos modelos por tarea y API key.
- Garantizar en el contrato que la API key es write-only (nunca se devuelve) y que se valida al guardarla.
- Mapear los fallos a los códigos ya existentes (`API_KEY_INVALIDA`, `PROVEEDOR_IA_NO_DISPONIBLE`).
- Mantener el contrato como un único documento.

**Non-Goals:**
- **No** se define el costo, la tabla de precios, el prompt caching ni la re-evaluación en lote (E8).
- **No** se modela el runtime (cifrado, llamada de validación real, adaptador de proveedores).
- **No** se cablean los ids de modelo: son datos del catálogo, actualizables sin redesplegar.

## Decisions

### Decisión 1: La configuración BYOK es un singleton por usuario
- `GET`/`PUT`/`DELETE /proveedores/configuracion` operan sobre **una** configuración por usuario, no una colección.
- **Por qué singleton y no colección por proveedor:** el SRS habla de "su API key" y "el proveedor" en singular; el usuario tiene un proveedor activo a la vez. Cambiar de proveedor o modelo (RF-22) es un `PUT` idempotente que reemplaza la config (re-ingresando la key). Esto evita la complejidad de almacenar varias keys y elegir una activa, manteniendo el camino Must simple.
- `GET` devuelve `404` cuando aún no hay configuración: señal limpia para que el frontend muestre el alta y coherente con el `409` "sin BYOK" del veredicto (E6).

### Decisión 2: El catálogo de modelos son datos, no enum
- `GET /proveedores` devuelve `ProveedorIA[]`; cada `ModeloIA` tiene un `id` (cadena, p. ej. `claude-opus-4-8`) y un `nombre`.
- **Por qué cadenas y no enum:** RF-19/RNF-18 exigen que la lista sea "configurable y actualizable sin redesplegar"; cablear los modelos en un enum del contrato obligaría a redesplegar cada vez que cambia un catálogo de proveedor. El `ProveedorId` sí es enum (solo tres, estables; un cuarto entra por el adaptador RNF-06, no por el contrato).
- El catálogo es global (curado por administración), no por usuario; requiere autenticación pero no filtra por `owner_id`.

### Decisión 3: La API key es write-only y validada al guardar
- `GuardarByokRequest.apiKey` es `writeOnly`; `ConfiguracionByok` **no tiene** campo de key, solo `apiKeyRegistrada` (booleano).
- **Por qué `apiKeyRegistrada` y no una key enmascarada:** el SRS pide que la key "nunca se muestre de nuevo en pantalla" (HU-26, RNF-07); ni siquiera enmascarada. Un booleano comunica presencia sin filtrar nada.
- **Validación al guardar (RF-20):** el `PUT` valida la key contra el proveedor; inválida → `422 API_KEY_INVALIDA` (código ya en el catálogo, envuelto en la nueva `response` `ApiKeyInvalida`); proveedor caído durante la validación → `503 PROVEEDOR_IA_NO_DISPONIBLE` (response reutilizada de E6). Modelo fuera del catálogo del proveedor → `422 VALIDACION_FALLIDA`.

### Decisión 4: Dos modelos por tarea en la misma configuración
- `ConfiguracionByok` y `GuardarByokRequest` llevan `modeloScoring` y `modeloVeredicto` (RF-22b, HU-28): uno económico para el alto volumen (scoring, E4) y uno potente para el veredicto (E6).
- Ambos deben pertenecer al catálogo del `proveedor` elegido (un proveedor, dos modelos); validado en el `PUT`.

### Decisión 5: Schemas, responses y aislamiento
- Schemas: `ProveedorId` (enum `anthropic`|`openai`|`google`), `ModeloIA` (`id`, `nombre`, `descripcion?`), `ProveedorIA` (`id`, `nombre`, `modelos`), `ConfiguracionByok` (`proveedor`, `modeloScoring`, `modeloVeredicto`, `apiKeyRegistrada`, `fechaActualizacion`), `GuardarByokRequest` (`proveedor`, `apiKey` write-only, `modeloScoring`, `modeloVeredicto`).
- Responses: se añade `ApiKeyInvalida` (`422`) y se reutiliza `ProveedorNoDisponible` (`503`) de E6.
- Aislamiento: la configuración es del usuario autenticado (derivado del token); el catálogo es global. No se aceptan ids de otro usuario.

## Risks / Trade-offs

- **[Singleton: cambiar de proveedor re-ingresa la key]** No se guardan varias keys. → Aceptado: simplifica el modelo Must; si más adelante se quiere "cambiar sin re-ingresar", se evolucionaría a una colección por proveedor sin romper el singleton actual.
- **[`404` cuando no hay configuración]** Trata la config como recurso que puede no existir. → Aceptado: es más claro para el frontend que un `200` con todo en `null`, y enlaza con el `409` del veredicto.
- **[Catálogo como datos]** El contrato no fija los modelos válidos; la validación de pertenencia ocurre en runtime. → Aceptado y deseado (RNF-18): el contrato describe la forma, no el contenido volátil del catálogo.

## Open Questions

- Ninguna pendiente. Resueltas: configuración **singleton** por usuario (`PUT` reemplaza); catálogo de modelos como **datos** (no enum); API key **write-only** con `apiKeyRegistrada`; validación al guardar mapeada a `422 API_KEY_INVALIDA`/`503`; **dos modelos por tarea** en la misma config.
