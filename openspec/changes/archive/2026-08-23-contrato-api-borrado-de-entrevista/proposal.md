## Why

El contrato declara que **registrar** una entrevista mueve el contacto a `entrevistado`, pero calla sobre el camino inverso: `DELETE /ideas/{id}/entrevistas/{idEntrevista}` solo documenta `204/401/403/404` y no dice qué ocurre con el estado del contacto.

Ese silencio no es cosmético, porque se cruza con otra regla ya escrita: registrar una entrevista sobre un contacto ya `entrevistado` responde `409 CONFLICTO`. Encadenadas, ambas producen una **trampa**:

1. El usuario registra una entrevista por error —contacto equivocado, guión equivocado.
2. La borra, que es exactamente lo que el `DELETE` existe para permitir.
3. El contacto sigue en `entrevistado`, así que registrar la entrevista correcta responde `409`.

Esa persona queda **inentrevistable de forma permanente**, sin ninguna vía de corrección en el contrato: `entrevistado` tampoco se alcanza ni se abandona por transición manual, porque el embudo lo reserva al registro de entrevistas. El único escape sería borrar el contacto y volver a crearlo, perdiendo su historial de outreach — y, tras `contrato-api-integridad-de-contactos`, ni siquiera eso mientras tenga entrevistas.

Se cierra ahora porque el change `registro-de-entrevistas` (E4b-1) implementa precisamente ese `DELETE`, y su selector de contactos entrevistables depende de la respuesta.

## What Changes

- **`DELETE /ideas/{id}/entrevistas/{idEntrevista}` devuelve el contacto vinculado al estado `agendado`.** Se documenta como efecto declarado del endpoint, simétrico al que ya declara el `POST` («crear la entrevista mueve el contacto a `entrevistado`»).
- **`agendado` no es una elección arbitraria**: el embudo prohíbe los saltos y `entrevistado` **solo** es alcanzable desde `agendado`, así que es demostrablemente el estado inmediatamente anterior. El contrato no necesita almacenar historial para restaurarlo.
- Se documenta el **porqué**: sin la reversión, el `409` de «contacto ya entrevistado» convertiría cualquier registro erróneo en irreversible.

No se añaden endpoints, esquemas ni códigos de error. Es un efecto de borde que pasa de indefinido a definido.

**Fuera de alcance**: permitir que `entrevistado` se alcance o se abandone por transición manual (el embudo lo reserva deliberadamente al registro de entrevistas), y cualquier noción de historial de estados del contacto.

## Capabilities

### Modified Capabilities
- `entrevistas`: el requisito de eliminación de una entrevista declara su **efecto sobre el contacto vinculado** — devolverlo a `agendado`, cerrando el ciclo que abre el registro.
- `contactos`: el requisito del embudo de outreach precisa que, además de asignarse al registrar una entrevista, el estado `entrevistado` **se abandona** al eliminarla, y que ninguno de los dos caminos es una transición manual.

## Impact

- **`contrato-api/openapi.yaml`**: se amplía la descripción de `DELETE /ideas/{id}/entrevistas/{idEntrevista}`. **Ningún esquema, endpoint ni código de error nuevo.**
- **Backend**: al eliminar una entrevista, el módulo debe devolver su contacto a `agendado`. Es la operación inversa de la que ya realiza al crearla.
- **Frontend**: desbloquea el selector de contactos entrevistables de `registro-de-entrevistas` (E4b-1), que excluye los estados `entrevistado` y `descartado`. Con esta regla, un contacto cuya entrevista se elimina **vuelve a aparecer** en el selector, que es el comportamiento que el usuario espera tras corregir un error.
- **Coherencia del embudo**: `entrevistado` queda como el único estado con entrada **y salida** automáticas, ambas gobernadas por el ciclo de vida de la entrevista y ninguna por transición manual. La simetría es lo que hace la regla fácil de recordar.
- **Aguas abajo**: con esto, las tres preguntas abiertas que dejó E4a sobre el contrato quedan cerradas y E4b-1 puede implementarse sin supuestos.
