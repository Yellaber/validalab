## Context

Sobre E0–E2. El contrato (tag `contactos`) fija la superficie:

- `Contacto { id, ideaId(readOnly), nombre, perfil?, enlace?, canal, origen, referidoPorId?(nullable), estado(readOnly), primerToqueEn?(nullable,readOnly), segundoToqueEn?(nullable,readOnly), notas?, fechaCreacion, fechaActualizacion }`. `canal`/`origen`/`estado` son **requeridos** en el recurso.
- `CanalContacto`: `linkedin|correo|mensajeria|otro`. `OrigenContacto`: `busqueda_directa|referido|comunidad|evento|otro`. `EstadoOutreach`: `por_contactar|contactado|respondio|agendado|entrevistado|descartado`.
- Requests: crear `{ nombre(≥1), perfil?, enlace?, canal?, origen?, referidoPorId? }`; editar (PATCH) los mismos + `notas`, todos opcionales, sin `estado`/fechas de toque; transición `{ estado }`; toque `{ fecha? }`.

## Goals / Non-Goals

**Goals:**
- CRUD de contactos por idea, embudo de outreach y toques, exactamente como define el contrato.
- Aislamiento anidado: la propiedad del contacto se hereda de la idea (reutilizando `gestion-de-ideas`).
- Máquina de estados del embudo correcta, con `entrevistado` reservado a E4 y el límite de dos toques.

**Non-Goals:**
- Registrar entrevistas y asignar `entrevistado` (E4). El guión de entrevista (E4).
- KPIs de outreach (E5): aquí solo se gestiona el pipeline, no se calculan tasas.

## Decisions

### D1 — `contactos` es un módulo nuevo que depende de `ideas`
Primer caso de dependencia entre contextos acotados. `IdeasModule` **exporta** `IdeasService`; `ContactosModule` lo **importa** (`imports: [TypeOrmModule.forFeature([Contacto]), IdeasModule]`) e inyecta `IdeasService` para reutilizar `asegurarPropia(ownerId, ideaId)` (403/404 de la idea). No se fusionan módulos: es el patrón exports/imports.

### D2 — Entidad `Contacto`, FKs y defaults
Tabla `contactos`: `id uuid`, `idea_id uuid` (indexado, FK a `ideas` ON DELETE CASCADE), `nombre`, `perfil?`, `enlace?`, `canal`, `origen`, `referido_por_id uuid?` (auto-FK a `contactos` ON DELETE SET NULL — si se borra el referente, el referido no queda colgando), `estado` (default `por_contactar`), `primer_toque_en?`, `segundo_toque_en?`, `notas?`, timestamps. Como `canal`/`origen` son requeridos en el recurso pero opcionales al crear, el servicio aplica **defaults**: `canal = 'otro'`, `origen = 'busqueda_directa'`. Mapeador `aContactoDto` (opcionales `null` → ausentes; `referidoPorId`/`primerToqueEn`/`segundoToqueEn` conservan `null` porque el contrato los marca `nullable`).

### D3 — Validación de `referidoPorId`
Si `referidoPorId` viene (no `null`) en crear o editar, el servicio verifica que exista un contacto con ese `id` **en la misma idea**; si no, `ValidacionFallidaException` (422). Evita cadenas de referido rotas o cruzadas entre ideas y una violación de FK en la BD. No se exige que `origen` sea `referido` para aceptarlo (el contrato solo lo asocia, no lo condiciona).

### D4 — Máquina de estados del embudo
Mapa de transiciones permitidas (constante `TRANSICIONES`):
- `por_contactar → contactado | descartado`
- `contactado → respondio | descartado`
- `respondio → agendado | descartado`
- `agendado → descartado`
- `entrevistado → (terminal)` · `descartado → (terminal)`

`descartado` es alcanzable desde cualquier estado no terminal. `entrevistado` **no** aparece como destino permitido: pedirlo (o cualquier salto/avance desde terminal) → `ConflictoException` (409). El DTO valida `estado` contra `EstadoOutreach`; un valor fuera del catálogo → 422 antes del servicio. Registrar toques y transicionar son acciones **independientes** (el contrato no acopla el toque a un cambio de estado).

### D5 — Toques con límite de dos
`primerToqueEn` se fija si está vacío; si ya existe y `segundoToqueEn` está vacío, se fija el segundo; si ambos existen → `ConflictoException` (409). La `fecha` del cuerpo es opcional; si se omite, se usa el momento del registro (`new Date()`). El cuerpo del request es opcional (`required: false`).

### D6 — Resolución anidada y DTOs
Helper `buscarEnIdea(ideaId, idContacto)`: contacto inexistente o de otra idea → `RecursoNoEncontradoException` (404) (tras `asegurarPropia` sobre la idea). DTOs Zod: `CrearContactoDto`, `ActualizarContactoDto` (todos opcionales, sin `estado`/toques), `TransicionEstadoDto` (`estado` ∈ `EstadoOutreach`), `RegistrarToqueDto` (`fecha?` datetime), `IdContactoParamDto` (`id` + `idContacto` uuid), y el listado reutiliza la paginación + filtro `estado?`. Respuestas `ContactoRespuestaDto`/`ContactosPaginadosDto`, publicadas en Swagger.

### D7 — Organización de archivos
`contactos` es un **único agregado** (no tiene sub-dominios como `ideas`), así que sus archivos quedan planos en `src/contactos/` con la convención de sufijos, más `embudo.ts` para la máquina de estados (constante de dominio, como `kpi.catalog.ts`). No se sub-divide en carpetas por tipo: es infra-innecesaria para un módulo de un solo agregado.

## Risks / Trade-offs

- **`entrevistado` alcanzable solo por E4** → se modela como estado sin transición de entrada manual; E4 lo fijará directamente al crear la entrevista. Aceptado.
- **Auto-FK de referido** → `ON DELETE SET NULL` evita filas colgantes; la validación de misma-idea (D3) evita referencias cruzadas.
- **Migración a mano tras `migration:generate`** → se limpia el ruido (como en E1/E2) y se verifica `run`/`revert`/`run`.

## Migration Plan

1. Exportar `IdeasService` desde `IdeasModule`.
2. Tipos Zod (`CanalContacto`, `OrigenContacto`, `EstadoOutreach`) + `TRANSICIONES` (embudo).
3. Entidad `Contacto` + migración de la tabla `contactos` (FK a `ideas`, auto-FK de referido).
4. DTOs Zod, mapeador, `ContactosService` (CRUD + transición + toques), `ContactosController`.
5. `ContactosModule` (importa `IdeasModule`) en `AppModule`.
6. Verificar contra la BD (Docker): crear→listar(filtro/paginación)→consultar→editar→transición (válida/inválida/entrevistado→409)→toques (1º/2º/3º→409)→eliminar, con 401/403/404/409/422. Rollback: revertir la migración.

## Open Questions

- **Defaults de `canal`/`origen`**: resuelto (D2) — `otro` / `busqueda_directa`.
- **Error de `referidoPorId` inválido**: resuelto (D3) — `422`.
