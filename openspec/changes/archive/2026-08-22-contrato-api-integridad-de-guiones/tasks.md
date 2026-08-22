## 1. Preparación

- [x] 1.1 Releer en `contrato-api/openapi.yaml` las rutas `/guiones/{idGuion}` y el esquema `RespuestaEntrevista`, para confirmar que la referencia a proteger es `preguntaId`
- [x] 1.2 Confirmar que `CONFLICTO` ya está en el catálogo `CodigoError` y que existe la respuesta compartida `Conflicto` reutilizable

## 2. Contrato — `DELETE /guiones/{idGuion}`

- [x] 2.1 Añadir la respuesta `409` referenciando `#/components/responses/Conflicto`
- [x] 2.2 Ampliar la `description` explicando que un guión referenciado por alguna entrevista no se elimina, y **por qué** (los `preguntaId` de las respuestas dejarían de resolver; RNF-15)

## 3. Contrato — `PATCH /guiones/{idGuion}`

- [x] 3.1 Añadir la respuesta `409` referenciando `#/components/responses/Conflicto`
- [x] 3.2 Ampliar la `description` precisando que el `409` se dispara **solo cuando el cuerpo incluye `preguntas`** y el guión ya tiene entrevistas, y que `nombre`/`descripcion` siguen editables
- [x] 3.3 Verificar que `ActualizarGuionRequest` y `PreguntaRequest` **no cambian**: la regla no necesita `id` en el request

## 4. Verificación

- [x] 4.1 Validar el documento OpenAPI (sin errores de sintaxis ni `$ref` rotas)
- [x] 4.2 Revisar el diff: solo dos endpoints tocados, ningún esquema modificado, ningún código de error nuevo
- [x] 4.3 Ejecutar `openspec validate --strict` sobre el change
- [x] 4.4 Verificación ejecutada: 11/11 tareas, 9/9 escenarios en el contrato, sin esquemas ni códigos nuevos; lint sin regresiones (20 errores preexistentes de `nullable` en 3.1)
