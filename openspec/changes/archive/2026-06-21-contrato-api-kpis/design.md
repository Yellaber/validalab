## Context

El contrato ya tiene `usuarios` (E0), `ideas` (E1+E2, con el catálogo `Kpi`, `KpiGrupo`, `UnidadKpi` y el `Umbral` editable por idea), `contactos` (E3) y `entrevistas` con scoring (E4). Este cambio introduce el módulo **`kpis`** (épica E5, *KPIs y tablero de decisión*). El SRS §7 define 14 KPIs en cuatro grupos (outreach, calidad, señal de problema, señal de mercado/pago), cada uno con fórmula y umbrales go/kill por defecto editables por idea. E5 **consolida las entrevistas en valores** y los contrasta contra los umbrales en un tablero con semáforo (RF-11/12, HU-15/16), y notifica los cruces de umbral con alertas (RF-13, HU-17). El **veredicto** del agente (E6) consumirá un *snapshot* de estos KPIs, pero queda fuera de E5.

## Goals / Non-Goals

**Goals:**
- Exponer en el contrato el conjunto de KPIs **calculados** por idea, con su valor y su semáforo contra los umbrales vigentes.
- Hacer el tablero autocontenido (cada KPI trae sus umbrales y su zona) para que el frontend pinte el semáforo con una sola llamada.
- Exponer las alertas de cruce de umbral, generadas por el sistema, con marcado de leídas.
- Reutilizar el catálogo `Kpi`/`KpiGrupo`/`UnidadKpi` y el `Umbral` de E2; no duplicarlos.
- Mantener el contrato como un único documento.

**Non-Goals:**
- **No** se definen las **fórmulas** ni los **valores por defecto** de cada KPI en el contrato: viven en el dominio (SRS §7); el contrato solo expone el resultado.
- **No** se modela el veredicto del agente ni el *snapshot* que consume (E6).
- **No** código de runtime (cálculo, recálculo, generación de alertas, persistencia).

## Decisions

### Decisión 1: El tablero se lee, no se recalcula explícitamente
- `GET /ideas/{id}/kpis` devuelve el `TableroIdea` con los KPIs calculados al momento (los KPIs son reconstruibles desde las entrevistas, RNF-15, y el refresco es < 1 s para 200 entrevistas, RNF-02).
- **Por qué no hay endpoint de recálculo:** el recálculo es automático tras los cambios en entrevistas (E4) y barato; exponer un `POST .../recalcular` sería redundante. El *snapshot* congelado lo toma el agente al emitir veredicto (E6), no E5.
- **Por qué un solo `GET` que trae todo el catálogo:** HU-16 pide ver "de inmediato dónde está cada señal"; devolver el conjunto completo (un `KpiCalculado` por KPI) con sus umbrales y zona evita múltiples llamadas y deja el tablero autocontenido.

### Decisión 2: El semáforo es una `zona` calculada por el servidor
- Cada `KpiCalculado` trae `zona` ∈ `go` | `observacion` | `kill` | `sin_datos`, derivada de comparar `valor` con `umbralGo`/`umbralKill`.
- **Por qué el servidor calcula la zona y no el cliente:** la regla de comparación (incluido el caso de KPIs sin zona kill y el de "sin evidencia") es lógica de dominio; centralizarla evita que frontend y backend diverjan. El frontend solo mapea `zona`→color.
- `sin_datos` cubre el caso de denominador cero o evidencia insuficiente (`valor` = `null`): un cuarto estado de semáforo (gris) explícito en vez de inventar un color en el cliente.
- Para KPIs sin zona kill (`volumen_evidencia`, `densidad_citas`), la `zona` nunca es `kill` (coherente con su `umbralKill` `null` de E2).

### Decisión 3: KPI calculado autocontenido y transparente
- `KpiCalculado`: `kpi` (`Kpi`), `grupo` (`KpiGrupo`), `unidad` (`UnidadKpi`), `valor` (number, nullable), `numerador`/`denominador` (number, nullable), `umbralGo` (number), `umbralKill` (number, nullable), `zona` (`ZonaKpi`).
- **Por qué incluir `numerador`/`denominador`:** transparencia y reconstruibilidad (RNF-15): el tablero puede mostrar "25% (3/12)". Son nullable porque no aplican a los KPIs de conteo (`volumen_evidencia`, `velocidad_pipeline`), donde `valor` es el conteo y num/den van `null`.
- **Por qué denormalizar los umbrales en el tablero:** el semáforo necesita el umbral junto al valor; repetirlo en cada `KpiCalculado` evita una segunda llamada a `GET /ideas/{id}/umbrales`.
- `TableroIdea`: `ideaId`, `fechaCalculo`, `resumen` (`ResumenTablero` con el conteo por zona) y `kpis` (`KpiCalculado[]`). El `resumen` apoya HU-16 (ver el estado global de un vistazo).

### Decisión 4: Alertas generadas por el sistema, anidadas en la idea
- `GET /ideas/{id}/alertas` (paginado, filtro `leida`) y `PATCH /ideas/{id}/alertas/{idAlerta}` para marcar leída.
- **Por qué no hay `POST` de alertas:** las alertas las **genera el sistema** cuando un KPI cruza un umbral (RF-13), no el cliente; el contrato solo permite listarlas y marcarlas leídas.
- **Por qué `PATCH` y no una acción `/leer`:** marcar leída es una actualización de un campo booleano acotado; un `PATCH` con `leida` basta y evita multiplicar endpoints.
- `AlertaKpi`: `id`, `ideaId` (solo lectura), `kpi`, `tipo` (`TipoAlerta` = `go` | `kill`), `valor`, `umbral`, `fecha`, `leida`. `TipoAlerta` distingue el cruce hacia zona go (oportunidad) del cruce hacia kill (riesgo).
- **Por qué alertas por idea y no globales:** HU-17 las usa "para saber cuándo conviene invocar al agente" sobre una idea concreta; anidar refuerza el aislamiento por `ownerId` de la idea, como el resto de E2–E4.

### Decisión 5: Aislamiento y reutilización
- Toda ruta `/ideas/{id}/...` ajena → `403 ACCESO_DENEGADO`; idea/alerta inexistente → `404 RECURSO_NO_ENCONTRADO`; sin token → `401 NO_AUTENTICADO`.
- Se reutilizan los enums `Kpi`/`KpiGrupo`/`UnidadKpi` de E2 y las `responses` compartidas; no se añaden códigos de error nuevos.

## Risks / Trade-offs

- **[Tablero calculado en cada `GET`]** Si el cálculo fuera costoso, leer repetidamente penalizaría. → Aceptado: RNF-02 acota el cálculo a < 1 s para 200 entrevistas; el backend puede cachear el snapshot y recalcular ante cambios. El contrato no obliga a una estrategia concreta.
- **[`numerador`/`denominador` nullable por tipo de KPI]** Mezcla KPIs de ratio y de conteo en un mismo schema. → Aceptado: un solo `KpiCalculado` mantiene el tablero homogéneo; la `unidad` indica cómo interpretar el `valor` y si num/den aplican.
- **[Alertas como recurso simple]** No se modela canal de entrega (email/push) ni preferencias. → Aceptado: RF-13 es *Should*; el contrato cubre listar y marcar leída, suficiente para el panel de alertas del MVP. Entregas externas quedan fuera de alcance.

## Open Questions

- Ninguna pendiente. Resueltas: el tablero se **lee** (sin recálculo explícito); el **semáforo** lo calcula el servidor como `zona` con un estado `sin_datos`; el KPI calculado es **autocontenido** (umbrales denormalizados); las alertas se **generan por el sistema**, se listan paginadas y se marcan leídas con `PATCH`.
