## Context

El contrato (`contrato-api/openapi.yaml`) ya tiene los módulos `usuarios` (E0) e `ideas` (E1 + E2, con hipótesis y umbrales) y las convenciones transversales. Este cambio introduce el módulo **`contactos`** (épica E3, *Outreach y CRM de contactos*). Según el modelo de dominio del SRS §5, los contactos **cuelgan de la idea** (cada idea pertenece a un usuario y bajo ella cuelgan sus contactos), aislados por `owner_id`. Un contacto es una persona candidata a entrevista, con su perfil, el canal por el que se le contacta, su origen y su posición en el embudo de outreach (SRS §1.4, §3.2). E3 cubre la **captura y seguimiento** de contactos (HU-07/08/09/10, RF-05/06/07); las entrevistas y su scoring (E4) y el **cálculo** de los KPIs de outreach (E5) son épicas posteriores.

## Goals / Non-Goals

**Goals:**
- Definir en el contrato el CRUD de contactos anidados por idea, paginado y con filtro por estado del embudo.
- Definir la transición por el embudo de outreach como acción explícita, con validación de transiciones (`409 CONFLICTO`).
- Definir el registro de toques con el límite de dos toques por contacto (`409 CONFLICTO` al tercero).
- Soportar el trazado de cadenas de referidos (`origen` + `referidoPorId`).
- Reutilizar convenciones y componentes existentes (errores, auth, paginación, `idIdea`).
- Mantener el contrato como un único documento (solo se añade bajo el `tag` `contactos` y en `components`).

**Non-Goals:**
- **No** se modelan las entrevistas (E4); aunque crear una entrevista moverá el contacto a `entrevistado`, ese endpoint pertenece a E4.
- **No** se calcula ningún KPI de outreach (eso es E5).
- **No** código de runtime (módulo NestJS, persistencia, guardas, validación de transiciones).

## Decisions

### Decisión 1: Recursos anidados bajo la idea, no de primer nivel
- Los contactos siempre pertenecen a una idea (SRS §5), así que se anidan: `/ideas/{id}/contactos`.
- **Por qué anidar:** refuerza en el propio path la pertenencia a la idea y, con ella, el aislamiento por `ownerId` (el de la idea padre). Acceder a `/ideas/{id}/...` de una idea ajena ya devuelve `403` por la convención existente, sin rutas nuevas de autorización. Es el mismo patrón que hipótesis y umbrales (E2).
- **Por qué `tag: contactos` aunque el path sea `/ideas/...`:** `contactos` es un módulo de dominio propio (RNF-10) con su propio `tag` ya declarado; las operaciones se etiquetan `contactos` para navegar el contrato por dominio, aunque la ruta cuelgue de la idea (a diferencia de hipótesis/umbrales, que se integraron en el `tag` `ideas`).
- Se reutiliza el parámetro de path `idIdea` para el `{id}` de la idea y se añade el parámetro de path `idContacto` para el sub-recurso.

### Decisión 2: Endpoints de contactos (todos autenticados)
- `POST /ideas/{id}/contactos` — crear un contacto; nace en estado `por_contactar`.
- `GET /ideas/{id}/contactos` — listar contactos de la idea, **paginado** y con filtro opcional por `estado`.
- `GET /ideas/{id}/contactos/{idContacto}` — consultar un contacto.
- `PATCH /ideas/{id}/contactos/{idContacto}` — editar contenido (no `estado` ni toques).
- `DELETE /ideas/{id}/contactos/{idContacto}` — eliminar un contacto registrado por error.
- `POST /ideas/{id}/contactos/{idContacto}/estado` — transicionar por el embudo.
- `POST /ideas/{id}/contactos/{idContacto}/toques` — registrar un toque de outreach.
- **Por qué los contactos sí se paginan** (a diferencia de hipótesis): el pipeline de descubrimiento puede tener muchos contactos por idea; se usa el sobre `RespuestaPaginada` con filtro por `estado`, como en `GET /ideas`.

### Decisión 3: El embudo se mueve con una acción dedicada, no por `PATCH`
- `POST /ideas/{id}/contactos/{idContacto}/estado` con `TransicionEstadoRequest` (`estado` destino).
- **Por qué una acción y no editar `estado` en el `PATCH`:** la transición del embudo es un cambio de ciclo de vida con reglas (orden permitido, estados terminales, efectos colaterales), no una edición de contenido. Modelarla como acción separada deja explícita la transición y permite mapear las transiciones inválidas a `409 CONFLICTO` —código ya previsto en el catálogo `CodigoError` ("transición de outreach inválida")—, igual que `ideas` separa `archivar`/`desarchivar` del `PATCH` de contenido.
- **Orden del embudo:** `por_contactar → contactado → respondio → agendado → entrevistado → descartado`. `descartado` es alcanzable desde cualquier estado no terminal (un kill temprano es válido, SRS). `entrevistado` **no** se asigna por esta vía: solo lo fija el registro de una entrevista (E4, que "mueve el contacto al estado entrevistado"); pedirlo manualmente → `409 CONFLICTO`.

### Decisión 4: Toques como acción con límite de dos
- `POST /ideas/{id}/contactos/{idContacto}/toques` con `RegistrarToqueRequest` (`fecha` opcional).
- **Por qué una acción y dos campos de fecha:** RF-07/HU-09 piden registrar la fecha del **primer toque** y de **un único follow-up**, con un tope de dos. Se modela con dos campos `primerToqueEn`/`segundoToqueEn` en el `Contacto` y una acción que registra el siguiente toque; el tercero → `409 CONFLICTO`. Esto es más simple que una sub-colección de toques y basta para el límite de dos del SRS.
- **Por qué no se editan las fechas en el `PATCH`:** las fechas de toque son evidencia del seguimiento; registrarlas por una acción acotada evita falsear el conteo del límite de dos.

### Decisión 5: Schemas de dominio (en `components.schemas`)
- `EstadoOutreach`: `por_contactar` | `contactado` | `respondio` | `agendado` | `entrevistado` | `descartado` (default `por_contactar`). Sin acentos en los valores del enum, como el resto del catálogo (`senal_*`).
- `CanalContacto`: `linkedin` | `correo` | `mensajeria` | `otro` — canal de outreach (SRS §3.2: típicamente LinkedIn, correo o mensajería).
- `OrigenContacto`: `busqueda_directa` | `referido` | `comunidad` | `evento` | `otro` — de dónde proviene el contacto.
- `Contacto`: `id` (uuid), `ideaId` (uuid, **solo lectura**), `nombre`, `perfil`, `enlace` (handle/URL para alcanzarlo, opcional), `canal` (`CanalContacto`), `origen` (`OrigenContacto`), `referidoPorId` (uuid, **nullable**: contacto que lo refirió), `estado` (`EstadoOutreach`, **solo lectura** vía esta vía: se cambia con la acción), `primerToqueEn`/`segundoToqueEn` (date-time, **nullable**, solo lectura), `notas`, `fechaCreacion`, `fechaActualizacion`.
- `CrearContactoRequest`: `nombre` (requerido), `perfil`, `enlace`, `canal`, `origen`, `referidoPorId` (sin `estado` ni fechas de toque; nace `por_contactar`).
- `ActualizarContactoRequest`: `nombre`, `perfil`, `enlace`, `canal`, `origen`, `referidoPorId`, `notas`, todos opcionales (sin `ideaId`, `estado` ni toques).
- `TransicionEstadoRequest`: `estado` (`EstadoOutreach`, requerido).
- `RegistrarToqueRequest`: `fecha` (date-time, opcional; por defecto el momento del registro).
- `ContactosPaginados`: sobre `RespuestaPaginada` con `datos` de `Contacto`.
- **Por qué `referidoPorId` en lugar de una entidad "referido":** HU-10 es *Could*; un puntero opcional al contacto que refirió basta para trazar la cadena y alimentar el KPI `tasa_referidos` (E5), sin introducir un recurso nuevo.
- **Por qué `ideaId` y `estado` de solo lectura en `Contacto`:** informan pertenencia y posición para trazabilidad, pero el vínculo lo da el path y el estado se cambia solo por la acción de transición (regla de aislamiento y de ciclo de vida).

### Decisión 6: Aislamiento y mapeo de errores
- Toda ruta `/ideas/{id}/...` sobre una idea ajena → `403 ACCESO_DENEGADO`; idea inexistente → `404 RECURSO_NO_ENCONTRADO`; sin token → `401 NO_AUTENTICADO`.
- Sub-recurso inexistente (`idContacto` desconocido) → `404 RECURSO_NO_ENCONTRADO`.
- Payload inválido (p. ej. `nombre` vacío, `canal`/`origen`/`estado` fuera de enum) → `422 VALIDACION_FALLIDA`.
- Transición de embudo no permitida y tercer toque → `409 CONFLICTO` (se reutiliza la `response` `Conflicto`).
- Se reutilizan las `responses` compartidas (`NoAutenticado`, `AccesoDenegado`, `NoEncontrado`, `ValidacionFallida`, `Conflicto`) y el parámetro `idIdea`.

## Risks / Trade-offs

- **[Contactos anidados bajo la idea vs. CRM global de usuario]** El SRS usa indistintamente "CRM del usuario" (§1, §2.4) y "bajo la idea cuelgan sus contactos" (§5). → Se sigue §5 (modelo de dominio explícito) y el precedente de E2: contactos por idea. Esto hace que los KPIs de outreach por idea sean directos (los contactos ya están en el alcance de la idea). Si en el futuro se quisiera reutilizar un contacto entre ideas, se evaluaría un recurso de primer nivel; queda fuera de alcance.
- **[`entrevistado` no asignable manualmente en E3]** El contrato lo prohíbe vía `409`, pero el endpoint que sí lo asigna (crear entrevista) llega en E4. → Aceptado: deja la regla declarada desde ya y evita estados inconsistentes; E4 solo añade el camino legítimo.
- **[Límite de dos toques con dos campos en vez de sub-colección]** Pierde el detalle de canal/nota por toque. → Aceptado: el SRS solo pide las dos fechas y el tope; un modelo más rico sería sobre-ingeniería para el MVP.

## Open Questions

- Ninguna pendiente. Resueltas: contactos **anidados por idea** (SRS §5); el embudo se mueve por **acción dedicada** con `409` en transiciones inválidas; los toques se registran por **acción** con tope de dos; los referidos se trazan con `referidoPorId`.
