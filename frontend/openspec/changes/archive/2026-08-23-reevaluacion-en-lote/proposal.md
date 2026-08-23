## Why

Cuando el usuario sube la versión de la rúbrica de scoring, las entrevistas puntuadas con la versión anterior quedan desactualizadas. El backend permite re-puntuarlas en lote (E8b), pero de forma **explícita**: un cambio de rúbrica no dispara nada. Falta la pieza en el cliente para que el usuario vea primero **cuánto costaría** re-evaluar (sin ejecutar) y, si confirma, lo ejecute.

Cierra E8b y, con ello, el frontend cubre el contrato al 100%. Se construye contra `../contrato-api/openapi.yaml` (tag `entrevistas`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/reevaluacion.model.ts`): `EstimacionReevaluacion`, `ReevaluacionLoteRequest`, `ResultadoReevaluacion`. Reutiliza `Moneda` (E8a).
- **Servicio** (`features/ideas/entrevistas/reevaluacion/`): `ReevaluacionService` con `estimar`/`solicitudEstimacion` (GET, sin ejecutar) y `ejecutar` (POST, cuerpo opcional).
- **Pantalla de re-evaluación** (`/ideas/:id/entrevistas/reevaluacion`): muestra la **estimación** (entrevistas afectadas, modelo de scoring, costo y tokens estimados) sin ejecutar, y ofrece **ejecutar** el lote como acción explícita cuando hay afectadas y hay BYOK. Tras ejecutar muestra el resultado real (re-puntuadas, omitidas por idempotencia y costo del lote) y refresca la estimación. Traduce `409` (sin BYOK), `503` (proveedor no disponible) y `403`/`404`.
- **Regla normativa (RNF-17)**: el costo se presenta como estimado del consumo vía ValidaLab, no el saldo, con su `aclaracion`.
- **Navegación**: una ruta anidada protegida con carga diferida (antes de `:idEntrevista`); el listado de entrevistas gana el acceso a la re-evaluación en lote.

**Reutilización**: la plomería HTTP (interceptor de autorización, traducción a `ErrorApi`), `httpResource` y el `CurrencyPipe` de Angular. Sin librerías nuevas.

**Fuera de alcance**: re-evaluar un **subconjunto** elegido a mano de entrevistas (el contrato lo admite vía `idsEntrevistas`, pero la UI arranca con el flujo por defecto —todas las afectadas—); cualquier cálculo de costo en el cliente.

## Capabilities

### New Capabilities
- `reevaluacion-en-lote`: presentación en el cliente de la re-evaluación en lote de las entrevistas de una idea tras un cambio de rúbrica — la estimación de costo sin ejecutar, la ejecución explícita bajo confirmación con su resultado (re-puntuadas, omitidas por idempotencia y costo real), la traducción de `409`/`503`, y la regla de estimado-no-saldo (RNF-17).

### Modified Capabilities
- `registro-de-entrevistas`: el listado de entrevistas de una idea ofrece además el acceso a la **re-evaluación en lote**.
- `shell-y-navegacion`: el shell aloja una ruta anidada más de una idea (la re-evaluación en lote de sus entrevistas) con carga diferida.

## Impact

- **Código**: nuevo árbol `src/app/features/ideas/entrevistas/reevaluacion/` (servicio, componente y sus specs). `core/api/` gana `reevaluacion.model.ts`. `app.routes.ts` incorpora la ruta anidada. El listado de entrevistas gana un enlace más.
- **Dependencias**: ninguna nueva.
- **Cierra E8b** y completa la cobertura del contrato en el frontend.
