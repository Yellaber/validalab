## Why

El agente (chunk C de E4) puntúa con el proveedor y la API key **del usuario** (BYOK). Con el catálogo ya disponible (E7a), este change entrega la pieza que faltaba: que cada usuario configure su proveedor, su key y sus dos modelos por tarea. Es el prerrequisito directo del scoring. Y es el chunk con más peso de seguridad: la API key se **cifra en reposo**, es **write-only** (nunca se devuelve) y se **valida contra el proveedor** al guardarla.

## What Changes

- **Sub-dominio `configuracion/`** en el módulo `proveedores` (junto a `catalogo/` de E7a).
- **Entidad `ConfiguracionByok`** (TypeORM): una por usuario (`owner_id` único, FK a `usuarios` ON DELETE CASCADE), con `proveedor`, `modeloScoring`, `modeloVeredicto` y la `apiKeyCifrada`. Migración de la tabla `configuraciones_byok`.
- **Cifrado en reposo** (`ServicioDeCifrado`, AES-256-GCM): la API key se cifra con una clave de entorno (`BYOK_CLAVE_CIFRADO`); nunca se persiste ni se devuelve en claro (RNF-07).
- **Validación de la key contra el proveedor** (`ValidadorDeApiKey`, RF-20): abstracción inyectable con un adaptador por proveedor (semilla de la capa agnóstica RNF-06). Key inválida → `422 API_KEY_INVALIDA`; proveedor no responde → `503 PROVEEDOR_IA_NO_DISPONIBLE`. Un flag de entorno (`BYOK_VALIDAR_KEY`, por defecto `true`) permite desactivar la llamada real en dev/test.
- **Endpoints** (`/proveedores/configuracion`, autenticados, aislados por `owner_id`):
  - `GET` — devuelve la config del usuario **sin la key** (solo `apiKeyRegistrada`); sin config → `404`.
  - `PUT` — crea/reemplaza (idempotente): valida que `modeloScoring`/`modeloVeredicto` pertenezcan al catálogo del `proveedor` (si no, `422 VALIDACION_FALLIDA`), valida la key, cifra y guarda; devuelve la config (sin key).
  - `DELETE` — revoca la config y su credencial cifrada (`204`); sin config → `404`.

**Fuera de alcance** (E8): precios y costo (`GET /proveedores/precios`, `/ideas/{id}/costo`, `/costo`). **Siguiente** (E4 chunk C): el agente que consumirá esta config para puntuar.

## Capabilities

### New Capabilities
- `configuracion-byok`: gestión de la configuración BYOK del usuario — guardar/consultar/revocar el proveedor, la API key (cifrada, write-only, validada contra el proveedor) y los dos modelos por tarea, validados contra el catálogo.

### Modified Capabilities
<!-- Ninguna a nivel de requisito. `catalogo-de-proveedores` se reutiliza para validar los modelos, sin cambiar su comportamiento observable. -->

## Impact

- **Código**: `src/proveedores/configuracion/` (entidad, DTOs, service, controller, `ServicioDeCifrado`, `ValidadorDeApiKey` + adaptadores por proveedor). `CatalogoService` gana un método para validar modelos. Dos excepciones nuevas: `ApiKeyInvalidaException` (422) y `ProveedorNoDisponibleException` (503).
- **Entorno**: `BYOK_CLAVE_CIFRADO` (clave AES-256, 64 hex) y `BYOK_VALIDAR_KEY` (bool, default `true`); `env.schema`, `AppConfigService` y `.env.example` actualizados.
- **Persistencia**: migración de la tabla `configuraciones_byok`.
- **Reutiliza la fundación E0–E7a**: DTOs Zod + pipe, sobre `Error`/`CodigoError` + filtro, guard global, `@OwnerId()`, y el catálogo de E7a.
- **Contrato**: implementa `GET/PUT/DELETE /proveedores/configuracion`. No lo modifica.
- **Sin dependencias nuevas** (cifrado con `node:crypto`; validación con `fetch` nativo).
