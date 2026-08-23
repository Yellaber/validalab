## Why

Con BYOK (E7) el usuario ya consume IA de su propia cuenta: el scoring y el veredicto gastan tokens. Falta que **vea cuánto** está gastando, sin salir de ValidaLab. E8 (parte de visibilidad, E8a) trae al cliente el costo estimado —total y por idea, con desglose por tarea— y la tabla de precios de referencia.

La regla normativa del SRS (§8.9.1, RNF-17) es central: lo que se muestra es un **estimado del consumo vía ValidaLab, NO el saldo** de la cuenta del proveedor —las API keys de inferencia no exponen el saldo—. Por eso cada vista lo aclara y, para recargar, enlaza al panel de facturación del proveedor.

El backend ya expone estos endpoints (E8 backend). Este change lleva la visibilidad al cliente. Se construye contra `../contrato-api/openapi.yaml` (tag `proveedores`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/costo.model.ts`): `CostoUsuario`, `CostoIdea`, `DesgloseCostoTarea`, `CostoIdeaResumen`, `PrecioModelo`, `Moneda`, `TareaCosto`. Reutiliza `ProveedorId` (E7).
- **Servicio de recurso** (`features/costo/`): `CostoService` con `costoDelUsuario`/`solicitudCostoUsuario`, `costoDeIdea`/`solicitudCostoIdea` y `listarPrecios`/`solicitudPrecios`. Solo lectura; el cliente nunca deriva costos.
- **Costo del usuario** (`/costo`): total estimado, desglose por idea (cada una enlazada a su detalle) y la tabla de precios por modelo como referencia.
- **Costo por idea** (`/ideas/:id/costo`): total y desglose por tarea (`scoring`/`veredicto`) con llamadas, tokens y costo; traduce `403`/`404`.
- **Regla normativa (RNF-17)**: ambas vistas muestran la `aclaracion` de que es un estimado del consumo, no el saldo, y ofrecen el enlace `urlFacturacion` al panel del proveedor para recargar.
- **Rutas y navegación**: una ruta de primer nivel (`/costo`) y una anidada por idea (`/ideas/:id/costo`), ambas diferidas; el shell gana un cuarto dominio de navegación, **Costo**; el detalle de idea gana el acceso a su costo.

**Reutilización**: la plomería HTTP (interceptor de autorización, traducción a `ErrorApi`), `httpResource` y el `CurrencyPipe` de Angular para el formateo monetario. Sin librerías nuevas.

**Fuera de alcance**: la **re-evaluación en lote** (E8b: `GET .../reevaluacion/estimacion`, `POST .../reevaluacion`), que es una acción de mutación con su propia confirmación de costo; se aborda en un change aparte. Cualquier cálculo de costo en el cliente: el cliente **lee** los estimados que produce el servidor.

## Capabilities

### New Capabilities
- `visibilidad-de-costo`: presentación en el cliente del costo estimado del consumo de IA —total del usuario con desglose por idea, costo por idea con desglose por tarea, y la tabla de precios de referencia—, siempre como estimado del consumo (no el saldo, RNF-17) y con el enlace de facturación para recargar.

### Modified Capabilities
- `portafolio-de-ideas`: el detalle de una idea ofrece además el acceso a su **costo estimado**.
- `shell-y-navegacion`: el shell aloja la ruta de primer nivel `costo` y la anidada `costo` de una idea con carga diferida, y ofrece un cuarto dominio de navegación, **Costo**.

## Impact

- **Código**: nuevo árbol `src/app/features/costo/` (servicio, costo del usuario, costo por idea y sus specs). `core/api/` gana `costo.model.ts`. `app.routes.ts` incorpora `/costo` y `/ideas/:id/costo`. El shell gana un enlace de dominio; el detalle de idea, un enlace más.
- **Dependencias**: ninguna nueva.
- **Cierra E8a** (visibilidad de costo). Queda E8b (re-evaluación en lote) como trabajo posterior opcional.
