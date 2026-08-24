## 1. Inventario previo

- [x] 1.1 Registrar la lista exacta de las 20 propiedades con `nullable: true`, con su ruta dentro del documento, para poder comparar antes y después
- [x] 1.2 Clasificarlas en las dos formas: escalar (`type: X` + `nullable`) y referencia (`allOf: [$ref]` + `nullable`)
- [x] 1.3 Guardar el recuento de errores y avisos de `redocly lint` como línea base (20 errores, 3 avisos)

## 2. Propiedades escalares

- [x] 2.1 Migrar las 15 escalares a `type: [X, 'null']`, conservando `format`, `minimum`, `description` y demás atributos
- [x] 2.2 Escribir `'null'` **entrecomillado**: sin comillas, YAML lo interpreta como el valor nulo y el esquema significa otra cosa
- [x] 2.3 No introducir `oneOf` donde basta el array de tipos: `type` admite array precisamente para este caso

## 3. Propiedades con referencia

- [x] 3.1 Migrar las 5 de `allOf: [$ref]` + `nullable` a `oneOf` con la referencia y una rama `type: 'null'`
- [x] 3.2 Eliminar el envoltorio `allOf`: existía solo para sortear la limitación de 3.0 y sin `nullable` no tiene función
- [x] 3.3 Conservar cada `description` **palabra por palabra**: explican *cuándo* llega nulo, que es información que el esquema no aporta
- [x] 3.4 Verificar que las cinco son `score` y `ajuste` de la entrevista, `verificacion` del veredicto y las dos `proveedor` del costo

## 4. Verificación del contrato

- [x] 4.1 `redocly lint` sobre el documento: **0 errores** (los 3 avisos se mantienen y son aceptables)
- [x] 4.2 Confirmar que no queda ninguna ocurrencia de `nullable` en el documento
- [x] 4.3 Parsear el YAML y comprobar que las propiedades nulables declaran la **cadena** `'null'` y no el valor nulo — el linter no distingue este error
- [x] 4.4 Comparar el conjunto de propiedades nulables con el inventario de 1.1: deben ser exactamente las mismas 20, ni una menos ni una de más
- [x] 4.5 Confirmar que no se añadió, eliminó ni renombró ningún endpoint, esquema o código de error

## 5. Gate en integración continua

- [x] 5.1 Añadir a `.github/workflows/ci.yml` un job `Contrato de API` que ejecute `redocly lint` sobre `contrato-api/openapi.yaml`
- [x] 5.2 Dejarlo como job propio, no dentro del backend: el contrato es la frontera entre paquetes y no pertenece a ninguno
- [x] 5.3 Comentar en el workflow que los avisos no rompen el build y por qué el job existe
- [x] 5.4 Comprobar localmente que el gate **falla** si se reintroduce un `nullable`, que es la razón de ser del job

## 6. Verificación final

- [x] 6.1 Revisar el diff: solo `contrato-api/openapi.yaml` y el workflow; ni backend ni frontend
- [x] 6.2 Confirmar que backend y frontend no necesitan cambios, porque ya tratan esos campos como nulables
- [x] 6.3 `openspec validate --strict` sobre el change
