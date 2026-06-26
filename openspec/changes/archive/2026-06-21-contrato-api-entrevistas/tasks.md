## 1. Schemas de dominio del guión

- [x] 1.1 Añadir el schema `Pregunta` (`id`, `orden` entero, `texto`) y `Guion` (`id`, `ownerId` solo lectura, `nombre`, `descripcion`, `preguntas` `Pregunta[]`, `fechaCreacion`, `fechaActualizacion`)
- [x] 1.2 Añadir los requests `CrearGuionRequest` (`nombre` requerido, `descripcion`, `preguntas` con `texto`/`orden`) y `ActualizarGuionRequest` (todos opcionales; `preguntas` reemplaza el conjunto ordenado)
- [x] 1.3 Añadir el sobre `GuionesPaginados` y el parámetro de path `idGuion`

## 2. Schemas de dominio de la entrevista

- [x] 2.1 Añadir los enums/objetos del scoring: `EstadoScoring` (`pendiente`|`puntuada`|`fallida`) y `ScoreEntrevista` solo lectura (`score` 0–10, `justificacion`, `senales` `string[]`, `confianza` 0–100, `proveedor`, `modelo`, `rubricaVersion`, `fechaScoring`)
- [x] 2.2 Añadir `AjusteScore` solo lectura (`scoreAjustado` 0–10, `nota`, `fechaAjuste`), `RespuestaEntrevista` (`preguntaId`, `texto`) y `Cita` (`id`, `texto`, `contexto`)
- [x] 2.3 Añadir el schema `Entrevista` (`id`, `ideaId` solo lectura, `contactoId`, `guionId`, `respuestas`, `citas`, `estadoScoring`, `score` nullable, `ajuste` nullable, fechas)
- [x] 2.4 Añadir los requests `CrearEntrevistaRequest` (`contactoId`, `guionId`, `respuestas`, `citas`; sin `ideaId`/`score`), `ActualizarEntrevistaRequest` (`respuestas`, `citas` opcionales) y `AjustarScoreRequest` (`scoreAjustado` requerido, `nota` requerida)
- [x] 2.5 Añadir el sobre `EntrevistasPaginadas`, el parámetro de path `idEntrevista` y los parámetros de query `filtroEstadoScoring` y `filtroContacto`

## 3. Endpoints del guión (tag `entrevistas`, nivel de usuario)

- [x] 3.1 Definir `POST /guiones` con `CrearGuionRequest` → `201` `Guion`, errores `401`/`422`
- [x] 3.2 Definir `GET /guiones` (paginado) → `200` `GuionesPaginados`, error `401`
- [x] 3.3 Definir `GET /guiones/{idGuion}` → `200` `Guion`, errores `401`/`403`/`404`
- [x] 3.4 Definir `PATCH /guiones/{idGuion}` con `ActualizarGuionRequest` → `200` `Guion`, errores `401`/`403`/`404`/`422`
- [x] 3.5 Definir `DELETE /guiones/{idGuion}` → `204` sin contenido, errores `401`/`403`/`404`

## 4. Endpoints de la entrevista (tag `entrevistas`, anidados en la idea)

- [x] 4.1 Definir `POST /ideas/{id}/entrevistas` con `CrearEntrevistaRequest` → `201` `Entrevista` (dispara scoring, mueve contacto a `entrevistado`), errores `401`/`403`/`404`/`409` (contacto incompatible)/`422` (`ENTREVISTA_SIN_VINCULO` o `VALIDACION_FALLIDA`)
- [x] 4.2 Definir `GET /ideas/{id}/entrevistas` (paginado + filtros `contactoId`/`estadoScoring`) → `200` `EntrevistasPaginadas`, errores `401`/`403`/`404`
- [x] 4.3 Definir `GET /ideas/{id}/entrevistas/{idEntrevista}` → `200` `Entrevista`, errores `401`/`403`/`404`
- [x] 4.4 Definir `PATCH /ideas/{id}/entrevistas/{idEntrevista}` con `ActualizarEntrevistaRequest` → `200` `Entrevista` (cambiar respuestas re-dispara scoring), errores `401`/`403`/`404`/`422`
- [x] 4.5 Definir `DELETE /ideas/{id}/entrevistas/{idEntrevista}` → `204` sin contenido, errores `401`/`403`/`404`

## 5. Endpoints de acción del scoring

- [x] 5.1 Definir `POST /ideas/{id}/entrevistas/{idEntrevista}/puntuar` → `200` `Entrevista` con `estadoScoring` actualizado, errores `401`/`403`/`404`
- [x] 5.2 Definir `POST /ideas/{id}/entrevistas/{idEntrevista}/ajuste-score` con `AjustarScoreRequest` → `200` `Entrevista` (conserva `score` del agente y `ajuste`), errores `401`/`403`/`404`/`422`

## 6. Verificación

- [x] 6.1 Validar que el OpenAPI sigue siendo válido y parseable, con todas las `$ref` resueltas
- [x] 6.2 Confirmar el aislamiento: rutas `/ideas/{id}/...` y `/guiones/...` ajenas → `403`, inexistentes → `404`
- [x] 6.3 Confirmar que crear sin idea/contacto válidos del mismo usuario → `422 ENTREVISTA_SIN_VINCULO` y que `CrearEntrevistaRequest` no acepta `ideaId` ni `score`
- [x] 6.4 Confirmar que el bloque `score` es de solo lectura y que el ajuste conserva ambos valores (agente + usuario)
- [x] 6.5 Confirmar que crear una entrevista con contacto `entrevistado`/`descartado` → `409`, y que editar respuestas vuelve `estadoScoring` a `pendiente`
- [x] 6.6 Confirmar que sigue siendo un único documento (solo se tocó `paths` y `components`) y que no se añadieron códigos de error nuevos
