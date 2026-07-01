## 1. Reutilización de la verificación de idea propia

- [x] 1.1 Exponer `IdeasService.asegurarPropia(ownerId, ideaId): Promise<Idea>` (público) con la lógica actual de `buscarPropia` (inexistente → 404, ajena → 403); los métodos existentes lo consumen sin cambiar comportamiento
- [x] 1.2 Tests: los tests de `IdeasService` siguen en verde (sin regresión de 403/404)

## 2. Persistencia (entidad y migración)

- [x] 2.1 `TipoHipotesis` y `EstadoHipotesis` (esquemas Zod) con los catálogos del contrato
- [x] 2.2 Entidad `Hipotesis` (TypeORM): `id` uuid, `ideaId` (indexado, FK a `ideas` ON DELETE CASCADE), `tipo`, `enunciado`, `estado` (default `pendiente`), `fechaCreacion` (`@CreateDateColumn`), `fechaActualizacion` (`@UpdateDateColumn`)
- [x] 2.3 Migración de la tabla `hipotesis`; limpiado el ruido de `migration:generate` y verificado `run`/`revert`/`run` contra PostgreSQL (Docker)

## 3. DTOs y mapeo (Zod + contrato)

- [x] 3.1 DTOs con `createZodDto`: `CrearHipotesisDto` (`tipo` ∈ catálogo, `enunciado` ≥ 1), `ActualizarHipotesisDto` (`tipo?`, `enunciado?`, `estado?`, sin `ideaId`), `IdHipotesisParamDto` (`id` + `idHipotesis` uuid); los endpoints de colección reutilizan `IdIdeaParamDto`
- [x] 3.2 Esquemas/DTOs de respuesta: `HipotesisRespuestaDto` y `HipotesisListaDto`
- [x] 3.3 Mapeador `aHipotesisDto(entidad)` que produce el recurso `Hipotesis` del contrato

## 4. Gestión de hipótesis (gestion-de-hipotesis)

- [x] 4.1 `HipotesisService.crear(ownerId, ideaId, dto)`: verifica idea propia; crea en `pendiente` con `ideaId` del path
- [x] 4.2 `HipotesisService.listar(ownerId, ideaId)`: verifica idea propia; devuelve el arreglo de hipótesis de la idea
- [x] 4.3 Helper `buscarEnIdea(ideaId, idHipotesis)`: hipótesis inexistente o de otra idea → `RecursoNoEncontradoException` (404)
- [x] 4.4 `HipotesisService.actualizar(ownerId, ideaId, idHipotesis, dto)`: asignación parcial (`tipo`/`enunciado`/`estado`); nunca cambia `ideaId`
- [x] 4.5 `HipotesisService.eliminar(ownerId, ideaId, idHipotesis)`: borra la hipótesis (204)
- [x] 4.6 Endpoints: `POST` (201) y `GET` (200) en `/ideas/{id}/hipotesis`; `PATCH` (200) y `DELETE` (204) en `/ideas/{id}/hipotesis/{idHipotesis}` — protegidos, `@ApiBearerAuth`
- [x] 4.7 Tests: crear (idea propia, estado `pendiente`, `ideaId` del path); crear/list sobre idea ajena→403/inexistente→404; editar `tipo`/`enunciado`; marcar estado `confirmada`/`refutada`; hipótesis inexistente en la idea→404; eliminar→204

## 5. Cableado y verificación final

- [x] 5.1 Registrar `Hipotesis`, `HipotesisController` y `HipotesisService` en `IdeasModule` (`forFeature([Idea, Hipotesis])`)
- [x] 5.2 Verificado el flujo completo contra la BD (Docker): crear→listar→editar/marcar estado→eliminar, con 401/403/404/422 conforme al contrato
- [x] 5.3 `npm run lint` y `npm test` en verde (97 tests; incluye aislamiento anidado por idea)
- [x] 5.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos)
