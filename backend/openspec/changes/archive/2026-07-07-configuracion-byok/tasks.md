## 1. Entorno y excepciones

- [x] 1.1 Env: `BYOK_CLAVE_CIFRADO` (64 hex, requerida) y `BYOK_VALIDAR_KEY` (bool, default `true`) en `env.schema`; `AppConfigService.byok`; `.env.example` y la fixture del spec de env actualizados
- [x] 1.2 Excepciones `ApiKeyInvalidaException` (API_KEY_INVALIDA, 422) y `ProveedorNoDisponibleException` (PROVEEDOR_IA_NO_DISPONIBLE, 503) en `dominio.exception.ts`

## 2. Cifrado y validación de la key

- [x] 2.1 `ServicioDeCifrado` (AES-256-GCM, `node:crypto`): `cifrar`/`descifrar` con IV aleatorio + authTag; clave de `BYOK_CLAVE_CIFRADO`
- [x] 2.2 Tests del cifrado: cifrado ≠ plano, round-trip correcto, IV aleatorio, texto manipulado falla la verificación
- [x] 2.3 `ValidadorDeApiKey` (interfaz `validar` → `valida`/`invalida`/`no_disponible`) con adaptadores por proveedor (`fetch` + timeout) y el flag `BYOK_VALIDAR_KEY`
- [x] 2.4 Tests del validador: con el flag en `false` cualquier key no vacía → `valida`; mapeo de estados HTTP (200/401/500/red) → resultado

## 3. Persistencia y catálogo

- [x] 3.1 `CatalogoService.modeloIdsDe(proveedor)`: ids de modelo del proveedor (para validar los modelos por tarea)
- [x] 3.2 Entidad `ConfiguracionByok` (tabla `configuraciones_byok`): `id`, `owner_id` (único, FK a `usuarios` ON DELETE CASCADE), `proveedor`, `modeloScoring`, `modeloVeredicto`, `apiKeyCifrada`, timestamps
- [x] 3.3 Migración de la tabla `configuraciones_byok`; verificado `run`/`revert`/`run` contra PostgreSQL (Docker)

## 4. Configuración BYOK (configuracion-byok)

- [x] 4.1 DTOs con `createZodDto`: `GuardarByokDto` (`proveedor` ∈ enum, `apiKey` ≥1, `modeloScoring`/`modeloVeredicto`); respuesta `ConfiguracionByokDto` (sin key) + mapeador `aConfiguracionDto`
- [x] 4.2 `ConfiguracionService.guardar`: valida modelos (catálogo → 422) → valida key (invalida→422 / no_disponible→503) → cifra → upsert por `owner_id`
- [x] 4.3 `ConfiguracionService.obtener` (404 si no hay; sin key) y `eliminar` (204; 404 si no hay)
- [x] 4.4 Endpoints: `GET`/`PUT`/`DELETE /proveedores/configuracion` — protegidos, `@ApiBearerAuth`
- [x] 4.5 Tests: guardar (modelos válidos → cifra+guarda, sin key en respuesta; modelo fuera de catálogo→422; key invalida→422; no_disponible→503; idempotencia); obtener (sin key, 404 si no hay); eliminar (204, 404 si no hay)

## 5. Cableado y verificación final

- [x] 5.1 Registrar `ConfiguracionByok`, `ConfiguracionController`, `ConfiguracionService`, `ServicioDeCifrado`, `ValidadorDeApiKey` en `ProveedoresModule`
- [x] 5.2 Verificado contra la BD (Docker, `BYOK_VALIDAR_KEY=false`): PUT→GET (apiKeyRegistrada, sin key)→PUT idempotente (una sola config)→DELETE→GET 404; 422 modelo fuera de catálogo / proveedor inválido; 401 sin token; y la key **cifrada** en la tabla (nunca en claro)
- [x] 5.3 `npm run lint` (check) y `npm test` en verde (174 tests; incluye cifrado y validación)
- [x] 5.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos)
