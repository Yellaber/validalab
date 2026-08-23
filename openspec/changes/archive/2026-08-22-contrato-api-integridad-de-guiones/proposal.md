## Why

El contrato define el CRUD de `/guiones` pero **calla sobre qué ocurre cuando el guión ya tiene evidencia colgando**. Son dos silencios, y los dos apuntan a lo mismo:

1. **`DELETE /guiones/{idGuion}`** solo documenta `204/401/403/404`. No hay `409` de recurso en uso ni se dice qué pasa con las entrevistas que lo referencian.
2. **`PATCH /guiones/{idGuion}`** reemplaza el conjunto ordenado de `preguntas`, y `PreguntaRequest` **no lleva `id`**: al escribir, la identidad de una pregunta es su posición. Nada garantiza entonces que los `preguntaId` de las `respuestas` ya registradas sigan resolviendo, ni —peor— que sigan significando lo mismo.

El segundo silencio es el grave, y no se arregla conservando identificadores. Aunque el servidor preservara el `id`, **editar el texto de una pregunta ya respondida corrompe la evidencia en silencio**: la respuesta «sí, mucho» seguiría colgando de `p1`, pero `p1` habría pasado de «¿te duele este problema?» a «¿pagarías por resolverlo?». El score de esa entrevista, los KPIs que lo agregan y el veredicto que los pondera quedarían apoyados en una pregunta que nadie contestó.

Eso choca de frente con **RNF-15** (todo KPI debe ser reconstruible desde las entrevistas que lo originan) y con la postura que el contrato ya sostiene en el resto del dominio: una idea **no se elimina, se archiva**, precisamente para conservar su evidencia.

Se cierra ahora, antes del segundo change de E4 (registro de entrevistas), que es donde ambos casos pasan de imposibles a alcanzables: hoy no existe ninguna entrevista que pueda referenciar un guión.

## What Changes

Una sola regla, aplicada en dos endpoints: **un guión con evidencia registrada es inmutable en su estructura.**

- **`DELETE /guiones/{idGuion}` responde `409 CONFLICTO`** cuando existe al menos una entrevista que lo referencia. Un guión sin entrevistas se sigue eliminando con `204`.
- **`PATCH /guiones/{idGuion}` responde `409 CONFLICTO`** cuando el cuerpo incluye `preguntas` y el guión ya tiene entrevistas. `nombre` y `descripcion` **siguen siendo editables** en ese caso: no participan en la evidencia, así que corregir el título de un guión en uso es legítimo.
- **Sin entrevistas, nada cambia:** `preguntas` se reemplaza libremente y los `id` que el servidor asigne son irrelevantes, porque no hay ninguna respuesta que los referencie. Por eso **`PreguntaRequest` sigue sin `id`** y no se toca ningún esquema.
- Se documenta explícitamente en la descripción de ambos endpoints **por qué** existe el `409`, para que un implementador no lo lea como una restricción arbitraria.

No se añaden códigos de error: `CONFLICTO` ya está en el catálogo `CodigoError` y ya se usa con esta misma semántica de conflicto de estado (transición de outreach inválida, tercer toque, contacto ya entrevistado).

**Fuera de alcance**: duplicar un guión como vía para «editar» uno congelado, y versionar guiones (copia al escribir) para permitir editar conservando la evidencia exacta. Ambas son respuestas legítimas al coste que este cambio acepta; ninguna es necesaria para el MVP y las dos añaden concepto y endpoints nuevos.

## Capabilities

### Modified Capabilities
- `entrevistas`: el requisito de gestión de guiones gana la regla de **inmutabilidad estructural ante evidencia** — un guión referenciado por al menos una entrevista no puede eliminarse ni ver reemplazadas sus `preguntas` (`409 CONFLICTO`), mientras que su `nombre` y `descripcion` siguen siendo editables.

## Impact

- **`contrato-api/openapi.yaml`**: se añade la respuesta `409` a `DELETE /guiones/{idGuion}` y a `PATCH /guiones/{idGuion}`, y se amplía la descripción de ambos. **Ningún esquema cambia**: `PreguntaRequest` sigue sin `id` y `Guion` no gana campos.
- **Backend**: el módulo de entrevistas debe comprobar la existencia de entrevistas que referencien el guión antes de borrar, y antes de aceptar `preguntas` en el `PATCH`.
- **Frontend**: el editor de guiones recién entregado (E4a) **no necesita cambios estructurales** —sigue sin enviar `id` y sigue mandando el conjunto completo—, solo traducir los dos `409` nuevos a un mensaje que explique la regla. Es exactamente el patrón de traducción por operación que E3 ya estableció para los dos `409` de contactos.
- **Coste aceptado**: una errata en un guión ya usado no se puede corregir en sus preguntas. Es el precio de que una respuesta signifique siempre lo que se preguntó.
- **Aguas abajo**: desbloquea el segundo change de E4 (registro de entrevistas y scoring), que era donde estos dos casos se volvían alcanzables.
