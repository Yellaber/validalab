## 1. Vínculo entre módulos y excepción

- [x] 1.1 `EntrevistaSinVinculoException` en `dominio.exception.ts` (código `ENTREVISTA_SIN_VINCULO`, 422)
- [x] 1.2 `ContactosService`: `asegurarVinculoConIdea(ideaId, contactoId)` (→ ENTREVISTA_SIN_VINCULO si no está en la idea) y `marcarEntrevistado(contacto)`; `ContactosModule` exporta `ContactosService`
- [x] 1.3 `GuionesService`: `asegurarVinculo(ownerId, guionId)` (→ ENTREVISTA_SIN_VINCULO si no existe o no es propio)

## 2. Tipos y persistencia

- [x] 2.1 Tipos Zod: `respuestaEntrevistaSchema` (`{preguntaId uuid, texto}`), `citaSchema` (`{id uuid, texto, contexto?}`), `estadoScoringSchema`, `scoreEntrevistaSchema`, `ajusteScoreSchema`
- [x] 2.2 Entidad `Entrevista` (TypeORM): `id`, `ideaId` (indexado, FK a `ideas` ON DELETE CASCADE), `contactoId`, `guionId`, `respuestas` (jsonb), `citas` (jsonb), `estadoScoring` (default `pendiente`), `score` (jsonb?), `ajuste` (jsonb?), timestamps
- [x] 2.3 Migración de la tabla `entrevistas`; limpiado el ruido de `migration:generate` y verificado `run`/`revert`/`run` contra PostgreSQL (Docker)

## 3. DTOs y mapeo (Zod + contrato)

- [x] 3.1 DTOs con `createZodDto`: `CrearEntrevistaDto` (`contactoId`/`guionId` uuid, `respuestas` ≥1, `citas?`), `ActualizarEntrevistaDto` (`respuestas?`/`citas?`), `AjustarScoreDto` (`scoreAjustado` 0–10, `nota` ≥1), `IdEntrevistaParamDto` (`id` + `idEntrevista` uuid), listado con paginación + `contactoId?`/`estadoScoring?`
- [x] 3.2 Esquemas/DTOs de respuesta: `EntrevistaRespuestaDto` y `EntrevistasPaginadasDto`
- [x] 3.3 Mapeador `aEntrevistaDto` (`score`/`ajuste` `null` si no existen); helper que genera `id` de cada cita

## 4. Gestión de entrevistas (gestion-de-entrevistas)

- [x] 4.1 `EntrevistasService.crear`: `asegurarPropia` → `asegurarVinculoConIdea` → `asegurarVinculo` (guión) → 409 si contacto `entrevistado`/`descartado` → crea (`pendiente`, `score`/`ajuste` null) → `marcarEntrevistado`
- [x] 4.2 `listar`: `asegurarPropia`; paginado por `ideaId` (+ `contactoId`/`estadoScoring` si vienen); orden `fechaCreacion DESC`
- [x] 4.3 Helper `buscarEnIdea(ideaId, idEntrevista)` → 404; `obtener`
- [x] 4.4 `actualizar`: `respuestas?` reemplaza y reinicia `estadoScoring` a `pendiente` (limpia `score`); `citas?` reemplaza sin tocar scoring
- [x] 4.5 `eliminar` (204); `ajustarScore` (fija bloque `ajuste`, conserva `score`)
- [x] 4.6 Endpoints: `POST`/`GET` en `/ideas/{id}/entrevistas`; `GET`/`PATCH`/`DELETE` `{idEntrevista}`; `POST .../ajuste-score` — protegidos, `@ApiBearerAuth`
- [x] 4.7 Tests: crear (vínculo válido → contacto entrevistado; sin vínculo→422; contacto ya entrevistado/descartado→409; idea ajena→403); listar (filtros); obtener/editar (respuestas reinician scoring; solo citas no)/eliminar; ajuste (conserva score, fuera de rango→422)

## 5. Cableado y verificación final

- [x] 5.1 Registrar `Entrevista`, `EntrevistasController` y `EntrevistasService` en `EntrevistasModule` (`forFeature([Guion, Entrevista])`, importa `IdeasModule` + `ContactosModule`)
- [x] 5.2 Verificado el flujo completo contra la BD (Docker): registro→(contacto entrevistado)→listar→consultar→editar→ajuste→eliminar, con 401/403/404/409/422 conforme al contrato
- [x] 5.3 `npm run lint` (check) y `npm test` en verde (153 tests; incluye vínculo y transición del contacto)
- [x] 5.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos)
