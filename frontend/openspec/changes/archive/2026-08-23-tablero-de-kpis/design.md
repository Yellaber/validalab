## Context

E5 es la primera pantalla del cliente que **no gestiona un recurso**: no crea, no edita, no borra. Lee un cálculo del servidor y lo presenta. Eso cambia el centro de gravedad del diseño — aquí casi todo el criterio está en *cómo se muestra*, no en qué se envía.

Cuatro hechos del contrato mandan:

- **`KpiCalculado` es autocontenido.** Trae `umbralGo`, `umbralKill` y `zona` junto al valor, así que el tablero pinta el semáforo **sin llamar a umbrales**. El servidor ya resolvió la comparación.
- **`valor` puede ser `null` con `zona` `sin_datos`.** No hay evidencia suficiente (denominador cero). Es un estado distinto de «vale cero».
- **`umbralKill` es anulable.** Hay KPIs sin zona kill: su semáforo tiene dos zonas, no tres. E2 ya se topó con esto.
- **Las alertas las genera el sistema.** El cliente solo puede listarlas y marcarlas leídas; no hay POST.

Y un quinto hecho, del propio repo: **E2 ya resolvió cómo se lee un KPI**. Nombre, fórmula, grupo y el formateo con la precisión real de cada unidad viven en `features/ideas/umbrales/`. El PR #48 existió precisamente porque ese formateo estaba mal; repetirlo aquí sería reintroducir el defecto por otra puerta.

## Goals / Non-Goals

**Goals:**
- Dar una lectura de conjunto: en qué zona está cada KPI y cómo va la idea en global.
- Hacer el número **auditable**, no solo visible.
- Distinguir con claridad tres cosas que se confunden fácil: `sin_datos`, cero, y KPI sin zona kill.
- Leer cada KPI **exactamente igual** que la pantalla de umbrales.
- Cerrar el bucle con las alertas: enterarse sin tener que mirar.

**Non-Goals:**
- Calcular ningún KPI en el cliente. El tablero lee lo que el servidor calculó (RNF-15: la verdad se reconstruye desde las entrevistas, en el backend).
- Gráficos de evolución temporal: el contrato devuelve una foto, no una serie.
- Editar umbrales desde el tablero. Eso es E2 y tiene su pantalla; mezclarlo invitaría a mover el listón al ver el resultado, que es justo lo que el método prohíbe.
- Emitir o insinuar un veredicto. El tablero muestra el criterio aplicado; ponderarlo es del agente en E6.
- Crear o borrar alertas.

## Decisions

### D1 — El tablero no recalcula nada, y eso se nota en el código
`zona` viene del servidor. El cliente **no** compara `valor` con `umbralGo` para decidir el color: usa la `zona` que le dan. Duplicar esa comparación crearía una segunda fuente de verdad que podría discrepar del backend —y del snapshot que E6 guardará— por un redondeo.

Es una decisión de una línea con consecuencias: el semáforo se resuelve mapeando `zona → clase CSS`, sin aritmética.

### D2 — Se reutilizan los helpers de KPI de E2, sin moverlos todavía
El tablero importa `nombreKpi`, `formulaKpi`, `nombreGrupo`, `ORDEN_GRUPOS` y el formateo de `unidad-kpi.ts` desde `features/ideas/umbrales/`. Los **tipos** (`Kpi`, `KpiGrupo`, `UnidadKpi`) ya están en `core/api/umbral.model.ts`, así que lo compartido son solo helpers de presentación.

No se mueven a una casa propia **por ahora**, y conviene decir por qué: ambos consumidores viven bajo `features/ideas/`, el import es de hermano a hermano y no cruza dominios. Moverlos ahora repetiría la churn del cambio de `ideas.css`, esta vez sin la necesidad que lo forzó (allí un consumidor **fuera** del árbol no tenía alternativa).

**El disparador queda escrito**: en cuanto aparezca un tercer consumidor —E6 mostrará `justificacionPorKPI` y necesitará `nombreKpi`— o uno fuera de `features/ideas/`, estos helpers se mueven a casa propia. Anotarlo aquí evita que la decisión se tome por inercia.

Lo que **no** se hace bajo ningún concepto es duplicar el formateo. Que el mismo KPI se lea distinto en umbrales y en el tablero es exactamente el defecto que corrigió #48.

### D3 — `sin_datos` se presenta como falta de evidencia, nunca como cero
Un KPI con `valor: null` y `zona: 'sin_datos'` significa «todavía no hay entrevistas suficientes para calcular esto». Pintar un `0` sería peor que no mostrar nada: parecería un resultado pésimo y empujaría a decisiones equivocadas sobre una idea que sencillamente no se ha explorado aún.

La vista lo dice con palabras («sin evidencia suficiente») y con un tratamiento visual **neutro**, fuera de la escala del semáforo. Y el `resumen` cuenta esos KPIs aparte (`sinDatos`), no los reparte entre las otras zonas.

### D4 — Numerador y denominador se muestran cuando existen
El contrato los marca «para transparencia» y son anulables (`null` en KPIs de conteo). Mostrar «30 % (12/40)» convierte un número opaco en uno verificable: el usuario puede contrastar el 40 con sus contactos.

Es la expresión en interfaz de RNF-15. Cuando no vienen, se omiten sin dejar hueco.

### D5 — El semáforo distingue KPIs de tres zonas y de dos
Con `umbralKill` nulo, el KPI no tiene zona kill: la escala es `observacion → go`. La vista no inventa un umbral ni pinta una zona roja vacía; muestra solo el umbral GO y explica que ese KPI no tiene listón de descarte.

Es el mismo matiz que E2 tuvo que aprender, y el motivo de que los umbrales se muestren siempre junto al valor: sin ellos, saber en qué zona está uno no dice **cuánto falta** para salir de ella.

### D6 — Los KPIs se agrupan por los cuatro grupos del SRS, en orden estable
La respuesta trae los KPIs planos con su `grupo`. La vista los agrupa usando `ORDEN_GRUPOS` de E2, que ya fija el orden del catálogo, y muestra el contexto de cada grupo.

Los cuatro grupos no son decoración: separan alcance (¿llego a la gente?) de calidad del descubrimiento (¿pregunto bien?) y de señal (¿lo que me dicen confirma el problema y el pago?). Un tablero plano de doce números perdería esa lectura.

Los grupos que el contrato devuelva y no estén en el catálogo local se muestran igualmente, degradando a la clave cruda, como ya hace E2 (`nombreGrupo`).

### D7 — El resumen se muestra, no se calcula
`ResumenTablero` viene del servidor con el conteo por zona. El cliente lo pinta tal cual en vez de contar los KPIs por su cuenta: misma razón que D1, evitar una segunda aritmética que pueda discrepar.

### D8 — Las alertas viven en su propia ruta, no dentro del tablero
Son dos lecturas distintas: el tablero es **el estado actual**, las alertas son **los cruces ocurridos**. Mezclarlas en una pantalla haría que el historial compitiera con la foto.

El listado ofrece el filtro por `leida` del contrato, marcar como leída con `PATCH { leida: true }`, y muestra de cada alerta el KPI, el sentido del cruce (`go`/`kill`), el valor que lo disparó y el umbral cruzado. El valor y el umbral se formatean con los mismos helpers que el tablero, por coherencia.

**Hueco del contrato:** `AlertaKpi` **no trae la `unidad`** del KPI, a diferencia de `KpiCalculado`. Sin ella, una alerta mostraría «0.05» donde el tablero muestra «5 %» — la misma incoherencia que corrigió el PR #48, esta vez entre dos pantallas nuevas.

Se resuelve pidiendo también el tablero de la idea y construyendo un mapa `kpi → unidad`: una petición extra, pero **autoritativa**. La alternativa —deducir la unidad del nombre del KPI— se descarta explícitamente porque reintroduciría el conocimiento local que E2 evitó a propósito (su catálogo declara que la correspondencia KPI→unidad se lee siempre de la respuesta del contrato) y se rompería con el primer KPI nuevo. Si en el futuro `AlertaKpi` incorporase `unidad`, esta petición extra desaparece.

### D9 — Marcar una alerta refresca recargando, sin estado optimista
Tras el `PATCH` se recarga el recurso en vez de mutar la fila en memoria. Es el patrón del resto del cliente, y aquí además importa que el filtro por `leida` pueda estar activo: con actualización optimista la fila desaparecería o no según el filtro, y habría que replicar esa lógica en cliente.

### D10 — Modelos a mano en `core/api/kpi.model.ts`
`ZonaKpi` y `TipoAlerta` como arreglos `const` con tipo derivado, para iterarlos con orden estable en filtros y leyendas. Se importan `Kpi`, `KpiGrupo` y `UnidadKpi` de `umbral.model.ts` en vez de redeclararlos: el catálogo de KPIs es uno solo.

## Risks / Trade-offs

- **Los helpers de KPI se importan de una sub-feature hermana** → un import `../umbrales/catalogo-kpi` desde `tablero/` lee raro. Se acepta para no repetir churn, con el disparador de D2 escrito. El coste de equivocarse es bajo: mover dos ficheros y ajustar imports.
- **El cliente confía en la `zona` del servidor** → si el backend la calculara mal, el tablero mostraría mal el semáforo sin detectarlo. Es deliberado: la alternativa —comparar por nuestra cuenta— crea dos verdades y esconde el fallo en vez de exponerlo. La verdad de los KPIs es del servidor por RNF-15.
- **Una foto sin historia** → el contrato devuelve el estado actual, así que el tablero no puede mostrar si un KPI mejora o empeora. Las alertas cubren parcialmente el hueco al registrar los cruces. Si hiciera falta la serie, es una petición de cambio al contrato.
- **Doce KPIs en pantalla es mucha información** → mitigación: la agrupación de D6, el resumen arriba como lectura de un vistazo, y el semáforo para poder escanear sin leer cifras.
- **`sin_datos` puede leerse como error** → mitigación: el texto dice que falta evidencia, no que algo haya fallado, y el estado visual es neutro en vez de rojo o de aviso.

## Open Questions

Ninguna. El contrato define las tres operaciones y todos los esquemas de E5 por completo.
