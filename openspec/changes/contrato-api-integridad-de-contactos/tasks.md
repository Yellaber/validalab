## 1. Preparación

- [x] 1.1 Releer en `contrato-api/openapi.yaml` el `DELETE /ideas/{id}/contactos/{idContacto}` y el `POST /ideas/{id}/entrevistas`, para confirmar cómo se declara hoy RNF-14 (`422 ENTREVISTA_SIN_VINCULO`)
- [x] 1.2 Confirmar que existe `DELETE /ideas/{id}/entrevistas/{idEntrevista}`, que es la vía de escape que la descripción debe señalar
- [x] 1.3 Revisar la redacción del `409` ya introducido en `/guiones/{idGuion}` para mantener el mismo tono y estructura

## 2. Contrato — `DELETE /ideas/{id}/contactos/{idContacto}`

- [x] 2.1 Añadir la respuesta `409` referenciando `#/components/responses/Conflicto`
- [x] 2.2 Ampliar la `description` explicando que un contacto con entrevistas no se elimina, y **por qué** (RNF-14: dejaría la entrevista en el estado que `ENTREVISTA_SIN_VINCULO` rechaza al crearla)
- [x] 2.3 Precisar en la `description` que la condición es la **existencia de entrevistas**, no el `estado` del contacto
- [x] 2.4 Señalar en la `description` la vía de escape: eliminar antes las entrevistas del contacto

## 3. Verificación

- [x] 3.1 Validar el documento OpenAPI y comprobar que el recuento de problemas de `redocly lint` no empeora respecto a `develop`
- [x] 3.2 Revisar el diff: un solo endpoint tocado, ningún esquema modificado, ningún código de error nuevo
- [x] 3.3 Ejecutar `openspec validate --strict` sobre el change
- [x] 3.4 Verificar la cobertura de los 5 escenarios del delta antes de preparar el PR
