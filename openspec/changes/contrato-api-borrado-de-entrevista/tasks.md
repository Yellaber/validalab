## 1. Preparación

- [x] 1.1 Confirmar en `contrato-api/openapi.yaml` la frase del `POST /ideas/{id}/entrevistas` sobre mover el contacto a `entrevistado`, para redactar el `DELETE` en simetría
- [x] 1.2 Confirmar que el embudo prohíbe los saltos, lo que hace de `agendado` el único predecesor posible de `entrevistado`

## 2. Contrato — `DELETE /ideas/{id}/entrevistas/{idEntrevista}`

- [x] 2.1 Añadir la `description` (hoy el endpoint no tiene ninguna) declarando que eliminar la entrevista devuelve el contacto vinculado a `agendado`
- [x] 2.2 Explicar **por qué** `agendado` no es arbitrario: el embudo no admite saltos, así que es el estado inmediatamente anterior
- [x] 2.3 Explicar la consecuencia de no revertir: el `409` de «contacto ya entrevistado» haría irreversible cualquier registro erróneo

## 3. Verificación

- [x] 3.1 Comprobar que el recuento de problemas de `redocly lint` no empeora respecto a `develop`
- [x] 3.2 Revisar el diff: un solo endpoint tocado, ningún esquema, endpoint ni código de error nuevo
- [x] 3.3 Ejecutar `openspec validate --strict` sobre el change
- [x] 3.4 Verificar la cobertura de los escenarios de ambos deltas antes de preparar el PR
