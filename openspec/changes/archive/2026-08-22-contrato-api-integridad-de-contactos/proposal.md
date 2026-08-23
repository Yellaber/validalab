## Why

`DELETE /ideas/{id}/contactos/{idContacto}` solo documenta `204/401/403/404`. No define qué ocurre si el contacto ya tiene entrevistas registradas, ni qué pasa con esas entrevistas.

Es el mismo silencio que se cerró para los guiones en `contrato-api-integridad-de-guiones`, pero aquí **lo que se rompe es más grave**. Con un guión borrado quedaban colgando los `preguntaId` de las respuestas. Con un contacto borrado se viola directamente **RNF-14**, que el contrato ya declara como invariante duro:

> Una entrevista **no puede existir** sin idea y contacto válidos del mismo usuario.

El contrato defiende esa invariante **al crear** —una entrevista con `contactoId` inválido responde `422 ENTREVISTA_SIN_VINCULO`— pero la deja indefensa **al borrar**. Hoy nada impide dejar una entrevista en el estado exacto que el `422` existe para prevenir. Una invariante que solo se comprueba en la puerta de entrada no es una invariante.

Además, esa entrevista huérfana seguiría alimentando los KPIs de outreach y el veredicto, apoyados en un contacto que ya no existe y sobre el que no se puede verificar nada — contra **RNF-15** (todo KPI debe ser reconstruible desde las entrevistas que lo originan).

Se cierra ahora, junto con el de guiones y antes del segundo change de E4, que es donde el caso pasa de imposible a alcanzable.

## What Changes

- **`DELETE /ideas/{id}/contactos/{idContacto}` responde `409 CONFLICTO`** cuando existe al menos una entrevista que referencie el contacto. Un contacto sin entrevistas se sigue eliminando con `204`.
- Se documenta en la descripción del endpoint **por qué** existe el `409` (RNF-14) y **cuál es la vía** si el usuario realmente quiere deshacerse del contacto: eliminar antes sus entrevistas con `DELETE /ideas/{id}/entrevistas/{idEntrevista}`, que ya existe en el contrato.
- **La condición es la existencia de entrevistas, no el estado del contacto.** Un contacto en estado `entrevistado` cuyas entrevistas se hayan eliminado **sí** puede borrarse: no queda nada que quede huérfano. Esta precisión importa porque el contrato no dice que borrar una entrevista revierta el estado del contacto, así que `estado == 'entrevistado'` y «tiene entrevistas» **pueden divergir**, y la invariante que se protege es la segunda.

No se añaden códigos de error: `CONFLICTO` ya está en `CodigoError` y ya se usa con esta semántica en el propio tag `contactos` (transición de embudo inválida, tercer toque).

**Fuera de alcance**: definir si eliminar una entrevista debe revertir el estado del contacto (ver Open Questions), y el borrado en cascada de entrevistas al borrar el contacto, descartado por destruir evidencia.

## Capabilities

### Modified Capabilities
- `contactos`: el requisito de eliminación gana la condición de **integridad referencial ante evidencia** — un contacto referenciado por al menos una entrevista no puede eliminarse (`409 CONFLICTO`), en defensa de RNF-14.

## Impact

- **`contrato-api/openapi.yaml`**: se añade la respuesta `409` a `DELETE /ideas/{id}/contactos/{idContacto}` y se amplía su descripción. **Ningún esquema cambia.**
- **Backend**: el módulo de contactos debe comprobar la existencia de entrevistas con ese `contactoId` antes de eliminar. Es la misma consulta de existencia que ya exige la regla de guiones, sobre otra columna.
- **Frontend**: el detalle de contacto (E3) ya maneja dos `409` distintos con mensajes por operación; este es un tercero, sobre la operación de borrado. La UI debería además **retirar la acción de eliminar** cuando sepa que el contacto tiene entrevistas, en vez de ofrecerla y fallar — el mismo criterio que aplica al límite de dos toques.
- **Sin trampa para el usuario**: a diferencia del guión congelado, aquí sí hay salida. Si de verdad quiere eliminar el contacto, borra primero sus entrevistas. La regla no impide nada; obliga a que destruir evidencia sea **explícito y por entrevista**, no un efecto colateral silencioso de borrar una ficha.
- **Aguas abajo**: junto con `contrato-api-integridad-de-guiones`, deja cerradas las dos referencias que una entrevista mantiene hacia fuera (`guionId` y `contactoId`) antes de que el registro de entrevistas exista.
