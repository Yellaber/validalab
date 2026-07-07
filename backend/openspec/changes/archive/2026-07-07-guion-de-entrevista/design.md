## Context

Sobre E0–E3. El contrato (tag `entrevistas`, recurso `/guiones`) fija la superficie:

- `Guion { id, ownerId(readOnly), nombre, descripcion?, preguntas[], fechaCreacion, fechaActualizacion }`.
- `Pregunta { id(uuid), orden(int ≥1), texto }`; `PreguntaRequest { orden(≥1), texto(≥1) }` (sin `id`).
- Requests: crear `{ nombre(≥1), descripcion?, preguntas(≥1) }`; editar (PATCH) `{ nombre?, descripcion?, preguntas? }` (reemplaza el conjunto).

El guión es un recurso **de nivel de usuario** (no cuelga de una idea): reutilizable entre ideas, aislado por `owner_id`.

## Goals / Non-Goals

**Goals:**
- CRUD del guión reutilizable exactamente como define el contrato, con preguntas ordenadas.
- Aislamiento por `owner_id` (guión ajeno → 403, inexistente → 404), como el resto del backend.
- Dejar el módulo `entrevistas` estrenado para que el chunk B (registro de entrevistas) añada su sub-dominio sin refactor.

**Non-Goals:**
- Registrar entrevistas ni vincularlas al guión (chunk B).
- Scoring por IA / agente (chunk C, tras BYOK/E7).

## Decisions

### D1 — Módulo `entrevistas` con sub-dominio `guion/`
Se crea `src/entrevistas/` (módulo del contexto acotado `entrevistas`, RNF-10). Como este contexto tendrá **dos** sub-dominios (guión y entrevista), se aplica desde ya la convención de organización por sub-dominio: `entrevistas.module.ts` en la raíz y los archivos del guión en `entrevistas/guion/`. El chunk B añadirá `entrevistas/entrevista/` sin mover nada.

### D2 — `preguntas` como jsonb embebido
Las preguntas son value-objects ordenados **sin identidad ni ciclo de vida propios**: solo existen dentro del guión y siempre se leen/escriben con él (el PATCH reemplaza el conjunto completo). Se persisten como columna **jsonb** `preguntas` (`{id, orden, texto}[]`), no como tabla aparte con FK/cascade. Ventajas: el agregado `Guion` es atómico, sin joins ni orphan-removal; el reemplazo en el PATCH es una simple asignación. El `id` de cada pregunta se genera en la app (`crypto.randomUUID()`). El mapeador ordena por `orden` ascendente para garantizar salida ordenada.

### D3 — Entidad `Guion` y aislamiento por owner
Tabla `guiones`: `id uuid`, `owner_id uuid` (indexado, FK a `usuarios` ON DELETE CASCADE), `nombre`, `descripcion?`, `preguntas jsonb`, timestamps. Helper `buscarPropio(ownerId, id)` (mismo patrón que `IdeasService`): inexistente → `RecursoNoEncontradoException` (404); de otro `owner_id` → `AccesoDenegadoException` (403). El listado filtra directamente `where { ownerId }`.

### D4 — DTOs Zod y mapeo
`CrearGuionDto` (`nombre` ≥ 1, `descripcion?`, `preguntas` ≥ 1 con `{orden(≥1), texto(≥1)}`), `ActualizarGuionDto` (todos opcionales; `preguntas?` reemplaza), `IdGuionParamDto` (`idGuion` uuid), listado con paginación. El servicio transforma `PreguntaRequest[]` → `Pregunta[]` generando ids. Respuestas `GuionRespuestaDto`/`GuionesPaginadosDto` publicadas en Swagger.

## Risks / Trade-offs

- **jsonb vs tabla relacional** → se elige jsonb por ser una colección embebida sin acceso independiente; si en el futuro se necesitara consultar/parchear preguntas individualmente, se migraría a tabla. Aceptado.
- **Regenerar ids de pregunta en el PATCH** → al reemplazar el conjunto, los ids cambian; el contrato trata `preguntas` como conjunto reemplazable, así que es coherente. Aceptado.
- **Migración a mano tras `migration:generate`** → se limpia el ruido (como en E1–E3) y se verifica `run`/`revert`/`run`.

## Migration Plan

1. Tipos Zod (`preguntaSchema`, `Pregunta`).
2. Entidad `Guion` (preguntas jsonb) + migración de la tabla `guiones` (FK a `usuarios`).
3. DTOs Zod, mapeador `aGuionDto`, `GuionesService`, `GuionesController`.
4. `EntrevistasModule` (registra `Guion`) en `AppModule`.
5. Verificar contra la BD (Docker): crear→listar→consultar→editar (reemplaza preguntas)→eliminar, con 401/403/404/422. Rollback: revertir la migración.

## Open Questions

- **Ninguna abierta.** Orden de preguntas, ids generados y aislamiento por owner quedan resueltos arriba.
