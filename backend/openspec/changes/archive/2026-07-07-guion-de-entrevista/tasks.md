## 1. Tipos y persistencia

- [x] 1.1 Tipos Zod `preguntaSchema` (`{id uuid, orden ≥1, texto}`) y `Pregunta`
- [x] 1.2 Entidad `Guion` (TypeORM): `id`, `ownerId` (indexado, FK a `usuarios` ON DELETE CASCADE), `nombre`, `descripcion?`, `preguntas` (jsonb), timestamps
- [x] 1.3 Migración de la tabla `guiones`; limpiado el ruido de `migration:generate` y verificado `run`/`revert`/`run` contra PostgreSQL (Docker)

## 2. DTOs y mapeo (Zod + contrato)

- [x] 2.1 DTOs con `createZodDto`: `CrearGuionDto` (`nombre` ≥ 1, `descripcion?`, `preguntas` ≥ 1 de `{orden ≥1, texto ≥1}`), `ActualizarGuionDto` (todos opcionales; `preguntas?` reemplaza), `IdGuionParamDto` (`idGuion` uuid)
- [x] 2.2 Esquemas/DTOs de respuesta: `GuionRespuestaDto` y `GuionesPaginadosDto`
- [x] 2.3 Mapeador `aGuionDto` (ordena preguntas por `orden`); helper que transforma `PreguntaRequest[]` → `Pregunta[]` generando `id`

## 3. Gestión de guiones (gestion-de-guiones)

- [x] 3.1 `GuionesService.crear(ownerId, dto)`: crea con `ownerId` del token y preguntas con `id` generado
- [x] 3.2 `GuionesService.listar(ownerId, query)`: `findAndCount` por `ownerId`, orden por `fechaCreacion DESC`, sobre paginado
- [x] 3.3 Helper `buscarPropio(ownerId, id)`: inexistente → 404; ajeno → 403
- [x] 3.4 `obtener` · `actualizar` (asigna `nombre`/`descripcion`; si viene `preguntas`, reemplaza) · `eliminar` (204)
- [x] 3.5 Endpoints: `POST /guiones` (201), `GET /guiones` (200), `GET/PATCH/DELETE /guiones/{idGuion}` — protegidos, `@ApiBearerAuth`
- [x] 3.6 Tests: crear (owner del token, preguntas con id, orden); listar (aislamiento); obtener propio/ajeno→403/inexistente→404; editar (reemplazo de preguntas); eliminar

## 4. Cableado y verificación final

- [x] 4.1 Crear `EntrevistasModule` (`forFeature([Guion])`) e importarlo en `AppModule`
- [x] 4.2 Verificado el flujo completo contra la BD (Docker): crear→listar→consultar→editar→eliminar, con 401/403/404/422 conforme al contrato
- [x] 4.3 `npm run lint` (check) y `npm test` en verde (142 tests; incluye aislamiento por `owner_id`)
- [x] 4.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos)
