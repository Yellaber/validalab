## Context

`contrato-api/openapi.yaml` declara `openapi: 3.1.0` en su primera línea y usa veinte veces `nullable: true`, palabra clave que solo existe en 3.0. OpenAPI 3.1 se alineó con JSON Schema 2020-12, donde `type` admite un array y la nulabilidad se expresa con el tipo `null`.

Las veinte ocurrencias no son homogéneas. Se reparten en dos formas con consecuencias distintas:

| Forma | Cuántas | Qué ocurre hoy en 3.1 |
| --- | --- | --- |
| `type: X` + `nullable: true` | 15 | La propiedad se lee como no nulable; el `nullable` se ignora |
| `allOf: [$ref]` + `nullable: true` | 5 | Igual, pero la propiedad **es** un `$ref` obligatorio y su descripción afirma que puede ser `null` |

La segunda forma es el apaño conocido de 3.0: como allí un `$ref` no admite hermanos, se envolvía en `allOf` para poder añadirle `nullable`. En 3.1 el envoltorio sobra y la palabra clave no hace nada.

Las cinco afectadas son `score` y `ajuste` de la entrevista, `verificacion` del veredicto y las dos `proveedor` del costo. No es casualidad que sean esas: son exactamente los campos que llegan vacíos hasta que ocurre algo —el agente puntúa, el humano verifica, el usuario configura su BYOK—, o sea, los que un cliente **debe** tratar como nulables.

## Goals / Non-Goals

**Goals:**
- Que el documento sea válido para la versión que declara.
- Que las cinco propiedades con `$ref` vuelvan a ser nulables para las herramientas, no solo en su descripción.
- Que la validez se verifique sola, en vez de depender de que alguien recuerde ejecutar el linter.

**Non-Goals:**
- Cambiar qué propiedades son nulables. La nulabilidad declarada hoy en prosa se conserva exactamente.
- Resolver los tres avisos restantes del linter.
- Tocar backend o frontend, que ya tratan estos campos como nulables.

## Decisions

### D1 — Escalares: `type: [X, 'null']`
Es la forma canónica en 3.1 y la traducción directa de la intención original.

La alternativa sería `oneOf: [{type: X}, {type: 'null'}]`, equivalente en semántica y peor en legibilidad: convierte una línea en cuatro y esconde el tipo real tras una composición. `type` como array existe precisamente para este caso.

El `'null'` va entrecomillado en YAML a propósito: sin comillas, YAML lo interpreta como el valor nulo y el esquema queda `type: [string, null]`, que no es lo mismo que el **tipo** `null` de JSON Schema. Es el error clásico de esta migración y la razón de que la verificación del change no se limite a que el linter pase, sino que compruebe el YAML ya parseado.

### D2 — `$ref` nulable: `oneOf` con rama `type: 'null'`, no `anyOf`
En 3.1 un `$ref` sí admite hermanos, así que la tentación es dejar el `$ref` y añadirle algo. Pero no hay forma de marcar un `$ref` como nulable sin composición: `type: 'null'` junto a un `$ref` no se combina, se yuxtapone.

Entre las dos composiciones posibles:

- **`anyOf`** — «valida contra al menos una». Es lo que muchos generadores emiten por defecto y es más permisivo.
- **`oneOf`** — «valida contra exactamente una». Más estricto y más expresivo de la intención: el valor es *o* el objeto *o* nulo, nunca ambos.

Se elige `oneOf` porque las dos ramas son **disjuntas por construcción** —un objeto nunca valida contra `type: 'null'`—, así que la estrictez de `oneOf` no introduce riesgo de ambigüedad y sí comunica mejor que se trata de una alternativa excluyente. `anyOf` sería la opción correcta si las ramas pudieran solaparse, que no es el caso.

El `allOf` de envoltorio desaparece: existía solo para sortear la limitación de 3.0 y mantenerlo sería arrastrar el apaño sin su motivo.

### D3 — La `description` se conserva palabra por palabra
Cada una de las cinco propiedades lleva una descripción que explica **cuándo** llega nula («`null` mientras el scoring está `pendiente`», «`null` si el usuario no lo ha ajustado»). Esa información no la aporta el esquema —el esquema dice *que* puede ser nulo, no *cuándo*— y es la más útil para quien consume la API.

Se conserva intacta. El cambio es de forma, no de contenido.

### D4 — El gate en el CI es lo que impide la recaída
Corregir las veinte ocurrencias sin añadir la verificación resolvería el síntoma. El contrato lleva meses con sintaxis inválida precisamente porque **nada la comprobaba**: el linter existía pero solo se ejecutaba cuando alguien se acordaba.

El job nuevo ejecuta `redocly lint` sobre el documento. Tras esta corrección quedan 0 errores, así que entra en verde de inmediato; los tres avisos no rompen el build, lo que evita el arranque incómodo de un gate que nace en rojo y hay que silenciar.

Se deja como job propio en vez de añadirlo al del backend porque el contrato no pertenece a ningún paquete: es la frontera entre los dos y su verificación no debería depender del job de uno de ellos.

### D5 — La verificación comprueba el documento parseado, no solo que el linter pase
Que `redocly lint` dé 0 errores es necesario y no suficiente: el error de las comillas de D1 produce un documento que el linter acepta y que significa algo distinto de lo que se quería.

Por eso la verificación incluye inspeccionar el YAML ya parseado y confirmar, propiedad a propiedad, que las veinte quedaron nulables — y que el número de propiedades nulables antes y después coincide, para descartar tanto haber perdido alguna como haber hecho nulable algo que no lo era.

## Risks / Trade-offs

- **Un cliente ya generado verá cambiar sus tipos** → es la corrección misma: pasarán a ser nulables los campos que siempre lo fueron. Preferible a que un cliente asuma que `score` nunca es nulo y falle con la primera entrevista pendiente.
- **`oneOf` es más estricto que `anyOf`** → sin riesgo aquí porque las ramas son disjuntas (D2), pero queda anotado por si algún día una de esas referencias pasara a admitir el nulo por sí misma.
- **El `'null'` sin comillas** → mitigado por D5, que lo detectaría; se anota aquí porque es el fallo más probable de esta migración y no lo delata el linter.
- **El gate podría bloquear un PR por un aviso convertido en error en una versión futura de redocly** → se ejecuta con `npx @redocly/cli@latest`, así que una versión nueva podría endurecer reglas. Es el mismo compromiso que ya se acepta en el resto del toolchain, y el coste de fijar la versión es quedarse atrás en las comprobaciones.

## Migration Plan

Ninguna migración de datos ni de despliegue: el cambio es sintáctico y no altera ninguna respuesta real de la API.

Para consumidores del contrato que generen clientes: regenerar y ajustar los tipos que pasen a ser nulables. En este repositorio no aplica — el frontend escribe sus modelos a mano y ya los declara nulables.

## Open Questions

Ninguna. Las dos formas de migración y el alcance (corregir y añadir el gate, sin tocar los tres avisos) quedan decididos.
