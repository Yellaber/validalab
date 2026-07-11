## MODIFIED Requirements

### Requirement: Gobierno de ejecución y traza persistida
El sistema SHALL acotar cada ejecución del agente con un límite de iteraciones y un timeout configurables por entorno. El sistema SHALL persistir una traza por CADA ejecución del agente —de cualquier tarea (`scoring` o `veredicto`)— con al menos: idea, entrevista (cuando aplique; el veredicto no la tiene), owner, tarea, modo (`real`/`fake`), proveedor y modelo, estado (`exitosa`/`fallida`), iteraciones, tokens consumidos (cuando el proveedor los reporte), salida y motivo de error. La traza SHALL ser la fuente única, reconstruible, de la trazabilidad (RF-AG-08) y del costo estimado (E8).

#### Scenario: Se persiste la traza de una ejecución exitosa
- **WHEN** el agente completa el scoring de una entrevista
- **THEN** se registra una traza con tarea `scoring`, la idea de la entrevista, estado `exitosa`, proveedor, modelo, iteraciones y (si el proveedor los reporta) los tokens

#### Scenario: Se persiste la traza de un veredicto
- **WHEN** el agente emite un veredicto de una idea
- **THEN** se registra una traza con tarea `veredicto`, la idea, sin entrevista, con proveedor, modelo y los tokens consumidos (cuando el proveedor los reporte)

#### Scenario: El timeout o el límite de iteraciones corta la ejecución
- **WHEN** una ejecución supera el límite de iteraciones o el timeout configurados
- **THEN** la ejecución se detiene, la traza queda `fallida` con el motivo y la entrevista en `estadoScoring` `fallida`
