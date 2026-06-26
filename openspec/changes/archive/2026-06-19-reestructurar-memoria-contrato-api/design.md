## Context

El monorepo `validalab/` tiene dos paquetes andamiados (`frontend/` Angular, `backend/` NestJS) que deben evolucionar **sin conocerse entre sí**. `CLAUDE.md` en la raíz es la memoria/fuente de verdad que ambos consultan. Falta un **contrato de API** que sea el punto de acuerdo entre cliente y servidor.

El riesgo identificado en el `proposal.md` es que, si el contrato completo se embebe en `CLAUDE.md`, la memoria crece sin control conforme aparecen endpoints (ValidaLab cubre 7 módulos de dominio: `usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`), degradando su utilidad como contexto. El reto de diseño es mantener la consulta **integral** (un solo punto de entrada que lo enlaza todo) sin inflar la memoria, y sin romper el flujo de los dos equipos.

## Goals / Non-Goals

**Goals:**
- Definir **dónde** y **en qué formato** vive el contrato de API canónico.
- Mantener `CLAUDE.md` **acotado y estable**: solo índice navegable + resumen de convenciones transversales.
- Garantizar consulta **integral**: desde `CLAUDE.md` se llega a todo el detalle por enlaces.
- Que frontend y backend desarrollen contra el mismo contrato sin acoplarse entre sí.

**Non-Goals:**
- **No** se define la descripción del proyecto ni versionamiento de proyecto/API (excluido a pedido del usuario).
- **No** se escriben los endpoints concretos del contrato en este cambio; aquí se establece la **estructura y las reglas** del contrato. El llenado endpoint-por-endpoint es trabajo posterior.
- **No** se genera código cliente/servidor a partir del OpenAPI en este cambio.

## Decisions

### Decisión 1: El contrato vive fuera de `CLAUDE.md`, en una ubicación canónica única
Se crea `contrato-api/` en la **raíz del monorepo** (hermano de `frontend/` y `backend/`), accesible por ambos paquetes sin que ninguno dependa del otro.

- **Por qué la raíz y no dentro de un paquete:** ubicarlo en `backend/` o `frontend/` daría propiedad a un equipo y crearía acoplamiento. La raíz es territorio neutral que ambos consumen.
- **Alternativa considerada — todo en `CLAUDE.md`:** descartada, es exactamente el problema de crecimiento que motiva el cambio.
- **Alternativa considerada — duplicar el contrato en cada paquete:** descartada, las copias divergen.

### Decisión 2: Documento OpenAPI único como contrato vinculante (resuelve la pregunta abierta 1)
El contrato es **un solo documento OpenAPI** (`contrato-api/openapi.yaml`), **no** dividido en ficheros por módulo. Es la referencia normativa: precisa, validable, base para tooling futuro (generación de tipos, mocks, validación de contrato).

- **Por qué único y no fragmentado:** decisión explícita del usuario. Un solo documento evita la sincronización entre fragmentos y mantiene una única verdad literal. La navegabilidad por dominio se resuelve con `tags`, no partiendo el archivo.
- **Por qué un solo formato (sin fichas Markdown por módulo):** se descartan las fichas explicativas por módulo para no reintroducir fragmentación; el contexto de dominio en español se mantiene mediante `description` en el propio OpenAPI.
- **Alternativa considerada — varios YAML con `$ref` por módulo:** descartada por la decisión de contrato único.

### Decisión 3: Organización interna por `tags` de dominio
Dentro del documento único, los endpoints se agrupan con `tags` OpenAPI por los 7 módulos del backend (`usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`).

- **Por qué:** alinea el contrato con la arquitectura modular por dominio del backend (RNF-10) y permite navegarlo por dominio **sin** fragmentar el archivo. Cualquier visor OpenAPI agrupa por `tag`.

### Decisión 4: `CLAUDE.md` = índice + resumen normativo de convenciones (estrategia anti-bloat, resuelve la pregunta abierta 2)
`CLAUDE.md` retiene solo lo **estable y de consulta frecuente**:
- Un **índice del contrato**: enlace al documento OpenAPI único.
- El **resumen normativo** de cada convención transversal: autenticación, aislamiento multi-tenant por `owner_id`, formato estándar de error, paginación y convención de nombres — cada una en pocas líneas (la regla, no el detalle).

El **detalle extenso** (catálogo completo de códigos de error, esquemas concretos, endpoint-por-endpoint) vive en el documento OpenAPI (**Opción A** elegida por el usuario).

- **Por qué funciona contra el bloat:** lo que cambia con cada endpoint —y los catálogos largos— viven en el OpenAPI; `CLAUDE.md` solo cambia cuando cambia una *regla* transversal o el índice (raro). Crece lento.
- **Por qué sigue siendo integral:** `CLAUDE.md` es el único punto de entrada y enlaza todo; seguir el índice alcanza el detalle completo. La integralidad la da la navegabilidad, no la concentración física del texto.

### Decisión 5: Los `CLAUDE.md` de paquete referencian, no duplican
`frontend/CLAUDE.md` y `backend/CLAUDE.md` apuntan al contrato canónico y al `CLAUDE.md` de la raíz. No contienen copia del contrato.

## Risks / Trade-offs

- **[Doble salto al consultar]** El detalle ya no está en la memoria, hay que seguir un enlace al OpenAPI. → Aceptable: es el costo de mantener la memoria acotada; el índice hace el salto barato y directo.
- **[El documento OpenAPI único crece mucho]** Al no fragmentarse, el archivo puede volverse grande. → Mitigado por los `tags` (navegación por dominio) y por herramientas de visualización OpenAPI; no afecta a `CLAUDE.md`, que es lo que se quiere proteger.
- **[Sincronización del enlace del índice]** Si se mueve/renombra el OpenAPI, el índice de `CLAUDE.md` queda obsoleto. → Es un único enlace en un único lugar; trivial de mantener.
- **[Resúmenes que se vuelven detalle]** Si los resúmenes de convenciones en `CLAUDE.md` empiezan a crecer, vuelve el bloat. → Regla firme: en `CLAUDE.md` solo la regla en pocas líneas; el detalle siempre al OpenAPI.

## Migration Plan

1. Crear `contrato-api/openapi.yaml` (esqueleto único) con los 7 `tags` de dominio y los componentes reutilizables de las convenciones transversales (security schemes, esquema de error con su catálogo, parámetros de paginación).
2. Reestructurar `CLAUDE.md` de la raíz: añadir el bloque "Contrato de API" con el índice (enlace al OpenAPI) + el resumen normativo de las convenciones transversales.
3. Actualizar `frontend/CLAUDE.md` y `backend/CLAUDE.md` para referenciar el contrato y la raíz, eliminando cualquier descripción de API duplicada.
4. (Rollback) El cambio es documental/estructural: revertir es restaurar los `CLAUDE.md` previos y eliminar `contrato-api/`.

## Open Questions

- Ninguna pendiente. Las dos preguntas abiertas se resolvieron: (1) contrato **único**, no fragmentado por módulos; (2) **Opción A** — resumen normativo de convenciones en `CLAUDE.md`, detalle extenso (incl. catálogo de errores) en el documento OpenAPI.
