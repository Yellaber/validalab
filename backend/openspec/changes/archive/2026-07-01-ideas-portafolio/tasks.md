## 1. Persistencia (entidad y migración)

- [x] 1.1 `EstadoIdea` (esquema Zod `estadoIdeaSchema`) con el catálogo del contrato (`borrador`, `en_validacion`, `go`, `pivote`, `kill`, `archivada`)
- [x] 1.2 Entidad `Idea` (TypeORM): `id` uuid, `ownerId` (indexado, FK a `usuarios` ON DELETE CASCADE), `titulo`, `descripcion?`, `problema`, `segmentoBeachhead?`, `estado` (default `borrador`), `fechaCreacion` (`@CreateDateColumn`), `fechaActualizacion` (`@UpdateDateColumn`)
- [x] 1.3 Migración de la tabla `ideas` (índice por `owner_id`, FK a `usuarios` ON DELETE CASCADE); verificado `migration:run`/`revert`/`run` contra PostgreSQL (Docker)

## 2. DTOs y mapeo (Zod + contrato)

- [x] 2.1 DTOs con `createZodDto`: `CrearIdeaDto` (`titulo` ≥ 1, `problema` ≥ 1, `descripcion?`, `segmentoBeachhead?`), `ActualizarIdeaDto` (mismos campos, todos opcionales, sin `estado`/`ownerId`), `IdIdeaParamDto` (`id` uuid), `ListarIdeasQueryDto` (paginación + `estado?`)
- [x] 2.2 Esquemas/DTOs de respuesta: `IdeaRespuestaDto` e `IdeasPaginadasDto`
- [x] 2.3 Mapeador `aIdeaDto(entidad)` que produce el recurso `Idea` del contrato (opcionales `null` → ausentes)

## 3. Gestión de ideas (gestion-de-ideas)

- [x] 3.1 `IdeasService.crear(ownerId, dto)`: crea en `borrador` con `ownerId` del token; devuelve la `Idea`
- [x] 3.2 `IdeasService.listar(ownerId, query)`: `findAndCount` filtrando por `ownerId` (+ `estado` si viene), orden por `fechaCreacion DESC`, sobre `RespuestaPaginada`
- [x] 3.3 Helper `buscarPropia(ownerId, id)`: inexistente → `RecursoNoEncontradoException` (404); ajena → `AccesoDenegadoException` (403)
- [x] 3.4 `IdeasService.obtener(ownerId, id)` y `IdeasService.actualizar(ownerId, id, dto)` (asignación parcial por campo definido; nunca toca `estado`/`ownerId`)
- [x] 3.5 Endpoints: `POST /ideas` (201), `GET /ideas` (200 paginado + filtro), `GET /ideas/{id}` (200), `PATCH /ideas/{id}` (200) — todos protegidos, `@ApiBearerAuth`
- [x] 3.6 Tests: crear (owner del token, estado `borrador`); listar (aislamiento por `owner_id`, filtro por estado); obtener propia/ajena→403/inexistente→404; actualizar contenido; actualizar ajena→403

## 4. Archivado de ideas (archivado-de-ideas)

- [x] 4.1 `IdeasService.archivar(ownerId, id)`: pone `estado = 'archivada'` sin borrar; devuelve la `Idea`
- [x] 4.2 `IdeasService.desarchivar(ownerId, id)`: si no está `archivada` → `ConflictoException` (409); si sí, vuelve a `borrador`
- [x] 4.3 Endpoints: `POST /ideas/{id}/archivar` (200) y `POST /ideas/{id}/desarchivar` (200) — protegidos, `@ApiBearerAuth`
- [x] 4.4 Tests: archivar propia (estado `archivada`, no elimina); archivar ajena→403; desarchivar archivada→`borrador`; desarchivar no-archivada→409; desarchivar ajena→403

## 5. Cableado y verificación final

- [x] 5.1 Crear `IdeasModule` (`forFeature([Idea])`, controlador, servicio) e importarlo en `AppModule`
- [x] 5.2 Verificado el flujo completo contra la BD (Docker): crear→listar(filtro/paginación)→consultar→editar→archivar→desarchivar, con 401/403/404/409/422 conforme al contrato
- [x] 5.3 `npm run lint` y `npm test` en verde (88 tests; incluye los tests de aislamiento por `owner_id`)
- [x] 5.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos)
