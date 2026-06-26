## 1. Schemas de dominio del módulo ideas

- [x] 1.1 Añadir el enum `EstadoIdea` (`borrador`|`en_validacion`|`go`|`pivote`|`kill`|`archivada`)
- [x] 1.2 Añadir el schema `Idea` (`id`, `ownerId` solo lectura, `titulo`, `descripcion`, `problema`, `segmentoBeachhead`, `estado`, `fechaCreacion`, `fechaActualizacion`)
- [x] 1.3 Añadir los requests `CrearIdeaRequest` y `ActualizarIdeaRequest` (sin `ownerId` ni `estado`)
- [x] 1.4 Añadir `IdeasPaginadas` (`allOf` de `RespuestaPaginada` con `datos` de `Idea`)
- [x] 1.5 Añadir el parámetro de path `idIdea` y el parámetro de query opcional `filtroEstadoIdea`

## 2. Endpoints de portafolio (CRUD)

- [x] 2.1 Definir `POST /ideas` (autenticado) con `CrearIdeaRequest` → `201` `Idea` en `borrador`, errores `401`/`422`
- [x] 2.2 Definir `GET /ideas` paginado con filtro opcional `estado` → `200` `IdeasPaginadas`, error `401`
- [x] 2.3 Definir `GET /ideas/{id}` → `200` `Idea`, errores `401`/`403`/`404`
- [x] 2.4 Definir `PATCH /ideas/{id}` con `ActualizarIdeaRequest` (sin `estado`) → `200` `Idea`, errores `401`/`403`/`404`/`422`

## 3. Endpoints de archivado

- [x] 3.1 Definir `POST /ideas/{id}/archivar` → `200` `Idea` en `archivada`, errores `401`/`403`/`404`
- [x] 3.2 Definir `POST /ideas/{id}/desarchivar` → `200` `Idea` en `borrador`, errores `401`/`403`/`404`/`409` (no estaba archivada)

## 4. Verificación

- [x] 4.1 Validar que el OpenAPI sigue siendo válido y parseable tras los cambios
- [x] 4.2 Confirmar el aislamiento: rutas `{id}` mapean idea ajena → `403`, inexistente → `404`
- [x] 4.3 Confirmar que `CrearIdeaRequest`/`ActualizarIdeaRequest` no aceptan `ownerId` ni fijan `estado` a `go`/`pivote`/`kill`
- [x] 4.4 Confirmar que sigue siendo un único documento (solo se tocó `paths` del tag `ideas` y `components`) y que no se añadieron códigos de error nuevos
