## Why

Con E0–E5 ya definidos (cuentas, ideas, hipótesis/umbrales, contactos, entrevistas con scoring y KPIs/tablero), el siguiente paso del camino crítico del MVP es **E6 (Validador Inteligente — veredicto de idea)**. Es el cierre del ciclo de validación y el rasgo distintivo del producto: a solicitud del usuario, el agente analiza el snapshot de KPIs de una idea y emite un veredicto razonado **go/pivote/kill** con justificación KPI por KPI y nivel de confianza; el humano lo verifica y la idea solo cambia de estado tras su aprobación (modo consultivo). El `tag` `agente` ya está declarado pero aún sin endpoints. Sin este contrato no existe la invocación al agente, ni el gobierno de verificación, ni el historial de veredictos.

## What Changes

- **Definir la invocación al agente** (RF-14, HU-18) bajo el `tag` `agente`, anidada en la idea: `POST /ideas/{id}/veredictos` emite un veredicto sobre la idea propia analizando sus KPIs vigentes. Sin cuerpo: el proveedor/modelo provienen de la config BYOK del usuario (E7).
- **Modelar la salida del veredicto** (RF-15, HU-19, SRS §8.5): `veredicto` (`go`|`pivote`|`kill`), `confianza` (0–100), `justificacionPorKPI[]` (lectura del agente por cada KPI relevante) y `recomendaciones[]`.
- **Modelar el snapshot de reproducibilidad** (RNF-09, SRS §8.7): cada veredicto conserva el `proveedor`, el `modelo` y el `snapshotKpis` (los `KpiCalculado` sobre los que se emitió), para ser auditable y reproducible.
- **Definir el gobierno de verificación humana** (RF-16, HU-20, SRS §8.6): `POST /ideas/{id}/veredictos/{idVeredicto}/verificacion` permite **aprobar** (el veredicto queda firme y la idea cambia de estado a `go`/`pivote`/`kill`) o **anular** (con una `nota` obligatoria). Se conservan ambas versiones: la del agente y la verificación del usuario.
- **Definir el historial de veredictos** (RF-17, HU-21): `GET /ideas/{id}/veredictos` (paginado) y `GET /ideas/{id}/veredictos/{idVeredicto}`.
- **Añadir los schemas de dominio** a `components.schemas`: `TipoVeredicto`, `EstadoVeredicto`, `JustificacionKpi`, `VerificacionVeredicto`, `Veredicto`, `VerificarVeredictoRequest`, `VeredictosPaginados`; el parámetro `idVeredicto`; y dos `responses` reutilizables para los códigos del agente ya existentes en el catálogo (`502 SALIDA_AGENTE_INVALIDA`, `503 PROVEEDOR_IA_NO_DISPONIBLE`).
- **Reflejar el aislamiento y los modos de fallo del agente:** idea ajena → `403`; sin proveedor BYOK configurado → `409 CONFLICTO`; salida del agente inválida tras reintentos → `502 SALIDA_AGENTE_INVALIDA`; proveedor no disponible → `503 PROVEEDOR_IA_NO_DISPONIBLE`.

## Capabilities

### New Capabilities
- `agente`: Validador Inteligente — veredicto de idea (épica E6). Invocación del agente sobre una idea, emisión del veredicto razonado con snapshot reproducible, gobierno de verificación humana (aprobar/anular) e historial de veredictos, todo aislado por usuario y en modo consultivo. La expresión de esta capacidad es el detalle del `tag` `agente` en el contrato de API.

### Modified Capabilities
<!-- Ninguna en spec: E6 introduce la capacidad `agente` y reutiliza `KpiCalculado` de `kpis` (E5). El paso de la idea a `go`/`pivote`/`kill` ya estaba reservado por `ideas` (E1) al veredicto aprobado; no cambia su requisito. -->

## Impact

- **`contrato-api/openapi.yaml`:** se añaden los `paths` `/ideas/{id}/veredictos[...]` (con la acción `/verificacion`), sus schemas de dominio y dos `responses` (`SalidaAgenteInvalida`, `ProveedorNoDisponible`) bajo el `tag` `agente`. No se tocan otros módulos.
- **Convenciones:** **no** se introducen códigos de error nuevos (`SALIDA_AGENTE_INVALIDA` y `PROVEEDOR_IA_NO_DISPONIBLE` ya están en el catálogo `CodigoError`); solo se añaden envoltorios `responses` reutilizables para ellos.
- **Equipos:** frontend (botón de invocar, vista del veredicto con justificación KPI por KPI, flujo de aprobar/anular, historial) y backend (módulo NestJS `agente` con el grafo LangGraph) ya pueden desarrollar E6 contra el contrato.
- **Fuera de alcance:** la **config BYOK** del proveedor/modelo (E7) —de la que depende la invocación—, el **costo estimado** y la re-evaluación en lote (E8), la **exportación** del resumen de validación (HU-22, *Could*) y todo código de runtime (grafo LangGraph, tools, esquemas Zod, persistencia de ejecuciones). Este cambio solo define cómo se invoca, se expone y se verifica el veredicto.
