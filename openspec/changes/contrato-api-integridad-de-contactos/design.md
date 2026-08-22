## Context

Una `Entrevista` mantiene dos referencias hacia fuera: `guionId` y `contactoId`. El change `contrato-api-integridad-de-guiones` cerró la primera. Esta cierra la segunda, que es la que el SRS eleva a invariante explícita.

**RNF-14** dice que una entrevista no puede existir sin idea y contacto válidos del mismo usuario, y el contrato ya la defiende en la creación: `POST /ideas/{id}/entrevistas` responde `422 ENTREVISTA_SIN_VINCULO` si el `contactoId` no es un contacto de esa idea. Pero `DELETE /ideas/{id}/contactos/{idContacto}` no dice nada, así que el mismo estado que el `422` rechaza en la entrada se puede alcanzar por la puerta de atrás.

Hay una asimetría con el caso del guión que conviene tener presente al diseñar: **el contrato ya ofrece `DELETE /ideas/{id}/entrevistas/{idEntrevista}`**. Es decir, el usuario *puede* deshacerse de la evidencia si quiere. Eso cambia el carácter de la regla: no encierra a nadie, solo obliga a que borrar evidencia sea un acto explícito.

## Goals / Non-Goals

**Goals:**
- Defender RNF-14 también en el borrado, no solo en la creación.
- Condicionar la regla a la **existencia de entrevistas**, no al estado del contacto, que puede divergir.
- Mantener la coherencia con la regla de guiones: mismo `409`, misma forma de comprobación, mismo criterio de escribir el porqué en el contrato.
- No cambiar ningún esquema ni añadir códigos de error.

**Non-Goals:**
- Definir si eliminar una entrevista revierte el estado del contacto (ver Open Questions).
- Borrado en cascada de entrevistas al eliminar el contacto.
- Impedir el borrado de entrevistas: eliminar evidencia deliberadamente es legítimo y ya está en el contrato.
- Revisar el resto de borrados del contrato en busca del mismo patrón.

## Decisions

### D1 — `409 CONFLICTO` cuando existan entrevistas que referencien el contacto
Misma forma y mismo código que la regla de guiones. La comprobación es una consulta de existencia (`¿hay alguna entrevista con este contactoId?`) antes de aceptar el borrado.

Se descarta el **borrado en cascada** (eliminar el contacto arrastra sus entrevistas): destruiría evidencia como efecto colateral de una acción que el usuario percibe como «quitar una ficha del CRM». La descripción del endpoint llama al contacto «registrado por error», que es precisamente el caso en que no hay entrevistas.

Se descarta también **permitir el borrado dejando la entrevista huérfana**: es exactamente el estado que `ENTREVISTA_SIN_VINCULO` existe para prevenir.

### D2 — La condición es «tiene entrevistas», no «su estado es `entrevistado`»
Esta es la decisión no obvia del change. Parece equivalente —el contrato dice que crear una entrevista mueve el contacto a `entrevistado`, y que ese estado *solo* lo origina ese camino— pero **no lo es**, porque el contrato **no dice** que eliminar una entrevista revierta el estado.

Un contacto puede entonces quedar en `entrevistado` con cero entrevistas. Si la regla mirase el estado, ese contacto sería imborrable para siempre sin que nada quedara colgando: una restricción sin propósito. Mirando la existencia de entrevistas, se comporta bien: no hay referencias, se borra.

La invariante que se protege es referencial, así que la condición tiene que ser referencial. El estado es un reflejo del proceso de outreach, no la fuente de verdad sobre la evidencia.

### D3 — La descripción señala la vía de escape
A diferencia del guión congelado, aquí el usuario tiene salida: `DELETE /ideas/{id}/entrevistas/{idEntrevista}` ya existe. La descripción del endpoint lo dice explícitamente, porque un `409` sin salida indicada se lee como un muro.

Esto también fija la postura del producto: destruir evidencia **se puede**, pero es un acto deliberado y por entrevista, nunca un efecto colateral de borrar un contacto.

### D4 — Sin código de error nuevo
`CONFLICTO` ya cubre el conflicto de estado y **ya se usa dos veces en este mismo tag** (transición de embudo inválida, tercer toque). Un tercer uso sobre otra operación del mismo recurso es coherente; el cliente distingue el motivo por la operación que invocó, patrón que el frontend de E3 ya implementa.

### D5 — El porqué se escribe en el contrato
Como en el change de guiones: la descripción cita RNF-14 explícitamente. Sin esa referencia, la restricción se lee como celo burocrático y alguien la relajará; con ella, se entiende que sostiene una invariante declarada del sistema.

## Risks / Trade-offs

- **Un contacto con entrevistas requiere dos pasos para borrarse** → borrar antes sus entrevistas. Es el coste buscado: hace visible que se está destruyendo evidencia. Mitigación: la descripción lo indica y el frontend puede explicarlo en el mensaje del `409`.
- **La UI puede ofrecer una acción condenada a fallar** → el cliente no siempre sabe si el contacto tiene entrevistas al pintar el detalle. Mitigación: el frontend traduce el `409` explicando la regla, y cuando disponga del dato (E4b, al listar las entrevistas de la idea) puede retirar la acción por adelantado. Mismo criterio que el límite de dos toques en E3.
- **Comprobación extra en el borrado** → una consulta de existencia por `contactoId`. Despreciable frente a la invariante que protege.
- **Coherencia pendiente en el resto del contrato** → no se ha auditado si otros borrados tienen el mismo patrón. Se acota a propósito; este change responde a una pregunta concreta ya identificada.

## Migration Plan

No aplica. Es aditivo (una respuesta `409` nueva) y **hoy no puede dispararse**: no existe ningún endpoint implementado que cree entrevistas, así que ningún contacto tiene evidencia asociada. Cuando el registro de entrevistas llegue en E4b, la regla ya estará escrita.

## Open Questions

- **¿Eliminar una entrevista revierte el estado del contacto?** El contrato dice que crear una entrevista mueve el contacto a `entrevistado` y que ese estado no se alcanza por transición manual, pero calla sobre el borrado. Quedan dos lecturas: el contacto se queda en `entrevistado` (y entonces el estado deja de significar «tiene una entrevista registrada»), o vuelve a un estado anterior (¿a cuál? `agendado` es la única respuesta razonable, pero es una suposición). Este change **no depende** de la respuesta —D2 lo deja explícitamente al margen— pero la ambigüedad sigue ahí y conviene cerrarla en E4b, cuando el borrado de entrevistas sea alcanzable.
