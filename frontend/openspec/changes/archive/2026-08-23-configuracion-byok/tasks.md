## 1. Modelos y servicio

- [x] 1.1 `core/api/proveedor.model.ts`: `ProveedorId`, `ModeloIA`, `ProveedorIA`, `ConfiguracionByok`, `GuardarByokRequest`
- [x] 1.2 `ProveedoresService`: `listar`/`solicitudCatalogo`, `obtener`/`solicitudConfiguracion`, `guardar` (PUT), `eliminar` (DELETE); nunca lee la key de una respuesta
- [x] 1.3 Specs del servicio: rutas/métodos del contrato, guardar envía la apiKey, sin ownerId

## 2. Pantalla de configuración BYOK

- [x] 2.1 `ConfiguracionByokComponent` (`/configuracion`): catálogo + config con `httpResource`; formulario Signal Forms (proveedor, apiKey, modeloScoring, modeloVeredicto)
- [x] 2.2 Modelos dependientes del proveedor elegido; validación local que bloquea el envío; error del catálogo con reintento
- [x] 2.3 La API key nunca se muestra: con config existente prellena todo salvo la key e indica `apiKeyRegistrada`; `404` = sin configurar (no es error)
- [x] 2.4 Guardar (PUT) y revocar (DELETE bajo confirmación); traducir `422 API_KEY_INVALIDA`/`VALIDACION_FALLIDA` y `503`
- [x] 2.5 Specs: opciones del catálogo, prellenado con config, guardar hace PUT, `422` marca el campo, revocar hace DELETE, `404` sin error

## 3. Rutas y navegación

- [x] 3.1 Ruta `/configuracion` de primer nivel con carga diferida en `app.routes.ts`
- [x] 3.2 Tercer dominio de navegación en el shell (**Proveedor de IA**) con `routerLinkActive`

## 4. Verificación

- [x] 4.1 `openspec validate --strict`; `npm run build` OK; `npm test --no-watch` verde
