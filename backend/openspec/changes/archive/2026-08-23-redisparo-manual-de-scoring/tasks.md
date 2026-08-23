## 1. Re-disparo manual del scoring

- [x] 1.1 Añadir `EntrevistasService.puntuar(ownerId, ideaId, idEntrevista)`: asegura idea propia (403) y carga la entrevista (404), espera `AgenteService.solicitarScoring` y devuelve la entrevista con el `estadoScoring` actualizado
- [x] 1.2 Specs unitarios de `puntuar`: re-dispara y devuelve el estado final (`fallida → puntuada`), idea ajena → 403, entrevista inexistente → 404

## 2. Endpoint

- [x] 2.1 `POST :idEntrevista/puntuar` en `EntrevistasController` (`HttpCode(200)`, sin cuerpo) con Swagger y respuestas 200/401/403/404

## 3. Verificación

- [x] 3.1 `openspec validate --strict`; `npm test` verde; `build` OK
