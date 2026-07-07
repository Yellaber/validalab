## Why

El scoring del agente (chunk C de E4) necesita saber de qué proveedor y con qué modelo puntuar, y el usuario elige eso al configurar BYOK (E7). Pero antes de que el usuario pueda elegir, hace falta **el catálogo curado de proveedores y modelos** contra el que se valida esa elección. Este change entrega esa base (E7a): `GET /proveedores`, con la lista de modelos como **datos actualizables sin redesplegar** (RNF-18), no un enum cableado.

## What Changes

- **Módulo `proveedores`** (nuevo, RNF-10), estrenado con su sub-dominio `catalogo/` (el siguiente chunk añadirá `configuracion/` con el BYOK).
- **Entidad `ModeloIA`** (TypeORM, tabla `modelos_ia`): `proveedor` (`anthropic`|`openai`|`google`), `modeloId` (cadena, p. ej. `claude-opus-4-8`), `nombre`, `descripcion?`, `orden`. Se **siembra** con un catálogo inicial curado vía migración; es **dato**, actualizable con un UPDATE sin redesplegar (RNF-18).
- **`GET /proveedores`** (autenticado): devuelve los 3 proveedores soportados y, por cada uno, su lista curada de `ModeloIA` (leída de la BD, ordenada). El set de proveedores es fijo (enum del contrato); su nombre visible vive en código; los modelos son datos.

**Fuera de alcance** (chunk siguiente E7b): la configuración BYOK del usuario (`GET/PUT/DELETE /proveedores/configuracion`), el cifrado de la API key y su validación contra el proveedor. **Fuera de E7** (E8): la tabla de precios y el costo estimado.

## Capabilities

### New Capabilities
- `catalogo-de-proveedores`: consulta del catálogo curado de proveedores de IA soportados y sus modelos idóneos (datos actualizables sin redesplegar), que después alimenta el selector y valida la configuración BYOK.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- **Código**: nuevo `src/proveedores/` con el módulo y el sub-dominio `catalogo/` (entidad `ModeloIA`, tipos Zod, service, controller). `AppModule` importa `ProveedoresModule`.
- **Persistencia**: migración de la tabla `modelos_ia` con el **seed** del catálogo inicial (Anthropic/OpenAI/Google).
- **Reutiliza la fundación E0**: DTOs `createZodDto`, sobre `Error`, `JwtAuthGuard` global (requiere token). El catálogo es **global** (curado por administración), no aislado por usuario.
- **Contrato**: implementa `GET /proveedores` del tag `proveedores`. No lo modifica.
- **Sin dependencias nuevas.**
