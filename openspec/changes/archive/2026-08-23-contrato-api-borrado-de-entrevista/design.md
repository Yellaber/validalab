## Context

Tercera y última pregunta abierta que dejó E4a sobre el contrato, y la única que no trata de integridad referencial sino de **ciclo de vida**.

El contrato ya declara la ida: `POST /ideas/{id}/entrevistas` mueve el contacto a `entrevistado`, y el embudo reserva ese estado a ese camino («el estado `entrevistado` MUST NOT ser alcanzable por esta vía: solo se asigna al registrar una entrevista»). Pero no declara la vuelta.

Tres hechos ya escritos delimitan por completo el espacio de soluciones:

1. **El embudo prohíbe los saltos** — `por_contactar → contactado → respondio → agendado → entrevistado → descartado`, y saltarse un paso responde `409`. Luego `entrevistado` tiene **un único predecesor posible**: `agendado`.
2. **Un contacto tiene como mucho una entrevista** — registrar sobre un contacto ya `entrevistado` responde `409`. No hay que decidir qué pasa «si quedan otras entrevistas»: nunca quedan.
3. **`entrevistado` no se abandona manualmente** — el embudo no ofrece salida, y `descartado` sería una mentira sobre lo ocurrido.

De ahí que la pregunta tenga una respuesta casi forzada, y que el interés del change esté menos en *qué* decidir que en *por qué el silencio era peligroso*.

## Goals / Non-Goals

**Goals:**
- Declarar el efecto del borrado de una entrevista sobre el contacto vinculado.
- Eliminar la trampa que dejaba a un contacto inentrevistable de forma permanente.
- Cerrar el ciclo de vida de `entrevistado` con la misma simetría con que se abre.
- Desbloquear `registro-de-entrevistas` sin supuestos.

**Non-Goals:**
- Permitir alcanzar o abandonar `entrevistado` por transición manual.
- Introducir historial de estados del contacto.
- Revisar qué ocurre con los KPIs ya calculados sobre una entrevista eliminada (RNF-15 los declara reconstruibles desde las entrevistas, así que se recalculan solos).

## Decisions

### D1 — Volver a `agendado`, y no es una suposición
El embudo no admite saltos, así que un contacto en `entrevistado` **estuvo necesariamente en `agendado`** justo antes. Restaurar ese valor no es adivinar un estado plausible: es reconstruir el único posible, sin necesidad de almacenar historial.

Es lo que hace que esta decisión sea barata de implementar y fácil de defender. Si el embudo permitiera varios predecesores, la respuesta correcta habría exigido historial o una elección arbitraria; no es el caso.

### D2 — Quedarse en `entrevistado` se descarta por la trampa que crea, no por elegancia
Es la alternativa aparentemente más simple: no hacer nada. Y sería defendible si `entrevistado` significara «esta persona fue entrevistada alguna vez», un hecho histórico que no caduca.

Pero choca con una regla ya escrita: registrar una entrevista sobre un contacto `entrevistado` responde `409`. Encadenadas, «no revertir» + «no re-registrar» convierten cualquier entrevista creada por error en **irreversible**: se puede borrar la entrevista, pero no registrar la correcta. Y como `entrevistado` tampoco se abandona por transición manual, no queda salida dentro del contrato.

El `DELETE` existe para corregir errores. Una operación de corrección que deja el sistema en un estado peor que antes está mal definida.

### D3 — Relajar el `409` se descarta por multiplicar las reglas
La tercera vía era conservar `entrevistado` y condicionar el `409` a que **exista** una entrevista, no a que el estado lo diga. Evita la trampa y preserva el histórico.

Se descarta porque sustituye una regla por dos y **desacopla el estado de su significado**: habría contactos `entrevistado` que sí admiten registrar una entrevista y otros que no, y para saber cuál es cuál habría que consultar las entrevistas. El estado del embudo dejaría de ser legible por sí mismo, que es justamente su función en el CRM y en los KPIs de alcance de E5.

### D4 — Se documenta como efecto declarado, en simetría con el `POST`
El `POST` ya dice «Crear la entrevista mueve el contacto al estado `entrevistado`». El `DELETE` gana la frase espejo. Escribirlas con la misma forma es deliberado: quien lea uno de los dos endpoints encontrará el otro extremo del ciclo redactado igual.

Con esto, `entrevistado` queda como el único estado del embudo con **entrada y salida automáticas**, ambas gobernadas por el ciclo de vida de la entrevista y ninguna por transición manual. Esa simetría es lo que lo hace fácil de recordar y difícil de implementar mal.

### D5 — Sin endpoints, esquemas ni códigos nuevos
Es un efecto de borde que pasa de indefinido a definido. No hay nada que añadir al catálogo `CodigoError`, ningún esquema que tocar y ninguna operación nueva. El diff es una descripción.

## Risks / Trade-offs

- **Se pierde el rastro de que esa persona llegó a ser entrevistada** → tras borrar la entrevista, el contacto vuelve a `agendado` y nada recuerda el intento. Es coherente: la entrevista *era* ese rastro, y el usuario decidió eliminarla. Si en algún momento se quisiera conservar el histórico, la respuesta correcta sería un borrado lógico de la entrevista, no un estado del contacto que sobreviva a su causa.
- **Un contacto que nunca pasó por `agendado`** → imposible con el embudo actual (no admite saltos), pero si en el futuro se relajara, esta regla necesitaría revisión. Queda anotado aquí para que quien toque el embudo lo vea.
- **Efecto en cascada no declarado explícitamente** → si el backend implementa el borrado de la entrevista y la reversión del estado en operaciones separadas, un fallo intermedio dejaría el contacto desincronizado. El contrato no puede exigir transaccionalidad, pero la simetría con el `POST` —que ya combina crear y mover— deja claro que se espera el mismo tratamiento.

## Migration Plan

No aplica. Es la definición de un efecto hasta ahora indefinido, y **hoy no puede dispararse**: no existe ninguna entrevista implementada que borrar. Cuando `registro-de-entrevistas` implemente el `DELETE`, la regla ya estará escrita.

## Open Questions

Ninguna. Con este change quedan cerradas las tres preguntas que E4a dejó abiertas sobre el contrato: el borrado de un guión en uso, la identidad de las preguntas ante un `PATCH` de reemplazo, el borrado de un contacto con evidencia y —ahora— el efecto de borrar una entrevista sobre su contacto.
