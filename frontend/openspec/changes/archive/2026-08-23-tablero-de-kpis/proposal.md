## Why

Con E4 cerrada el usuario tiene evidencia: entrevistas registradas y puntuadas. Lo que no tiene es **una lectura de conjunto**. Para saber si una idea va bien tiene que abrir entrevista por entrevista y sumar de cabeza, que es exactamente lo que el método pretende evitar.

E2 le hizo declarar su criterio —umbrales GO y KILL por KPI— antes de mirar ningún dato, precisamente para no moverlo después. Este change es donde ese criterio **se aplica**: el tablero pone cada KPI frente al listón que el propio usuario fijó y lo pinta en su zona de semáforo. Es el momento en que declarar el criterio por adelantado cobra sentido.

También cierra el bucle de la disciplina: las **alertas** avisan cuando un KPI cruza un umbral, para que el usuario se entere de que su idea entró en zona kill sin tener que estar mirando.

Los umbrales no son la decisión —eso lo hará el agente en E6 ponderándolos—, pero sí son el criterio, y hasta ahora el usuario no podía verlo aplicado a nada.

Se construye contra `../contrato-api/openapi.yaml` (tag `kpis`), sin inspeccionar ni depender del código de `backend/`.

## What Changes

- **Modelos del contrato** (`core/api/kpi.model.ts`): `TableroIdea`, `KpiCalculado`, `ResumenTablero`, `ZonaKpi` (4 zonas), `AlertaKpi`, `TipoAlerta` y `ActualizarAlertaRequest`. Los tipos `Kpi`, `KpiGrupo` y `UnidadKpi` **ya existen** en `core/api/umbral.model.ts` desde E2 y se reutilizan.
- **Servicio de recurso** (`features/ideas/tablero/`): `TableroService` con `consultarTablero`, `listarAlertas` (paginado, con filtro por `leida`) y `marcarLeida`. Las alertas **no se crean desde el cliente**: las genera el sistema.
- **Tablero** (`ideas/:id/tablero`): consume `GET /ideas/{id}/kpis` y presenta los KPIs **agrupados por los cuatro grupos** de la sección 7 del SRS, cada uno con su valor, sus umbrales vigentes y su zona de semáforo, más el `resumen` como lectura global.
- **Transparencia del cálculo**: cuando el KPI trae `numerador` y `denominador`, se muestran junto al valor. Es lo que hace auditable el número y lo que sostiene RNF-15 en la interfaz, no solo en el backend.
- **`sin_datos` no es cero**: un KPI sin evidencia suficiente trae `valor` `null` y `zona` `sin_datos`, y se presenta como **falta de evidencia**, nunca como un 0 que parecería un mal resultado.
- **KPIs sin zona kill**: `umbralKill` es anulable, así que el semáforo distingue los KPIs de tres zonas de los de dos, sin inventar un umbral que no existe.
- **Alertas** (`ideas/:id/alertas`): listado paginado con filtro por leídas/no leídas, cada una indicando qué KPI cruzó qué umbral y en qué sentido, con la acción de **marcar como leída**.
- **Rutas y navegación**: dos rutas hijas protegidas con carga diferida; el detalle de la idea gana el acceso a su tablero junto a hipótesis, umbrales, contactos y entrevistas.

**Reutilización de E2**: el nombre y la fórmula de cada KPI, el nombre y el contexto de cada grupo y —sobre todo— el **formateo con la precisión real de cada unidad** salen de los helpers que ya existen (`catalogo-kpi.ts`, `unidad-kpi.ts`). Un mismo KPI debe leerse igual en la pantalla de umbrales y en el tablero; duplicar ese formateo los haría divergir, que es justo el defecto que corrigió el PR #48.

**Fuera de alcance**: el veredicto del agente que pondera estos KPIs (E6); la configuración BYOK (E7); el costo agregado y la re-evaluación en lote (E8); y cualquier cálculo de KPI en el cliente — el tablero **lee** valores calculados por el servidor, no los deriva.

## Capabilities

### New Capabilities
- `tablero-de-kpis`: presentación en el cliente del tablero de decisión de una idea y de sus alertas de cruce de umbral — KPIs calculados agrupados por los cuatro grupos del SRS con su valor, sus umbrales vigentes y su zona de semáforo; resumen global por zonas; transparencia del cálculo mediante numerador y denominador; distinción entre `sin_datos` y cero y entre KPIs con y sin zona kill; y listado paginado de alertas con filtro por leídas y la acción de marcarlas.

### Modified Capabilities
- `portafolio-de-ideas`: el detalle de una idea ofrece además el acceso a su **tablero de KPIs**, junto a los de hipótesis, umbrales, contactos y entrevistas.
- `shell-y-navegacion`: el shell aloja dos rutas hijas protegidas más del dominio `ideas` (tablero y alertas de una idea) con carga diferida.

## Impact

- **Código**: nuevo árbol `src/app/features/ideas/tablero/` (servicio, tablero, alertas y sus specs). `core/api/` gana `kpi.model.ts`. `app.routes.ts` incorpora las dos rutas. El detalle de idea gana un enlace más.
- **Dependencias**: ninguna nueva. El semáforo se resuelve con CSS, sin librería de gráficos.
- **Contrato**: consume las tres operaciones del tag `kpis`; **no** lo modifica.
- **Reutilización dentro de `ideas/`**: el tablero importa los helpers de presentación de KPI que E2 dejó en `umbrales/`. Es la primera vez que se comparten entre dos sub-features del mismo dominio; la decisión sobre si merecen casa propia se toma en el diseño.
- **Aislamiento multi-tenant**: el `ideaId` viaja siempre en el path; el cliente nunca envía `ownerId`. El único cuerpo que envía es `{ leida }` al marcar una alerta.
- **Aguas abajo**: este tablero es lo que el agente pondera en E6 para emitir su veredicto, y el `snapshot` de KPIs que ese veredicto conserva sale de aquí.
- **Zoneless**: todo el estado que la vista lee es signal; marcar una alerta refresca recargando el recurso.
