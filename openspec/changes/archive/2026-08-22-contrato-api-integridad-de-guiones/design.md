## Context

El contrato ya define el CRUD de `/guiones` y el de `/ideas/{id}/entrevistas`, y las une con dos referencias: `Entrevista.guionId` apunta al guión, y cada `RespuestaEntrevista.preguntaId` apunta a una pregunta **dentro** de ese guión. Esa segunda referencia es la delicada: es la que convierte un texto capturado en una respuesta *a algo*.

El contrato no dice nada sobre qué pasa con esas referencias cuando el guión se borra o se edita. Hoy no importa —no existe ninguna entrevista, porque el registro llega en el segundo change de E4—, pero en cuanto exista, importa mucho:

- `ActualizarGuionRequest` describe `preguntas` como **reemplazo del conjunto ordenado**.
- `PreguntaRequest` **no acepta `id`**, así que el servidor no recibe ninguna señal de correspondencia entre las preguntas que llegan y las que ya tenía.
- `DELETE` solo documenta `204/401/403/404`.

Dos restricciones del dominio enmarcan la decisión. **RNF-15**: todo KPI debe ser reconstruible desde las entrevistas que lo originan. Y la postura que el contrato ya sostiene en otro sitio: una **idea no se elimina, se archiva** (`POST /ideas/{id}/archivar`, con `desarchivar` que la devuelve «conservando su evidencia»). El contrato ya eligió conservar por encima de borrar.

## Goals / Non-Goals

**Goals:**
- Cerrar los dos silencios con una regla única y explicable, no con dos parches.
- Garantizar que un `preguntaId` registrado en una respuesta siga resolviendo **y siga significando lo mismo**.
- No romper el frontend de E4a ya entregado ni obligar a cambiar ningún esquema.
- Dejar escrito el **porqué** en el propio contrato, no solo en este documento.

**Non-Goals:**
- Versionar guiones (copia al escribir) para permitir editar conservando la evidencia exacta.
- Duplicar un guión como vía de escape para «editar» uno congelado.
- Resolver el mismo silencio en `DELETE /ideas/{id}/contactos/{idContacto}` (ver Open Questions).
- Cambiar el comportamiento de un guión **sin** entrevistas: ahí no hay nada que proteger.

## Decisions

### D1 — Una sola regla: un guión con evidencia es inmutable en su estructura
Los dos silencios son el mismo problema visto desde dos verbos, así que se responden con un único principio: **si al menos una entrevista referencia el guión, su estructura queda congelada**. Borrarlo responde `409`; reemplazar sus `preguntas` responde `409`.

Formularlo como una regla y no como dos respuestas independientes importa para quien lo implemente: la comprobación es la misma consulta («¿existe alguna entrevista con este `guionId`?») en los dos endpoints, y el mensaje al usuario es el mismo concepto.

### D2 — Congelar, en vez de conservar el `id` de cada pregunta
La alternativa evidente era añadir `id` opcional a `PreguntaRequest` para que el cliente devolviera la identidad de las preguntas preexistentes y el servidor las conservara. **Se descarta**, y la razón es la que hace interesante este cambio: conservar el `id` resuelve el enlace pero **no** el significado.

Con `id` preservado, un usuario puede cambiar el texto de `p1` de «¿te duele este problema?» a «¿pagarías por resolverlo?». Todas las respuestas ya registradas siguen colgando de `p1` sin error visible, pero ahora dicen otra cosa. El score de esas entrevistas, los KPIs que las agregan y el veredicto que los pondera quedan apoyados en una pregunta que nadie contestó — y **nada en el sistema lo señala**. Una corrupción silenciosa es peor que un `409` explícito.

Congelar también tiene una virtud práctica: al no haber nada que preservar cuando el guión no tiene evidencia, **`PreguntaRequest` no cambia**. Ningún esquema se toca y el editor de E4a sigue siendo correcto tal cual está.

### D3 — El congelado alcanza a `preguntas`, no al guión entero
`nombre` y `descripcion` **no participan en la evidencia**: ninguna respuesta los referencia y ningún score depende de ellos. Corregir el título de un guión en uso —o describir mejor para qué sirve— es legítimo y no compromete nada.

Por eso el `409` del `PATCH` se condiciona a que el cuerpo **incluya `preguntas`**, no a que el guión tenga evidencia. Un `PATCH` con solo `nombre` sobre un guión con cien entrevistas responde `200`.

### D4 — `409 CONFLICTO`, sin código de error nuevo
`CONFLICTO` ya está en `CodigoError` y ya cubre exactamente esta clase de caso: «conflicto de estado» — transición de outreach inválida, tercer toque sobre un contacto, contacto ya `entrevistado`. El estado aquí es «este guión ya tiene evidencia».

Se descarta introducir un código específico (`GUION_EN_USO` o similar): obligaría a todos los clientes a ampliar su catálogo por un caso que el código existente describe bien, y el catálogo estable es justamente lo que no conviene inflar. El cliente distingue el motivo por la **operación que invocó**, que es el patrón que E3 ya estableció para los dos `409` distintos de contactos.

### D5 — El porqué se escribe en el contrato, no solo aquí
Las descripciones de ambos endpoints explican que el `409` protege la correspondencia entre `preguntaId` y el texto que se preguntó. Sin esa frase, un implementador razonable puede leer la restricción como burocracia y sentirse tentado de relajarla; con ella, entiende que está sosteniendo RNF-15.

## Risks / Trade-offs

- **Una errata en un guión ya usado no se puede corregir** → es el coste consciente de la decisión. Mitigación disponible sin tocar el contrato: crear un guión nuevo corregido y usarlo en adelante; las entrevistas viejas conservan el suyo, que es exactamente lo que se quiere. Si en uso real molesta, la respuesta correcta es el versionado (Non-Goal), no relajar el `409`.
- **El usuario puede leer el `409` como un fallo del sistema** → mitigación: el frontend debe traducirlo explicando la regla («este guión ya tiene entrevistas; sus preguntas no pueden cambiar para que las respuestas sigan significando lo mismo»), como ya hace E3 con el límite de dos toques. La UI debería además **retirar la acción** cuando sepa que el guión tiene evidencia, en vez de ofrecerla y fallar.
- **Comprobación extra en dos endpoints** → una consulta de existencia por `guionId` antes de borrar o de aceptar `preguntas`. Coste despreciable frente a la corrupción que evita.
- **Asimetría con `contactos`** → `DELETE` de un contacto con entrevistas sigue sin definir un `409`, y ese caso rompe RNF-14 de forma más directa. Se deja fuera de alcance a propósito (ver Open Questions) para no expandir un change que el usuario pidió acotado a los guiones.

## Migration Plan

No aplica. El cambio es aditivo sobre el contrato (dos respuestas `409` nuevas) y **hoy no puede dispararse**: no existe ningún endpoint que cree entrevistas, así que ningún guión tiene evidencia. Cuando el registro de entrevistas llegue en el segundo change de E4, la regla ya estará escrita — que es exactamente por lo que se cierra ahora y no después.

## Open Questions

- **El contrato declara `openapi: 3.1.0` pero usa `nullable: true` en 20 esquemas.** `nullable` es una palabra clave de OpenAPI 3.0 que **3.1 eliminó**; la forma correcta es `type: ['string', 'null']`. `redocly lint` lo reporta como 20 errores `struct`, todos preexistentes y ajenos a este change (se verificó que el recuento es idéntico antes y después). No rompe la lectura humana del documento ni el desarrollo actual, pero **sí rompería cualquier generación de tipos o validación automática** a partir del contrato. Afecta a esquemas de todos los dominios, así que merece su propio change en vez de colarse aquí.
- **`DELETE /ideas/{id}/contactos/{idContacto}` tiene el mismo silencio.** Un contacto con entrevistas puede eliminarse según el contrato actual, y eso rompe **RNF-14** («una entrevista no puede existir sin idea y contacto válidos») de forma más directa que el caso del guión. La respuesta coherente con este change es el mismo `409 CONFLICTO`. Se deja fuera porque este change se acotó a las dos preguntas de guiones, pero **conviene cerrarlo antes de E4b**, junto con el resto de invariantes de RNF-14.
