## 1. Fundación compartida (refactor interno, sin cambio de comportamiento)

- [x] 1.1 Generalizar el runner del grafo: `ejecutarScoring`/`extraerSalidaEstructurada` → `ejecutarAgente(params, esquema)` parametrizado por esquema Zod y tools; el scoring lo reutiliza sin cambiar su comportamiento
- [x] 1.2 Parametrizar `ModeloDeChatFactory.crear(ownerId, tarea)` y `ConfiguracionService.credencialPara(ownerId, tarea)` (`scoring|veredicto`); el scoring sigue usando `modeloScoring`
- [x] 1.3 Añadir `SalidaAgenteInvalidaException` (código `SALIDA_AGENTE_INVALIDA`, 502) a las excepciones de dominio
- [x] 1.4 `npm test` verde tras el refactor (scoring intacto)

## 2. Persistencia del veredicto

- [x] 2.1 Crear la entidad `Veredicto` (`veredictos`) en `agente/veredicto/`: idea_id, veredicto, confianza, justificacion_por_kpi jsonb, recomendaciones jsonb, proveedor, modelo, snapshot_kpis jsonb, estado_verificacion, verificacion jsonb, fecha_emision
- [x] 2.2 Migración de `veredictos`; verificar run/revert/run

## 3. Emisión del veredicto (agente)

- [x] 3.1 Definir `salidaVeredictoSchema` Zod (`veredicto`, `confianza`, `justificacionPorKPI[]`, `recomendaciones[]`) y el prompt/rúbrica del veredicto
- [x] 3.2 Tools del veredicto con Zod: `calcularKPIs` (snapshot congelado), `consultarHipotesis`, `consultarUmbrales`, acotadas por owner/idea
- [x] 3.3 Implementar `VeredictoService.emitir(ownerId, ideaId)`: snapshot (`KpisService`), modo real (runner genérico + factory `veredicto`) o `fake` determinista, validación/reintento, persistencia con snapshot/proveedor/modelo; mapeo 409/502/503
- [x] 3.4 Specs unitarios de emisión: fake determinista, sin BYOK→409, salida inválida→502, snapshot congelado

## 4. Consulta y verificación

- [x] 4.1 Implementar `listar` (paginado) y `obtener` (403/404) de veredictos
- [x] 4.2 Implementar `verificar(ownerId, ideaId, idVeredicto, dto)`: aprobar→fija estado de la idea (método nuevo en `IdeasService`) + `aprobado`; anular→exige nota + `anulado` sin tocar la idea; ya verificado→409
- [x] 4.3 DTOs Zod (`Veredicto`, `JustificacionKpi`, `VerificarVeredictoRequest`, `VeredictosPaginados`) derivados del contrato
- [x] 4.4 Specs unitarios de verificación: aprobar cambia estado, anular exige nota y no cambia, ya verificado→409, aislamiento

## 5. Endpoint y cableado

- [x] 5.1 `VeredictoController` (`ideas/:id/veredictos`): POST emitir, GET listar/obtener, POST verificación; Swagger con `@ApiBearerAuth` y respuestas 201/200/401/403/404/409/422/502/503
- [x] 5.2 Cablear en `AgenteModule` (`forFeature([Veredicto])`, providers); `IdeasService` expone el fijado de estado por veredicto

## 6. Verificación

- [x] 6.1 `openspec validate --strict`; `npm test` verde; `eslint` en modo check limpio; `build` OK
- [x] 6.2 e2e (modo `fake`): emitir veredicto de una idea con KPIs → `201` con snapshot; aprobar → idea cambia de estado; emitir otro y anular (con nota) → idea sin cambio; verificar ya verificado → 409
