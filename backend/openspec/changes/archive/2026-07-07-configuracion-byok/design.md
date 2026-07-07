## Context

Sobre E0–E7a. El contrato (tag `proveedores`, `/proveedores/configuracion`) fija:

- `ConfiguracionByok { proveedor, modeloScoring, modeloVeredicto, apiKeyRegistrada, fechaActualizacion }` — **nunca** la key (RNF-07).
- `GuardarByokRequest { proveedor, apiKey(write-only, ≥1), modeloScoring, modeloVeredicto }`.
- Errores: modelo fuera del catálogo → `422 VALIDACION_FALLIDA`; key inválida → `422 API_KEY_INVALIDA`; proveedor no responde al validar → `503 PROVEEDOR_IA_NO_DISPONIBLE`; sin config → `404`.

## Goals / Non-Goals

**Goals:**
- Guardar/consultar/revocar la config BYOK, con la key cifrada en reposo, write-only y validada contra el proveedor.
- Reutilizar el catálogo de E7a para validar los modelos por tarea.
- Dejar sembrada la abstracción de proveedor (validador) que el agente (chunk C) ampliará.

**Non-Goals:**
- El agente y el scoring (chunk C): aquí solo se guarda la config; no se puntúa.
- Precios y costo (E8).
- Rotación/caducidad de la clave de cifrado (operación futura).

## Decisions

### D1 — Cifrado en reposo (AES-256-GCM)
`ServicioDeCifrado` usa `node:crypto` con AES-256-GCM y una clave de 32 bytes de `BYOK_CLAVE_CIFRADO` (64 hex, validada en el env schema). `cifrar(plano)` genera un IV aleatorio de 12 bytes y devuelve `iv:authTag:ciphertext` (hex); `descifrar` verifica el authTag (integridad) antes de devolver. La key en claro solo existe en memoria durante el PUT (para validarla y cifrarla) y, en el futuro, durante la invocación del agente (descifrando bajo demanda). Nunca se loguea ni se serializa.

### D2 — Validación de la key contra el proveedor (RF-20) + flag
`ValidadorDeApiKey` es una interfaz `validar(proveedor, apiKey): Promise<'valida'|'invalida'|'no_disponible'>`. La implementación real hace una llamada ligera y autenticada por proveedor (p. ej. listar modelos) con `fetch` + timeout (`AbortController`): `200 → valida`; `401/403 → invalida`; error de red/timeout/5xx → `no_disponible`. Es la **semilla del adaptador común** (RNF-06) que el agente ampliará. Como la validación real requiere red y una key real, `BYOK_VALIDAR_KEY` (env, default `true`) permite en dev/test tratar cualquier key no vacía como válida, para poder verificar el flujo completo sin salir a los proveedores. En producción es `true`.

### D3 — Entidad `ConfiguracionByok` (una por usuario, idempotente)
Tabla `configuraciones_byok`: `id`, `owner_id uuid` (**único**, FK a `usuarios` ON DELETE CASCADE), `proveedor`, `modelo_scoring`, `modelo_veredicto`, `api_key_cifrada`, timestamps. El `PUT` es un **upsert** por `owner_id` (busca la existente y la reemplaza, o crea): idempotente. La respuesta se mapea a `ConfiguracionByok` **sin** la key, con `apiKeyRegistrada: true`.

### D4 — Orden de validación en el PUT
`guardar(ownerId, dto)`:
1. Modelos: `CatalogoService.modeloIdsDe(proveedor)` → si `modeloScoring`/`modeloVeredicto` no están en el catálogo del proveedor → `ValidacionFallidaException` (422). (El `proveedor` ∈ enum lo valida Zod.)
2. Key: `ValidadorDeApiKey.validar(proveedor, apiKey)` → `invalida` → `ApiKeyInvalidaException` (422 API_KEY_INVALIDA); `no_disponible` → `ProveedorNoDisponibleException` (503).
3. Cifrar la key y hacer upsert de la config.
4. Devolver la config sin key.

Se valida el modelo **antes** que la key para no gastar una llamada al proveedor si la petición ya es inválida por catálogo.

### D5 — Excepciones nuevas
`ApiKeyInvalidaException` (código `API_KEY_INVALIDA`, 422) y `ProveedorNoDisponibleException` (código `PROVEEDOR_IA_NO_DISPONIBLE`, 503) en `dominio.exception.ts` (ambos códigos ya existen en el catálogo con su estado HTTP).

### D6 — DTOs, aislamiento y organización
`GuardarByokDto` (`proveedor` ∈ enum, `apiKey` ≥1, `modeloScoring`/`modeloVeredicto` cadenas). Respuesta `ConfiguracionByokDto` (sin key). El aislamiento es por `owner_id` del token (config propia; sin `id` de recurso en la ruta: es singular por usuario). `ConfiguracionService`, `ServicioDeCifrado` y `ValidadorDeApiKey` viven en `proveedores/configuracion/`; se registran en `ProveedoresModule` junto al `catalogo/`.

## Risks / Trade-offs

- **Flag `BYOK_VALIDAR_KEY`** → conveniencia de dev/test; en prod debe ser `true`. Documentado en `.env.example`. La lógica de validación (códigos 422/503) se cubre con unit tests (validador mockeado); el flujo completo, e2e con el flag en `false`.
- **Clave de cifrado en el entorno** → estándar; su custodia/rotación es operación (fuera de alcance). Pérdida de la clave = pérdida de las keys cifradas (el usuario reconfigura).
- **Llamada de red en el PUT** → con timeout; un proveedor lento no cuelga la petición (→ `503`).
- **Migración a mano tras `migration:generate`** → se limpia el ruido y se verifica `run`/`revert`/`run`.

## Migration Plan

1. Env: `BYOK_CLAVE_CIFRADO` + `BYOK_VALIDAR_KEY` en `env.schema`, `AppConfigService`, `.env.example` (+ fixture del spec de env).
2. Excepciones `ApiKeyInvalidaException`/`ProveedorNoDisponibleException`.
3. `ServicioDeCifrado` (AES-256-GCM) + tests (cifrar≠plano, round-trip, authTag).
4. `ValidadorDeApiKey` (interfaz + adaptadores por proveedor + flag) + tests del flag/mapeo.
5. `CatalogoService.modeloIdsDe(proveedor)`.
6. Entidad `ConfiguracionByok` + migración de la tabla.
7. DTOs, mapeador, `ConfiguracionService` (guardar/obtener/eliminar), `ConfiguracionController`.
8. Registrar en `ProveedoresModule`.
9. Verificar contra la BD (Docker, con `BYOK_VALIDAR_KEY=false`): PUT→GET (apiKeyRegistrada, sin key)→PUT idempotente→DELETE→GET 404; y 422 modelo fuera de catálogo. Rollback: revertir la migración.

## Open Questions

- **Ninguna abierta.** El consumo de la config por el agente queda para el chunk C.
