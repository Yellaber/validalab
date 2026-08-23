## Why

El scoring de entrevistas (E4) y el veredicto de idea (E6) necesitan un proveedor de IA para funcionar de verdad: hoy, sin configuración, responden `409`. E7 cierra ese hueco en el cliente — el usuario aporta **su propia** cuenta (BYOK): elige proveedor, da su API key y fija dos modelos por tarea (económico para scoring, potente para veredicto).

Es también el requisito con la regla de privacidad más estricta del producto: la API key **se cifra en reposo y nunca se devuelve al frontend** (RNF-07). El cliente la envía al guardar y jamás la vuelve a ver.

El backend ya expone el tag `proveedores` de BYOK (E7 backend, archivado). Este change lo lleva al cliente. Se construye contra `../contrato-api/openapi.yaml` (tag `proveedores`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/proveedor.model.ts`): `ProveedorId` (anthropic/openai/google), `ModeloIA`, `ProveedorIA`, `ConfiguracionByok` (sin la key, con `apiKeyRegistrada`) y `GuardarByokRequest` (con `apiKey` write-only).
- **Servicio de recurso** (`features/proveedores/`): `ProveedoresService` con `listar`/`solicitudCatalogo`, `obtener`/`solicitudConfiguracion`, `guardar` (PUT) y `eliminar` (DELETE). Nunca lee la key de una respuesta.
- **Pantalla de configuración BYOK** (`/configuracion`): consume el catálogo curado, ofrece un formulario (Signal Forms) con proveedor, API key y los dos modelos —cuyas opciones dependen del proveedor elegido—, y guarda con `PUT`. La **API key nunca se muestra**: con config existente se prellenan proveedor y modelos pero el campo de la key queda vacío, indicando que hay una registrada. Traduce `422 API_KEY_INVALIDA` (campo), `422 VALIDACION_FALLIDA` (campo a campo) y `503` (indisponibilidad). Ofrece **revocar** (DELETE) bajo confirmación cuando existe configuración.
- **Rutas y navegación**: una ruta de primer nivel protegida con carga diferida; el shell gana un tercer dominio de navegación, **Proveedor de IA**, junto a Ideas y Guiones.

**Reutilización**: la plomería HTTP (interceptor de autorización, traducción a `ErrorApi`) y los patrones de `httpResource` + Signal Forms del resto del cliente se reutilizan sin reimplementar.

**Fuera de alcance**: el costo estimado y la tabla de precios (E8, tag `proveedores`/`kpis` de costo); la validación real de la key contra el proveedor (ocurre en el backend, el cliente solo traduce su resultado); y cualquier persistencia o descifrado de la key en el cliente — la key vive cifrada en el servidor.

## Capabilities

### New Capabilities
- `configuracion-byok`: configuración en el cliente del proveedor de IA del usuario (BYOK) — catálogo curado de proveedores y modelos, alta/cambio de la configuración con dos modelos por tarea, la garantía de que la API key nunca se revela, la traducción de los errores de validación de la key y del proveedor, y la revocación de la configuración.

### Modified Capabilities
- `shell-y-navegacion`: el shell aloja una ruta de primer nivel más (`configuracion`, BYOK) con carga diferida, y ofrece un tercer dominio de navegación, **Proveedor de IA**, junto a Ideas y Guiones.

## Impact

- **Código**: nuevo árbol `src/app/features/proveedores/` (servicio, configuración y sus specs). `core/api/` gana `proveedor.model.ts`. `app.routes.ts` incorpora la ruta `/configuracion`. El shell gana un enlace de dominio.
- **Dependencias**: ninguna nueva.
- **Cierra E7** y el último *Must* del MVP del frontend; desbloquea que el scoring real y el veredicto dejen de responder `409` sin proveedor.
