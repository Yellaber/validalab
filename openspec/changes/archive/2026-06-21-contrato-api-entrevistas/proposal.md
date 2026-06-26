## Why

Con E0–E3 ya definidos en el contrato (cuentas, ideas, hipótesis/umbrales y contactos), el siguiente paso del camino crítico del MVP es **E4 (Pipeline de entrevistas y scoring por IA)**. Las entrevistas son la evidencia central del producto: el usuario registra las respuestas y el **Validador Inteligente las puntúa automáticamente** (rasgo distintivo de ValidaLab). Sin este contrato no existe la captura de evidencia sobre la que se calculan los KPIs (E5) ni el veredicto del agente (E6); además, una entrevista **no puede existir** sin idea y contacto válidos del mismo usuario (RNF-14), invariante que el contrato debe expresar. El `tag` `entrevistas` ya está declarado pero aún sin endpoints.

## What Changes

- **Definir el contrato del guión de entrevista reutilizable** (RF-08, HU-11) bajo el `tag` `entrevistas`, como recurso de nivel de usuario `/guiones` (reutilizable **entre ideas**): CRUD de guiones con sus preguntas ordenadas.
- **Definir el contrato de entrevistas** (RF-09, HU-13) anidado en la idea `/ideas/{id}/entrevistas`: crear (vinculando `contactoId` y `guionId`, con las `respuestas` y `citas`), listar (paginado, con filtros), consultar, editar y eliminar. El `ownerId`/`ideaId` se derivan del path; idea o contacto inválidos/ajenos → `422 ENTREVISTA_SIN_VINCULO` (RNF-14).
- **Modelar el scoring automático del agente** (RF-09b, HU-12) como resultado embebido en la entrevista: al crearla (o al cambiar sus respuestas) se dispara el scoring; la entrevista expone `estadoScoring` (`pendiente`/`puntuada`/`fallida`) y el bloque `score` del agente (`score 0–10`, `justificacion`, `senales`, `confianza 0–100`, con `proveedor`/`modelo`/`rubricaVersion` para trazabilidad). Acción `POST .../puntuar` para (re)disparar el scoring.
- **Modelar el ajuste humano del score** (RF-09c, HU-12b) con la acción `POST .../ajuste-score`: registra `scoreAjustado` + `nota` **conservando ambos valores** (agente y usuario); el ajuste prevalece en el cálculo de KPIs (E5).
- **Modelar las citas textuales** (RF-10, HU-14) como colección embebida en la entrevista (`citas`), capturables al crear y editar.
- **Reflejar efectos de borde declarados en el SRS:** crear una entrevista mueve el contacto a `entrevistado` (camino legítimo que E3 reserva a este endpoint); un contacto ya `entrevistado` o `descartado` → `409 CONFLICTO`.
- **Añadir los schemas de dominio** a `components.schemas` y reutilizar componentes existentes (`bearerAuth`, `Error`/`CodigoError` —incluido `ENTREVISTA_SIN_VINCULO`, ya en el catálogo—, paginación, respuestas compartidas, `idIdea`).

## Capabilities

### New Capabilities
- `entrevistas`: pipeline de entrevistas y scoring por IA (épica E4) — guiones reutilizables, registro de entrevistas vinculadas a idea y contacto con sus respuestas y citas, scoring automático del agente embebido y ajuste humano del score, todo aislado por usuario. La expresión de esta capacidad es el detalle del `tag` `entrevistas` en el contrato de API.

### Modified Capabilities
<!-- Ninguna: E4 introduce la capacidad `entrevistas`; no cambia los requisitos de `usuarios`, `ideas`, `contactos` ni `contrato-api`. El efecto sobre el estado del contacto (`entrevistado`) ya estaba previsto en la spec de `contactos`. -->

## Impact

- **`contrato-api/openapi.yaml`:** se añaden los `paths` `/guiones[...]` y `/ideas/{id}/entrevistas[...]` (con las acciones `/puntuar` y `/ajuste-score`) y sus schemas de dominio bajo el `tag` `entrevistas`. No se tocan otros módulos.
- **Convenciones:** se reutilizan los componentes existentes; este cambio **no** introduce convenciones ni códigos de error nuevos (`ENTREVISTA_SIN_VINCULO` y `SALIDA_AGENTE_INVALIDA` ya están en el catálogo).
- **Equipos:** frontend (editor de guiones, captura de respuestas, vista del score y ajuste, citas) y backend (módulo NestJS `entrevistas` y su integración con el servicio del agente) ya pueden desarrollar E4 contra el contrato.
- **Fuera de alcance:** el **cálculo** de los KPIs y el tablero (E5), el **veredicto** del agente (E6), la configuración BYOK del proveedor/modelo (E7), la **re-evaluación en lote** y el costo estimado (E8) y todo código de runtime (grafo LangGraph, esquemas Zod, persistencia). Este cambio solo define cómo se capturan las entrevistas y cómo se exponen su score y ajuste.
