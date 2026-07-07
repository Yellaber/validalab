## Context

Sobre E0–E4/chunk A. El contrato (tag `entrevistas`) fija la superficie:

- `Entrevista { id, ideaId(readOnly), contactoId, guionId, respuestas[], citas[], estadoScoring, score?(nullable), ajuste?(nullable), fechaCreacion, fechaActualizacion }`.
- `RespuestaEntrevista { preguntaId(uuid), texto }`. `Cita { id(uuid), texto, contexto? }`. `EstadoScoring`: `pendiente|puntuada|fallida`. `AjusteScore { scoreAjustado(0–10), nota, fechaAjuste }`.
- Requests: crear `{ contactoId, guionId, respuestas(≥1), citas? }`; editar `{ respuestas?(≥1), citas? }`; ajuste `{ scoreAjustado(0–10), nota(≥1) }`.

Este chunk es **sin IA**: `score` siempre `null` y `estadoScoring` siempre `pendiente` hasta el chunk C (agente).

## Goals / Non-Goals

**Goals:**
- Registrar entrevistas con vínculo válido (idea+contacto+guión), moviendo el contacto a `entrevistado`.
- CRUD de entrevistas (respuestas/citas) y ajuste manual del score, exactamente como define el contrato.
- Aislamiento anidado por la idea (403/404) y el vínculo (`422 ENTREVISTA_SIN_VINCULO`, RNF-14).

**Non-Goals:**
- Agente / scoring automático / `POST .../puntuar` (chunk C, tras BYOK/E7).
- Tokens/costo/idempotencia del `score` (chunk C / E8).
- Validar que cada `preguntaId` de una respuesta exista en el guión (el contrato no lo exige).

## Decisions

### D1 — Dependencia entre tres módulos
`EntrevistasService` (en `entrevistas/entrevista/`) inyecta: `IdeasService` (`asegurarPropia`, ya exportado por `IdeasModule`), `ContactosService` (validar el contacto de la idea + marcarlo `entrevistado`) y `GuionesService` (validar el guión propio, mismo módulo). `EntrevistasModule` importa `IdeasModule` + `ContactosModule`; `ContactosModule` **exporta** `ContactosService`. Es el patrón exports/imports entre contextos acotados.

### D2 — Validación del vínculo (RNF-14) y transición del contacto
`crear` orquesta en orden:
1. `ideas.asegurarPropia(ownerId, ideaId)` → 403/404 de la idea.
2. `contactos.asegurarVinculoConIdea(ideaId, contactoId)` → si el contacto no existe en esa idea, `EntrevistaSinVinculoException` (422 `ENTREVISTA_SIN_VINCULO`).
3. `guiones.asegurarVinculo(ownerId, guionId)` → si el guión no existe o no es del usuario, `EntrevistaSinVinculoException` (422).
4. Si `contacto.estado ∈ {entrevistado, descartado}` → `ConflictoException` (409).
5. Crear la entrevista (`estadoScoring: 'pendiente'`, `score: null`, `ajuste: null`); citas con `id` generado.
6. `contactos.marcarEntrevistado(contacto)` → fija `estado = 'entrevistado'` (E4 asigna directamente el estado que el embudo manual de E3 no permite).

Se añade `EntrevistaSinVinculoException` a `dominio.exception.ts` (el código `ENTREVISTA_SIN_VINCULO` ya existe en el catálogo, mapeado a 422).

### D3 — Entidad `Entrevista` y colecciones embebidas
Tabla `entrevistas`: `id`, `idea_id` (indexado, FK a `ideas` ON DELETE CASCADE), `contacto_id`, `guion_id`, `respuestas jsonb`, `citas jsonb`, `estado_scoring` (default `pendiente`), `score jsonb?`, `ajuste jsonb?`, timestamps. `respuestas`/`citas`/`score`/`ajuste` son embebidos (jsonb), como el guión: value-objects sin identidad/consulta propia. No se ponen FKs a `contactos`/`guiones` desde columnas para no acoplar el borrado (el vínculo se valida en la app; conservar la entrevista aunque el contacto/guión cambien es deseable para la trazabilidad).

### D4 — Edición y semántica de re-scoring (preparada para C)
`PATCH` reemplaza `respuestas` y/o `citas` si vienen. Cambiar `respuestas` reinicia `estadoScoring` a `pendiente` y limpia `score` (en C esto re-disparará el agente); cambiar solo `citas` no toca el scoring. `ideaId`/`contactoId`/`guionId`/`score` no son editables (el DTO no los admite). Helper `buscarEnIdea(ideaId, idEntrevista)` → 404 si no existe en la idea.

### D5 — Ajuste manual del score
`ajuste-score` fija `ajuste = { scoreAjustado, nota, fechaAjuste: now }` conservando el bloque `score` intacto (en este chunk `null`; el `ajuste` es un valor humano independiente que E5 usará y que prevalece sobre el score). `scoreAjustado` fuera de `0–10` o `nota` vacía → 422 (validado por Zod).

### D6 — DTOs y documentación
DTOs Zod: `CrearEntrevistaDto` (`contactoId`/`guionId` uuid, `respuestas` ≥1 de `{preguntaId uuid, texto}`, `citas?`), `ActualizarEntrevistaDto` (`respuestas?`/`citas?`), `AjustarScoreDto` (`scoreAjustado` 0–10, `nota` ≥1), `IdEntrevistaParamDto`, listado con paginación + `contactoId?`/`estadoScoring?`. Respuestas `EntrevistaRespuestaDto`/`EntrevistasPaginadasDto` en Swagger. `POST .../puntuar` NO se implementa aquí (chunk C).

## Risks / Trade-offs

- **Entrevistas quedan `pendiente` sin scoring hasta el chunk C** → esperado y documentado: el registro y su evidencia se capturan ya; el agente puntúa después.
- **Ajustar un `score` aún `null`** → aceptado: el `ajuste` es un valor humano independiente (RF-09c) que E5 usará; el contrato no exige un score previo.
- **Sin FK de `contacto_id`/`guion_id`** → el vínculo se valida en la app; se evita acoplar el borrado y se preserva la entrevista como evidencia histórica.
- **Migración a mano tras `migration:generate`** → se limpia el ruido y se verifica `run`/`revert`/`run`.

## Migration Plan

1. `EntrevistaSinVinculoException` + métodos de vínculo en `ContactosService`/`GuionesService`; `ContactosModule` exporta `ContactosService`.
2. Tipos Zod (`RespuestaEntrevista`, `Cita`, `EstadoScoring`, `ScoreEntrevista`, `AjusteScore`).
3. Entidad `Entrevista` + migración de la tabla `entrevistas`.
4. DTOs Zod, mapeador `aEntrevistaDto`, `EntrevistasService`, `EntrevistasController`.
5. `EntrevistasModule` importa `IdeasModule` + `ContactosModule`.
6. Verificar contra la BD (Docker): crear (vínculo válido → contacto `entrevistado`; sin vínculo → 422; contacto ya entrevistado → 409)→listar(filtros)→consultar→editar→ajuste→eliminar, con 401/403/404/409/422. Rollback: revertir la migración.

## Open Questions

- **Ninguna abierta.** El scoring y `/puntuar` quedan explícitamente en el chunk C.
