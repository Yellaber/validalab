## 1. Dependencia entre módulos y tipos del dominio

- [x] 1.1 `IdeasModule` exporta `IdeasService` (`exports: [IdeasService]`); boot confirma que sigue resolviendo
- [x] 1.2 Tipos Zod `canalContactoSchema`, `origenContactoSchema`, `estadoOutreachSchema` con los catálogos del contrato
- [x] 1.3 Máquina de estados `TRANSICIONES` (constante `embudo.ts`): mapa estado → destinos permitidos, con `descartado` desde cualquier no-terminal y `entrevistado`/`descartado` terminales

## 2. Persistencia (entidad y migración)

- [x] 2.1 Entidad `Contacto` (TypeORM): `id`, `ideaId` (indexado, FK a `ideas` ON DELETE CASCADE), `nombre`, `perfil?`, `enlace?`, `canal`, `origen`, `referidoPorId?` (auto-FK a `contactos` ON DELETE SET NULL), `estado` (default `por_contactar`), `primerToqueEn?`, `segundoToqueEn?`, `notas?`, timestamps
- [x] 2.2 Migración de la tabla `contactos`; limpiado el ruido de `migration:generate` y verificado `run`/`revert`/`run` contra PostgreSQL (Docker)

## 3. DTOs y mapeo (Zod + contrato)

- [x] 3.1 DTOs con `createZodDto`: `CrearContactoDto` (`nombre` ≥ 1, resto opcional), `ActualizarContactoDto` (todos opcionales, sin `estado`/toques), `TransicionEstadoDto` (`estado` ∈ `EstadoOutreach`), `RegistrarToqueDto` (`fecha?` datetime), `IdContactoParamDto` (`id` + `idContacto` uuid), listado con paginación + `estado?`
- [x] 3.2 Esquemas/DTOs de respuesta: `ContactoRespuestaDto` y `ContactosPaginadosDto`
- [x] 3.3 Mapeador `aContactoDto` (opcionales `null` → ausentes salvo los `nullable` del contrato: `referidoPorId`, `primerToqueEn`, `segundoToqueEn`)

## 4. Gestión de contactos (gestion-de-contactos)

- [x] 4.1 `ContactosService.crear`: verifica idea propia (`IdeasService.asegurarPropia`); defaults `canal`/`origen`; valida `referidoPorId` (misma idea, si no → 422); crea en `por_contactar`
- [x] 4.2 `ContactosService.listar`: verifica idea propia; paginado por `ideaId` (+ `estado` si viene), orden por `fechaCreacion DESC`
- [x] 4.3 Helper `buscarEnIdea(ideaId, idContacto)`: inexistente o de otra idea → `RecursoNoEncontradoException` (404)
- [x] 4.4 `obtener` · `actualizar` (asignación parcial; valida `referidoPorId`; nunca `estado`/toques) · `eliminar` (204)
- [x] 4.5 Endpoints: `POST` (201) / `GET` (200) en `/ideas/{id}/contactos`; `GET` (200) / `PATCH` (200) / `DELETE` (204) en `/ideas/{id}/contactos/{idContacto}` — protegidos, `@ApiBearerAuth`
- [x] 4.6 Tests: crear (idea propia, `por_contactar`, `ideaId` del path, referido válido/ inválido→422); listar (aislamiento, filtro por estado); obtener/actualizar/eliminar; ajena→403 / inexistente→404

## 5. Embudo de outreach (embudo-de-outreach)

- [x] 5.1 `ContactosService.transicionar`: valida destino contra `TRANSICIONES`; `entrevistado`/salto/terminal → `ConflictoException` (409)
- [x] 5.2 `ContactosService.registrarToque`: fija `primerToqueEn`/`segundoToqueEn` (fecha del cuerpo o `new Date()`); tercer toque → `ConflictoException` (409)
- [x] 5.3 Endpoints: `POST /ideas/{id}/contactos/{idContacto}/estado` (200) y `/toques` (200) — protegidos, `@ApiBearerAuth`
- [x] 5.4 Tests: avance válido; descartar; transición inválida→409; `entrevistado`→409; estado fuera de catálogo→422; toque 1º/2º; tercer toque→409

## 6. Cableado y verificación final

- [x] 6.1 Crear `ContactosModule` (`forFeature([Contacto])`, importa `IdeasModule`) e importarlo en `AppModule`
- [x] 6.2 Verificado el flujo completo contra la BD (Docker): crear→listar→consultar→editar→transición (válida/inválida/entrevistado)→toques (1/2/3)→eliminar, con 401/403/404/409/422 conforme al contrato
- [x] 6.3 `npm run lint` (check) y `npm test` en verde (133 tests; incluye aislamiento anidado y la máquina de estados)
- [x] 6.4 Verificar el change con la skill de OpenSpec antes de archivar (sin issues críticos)
