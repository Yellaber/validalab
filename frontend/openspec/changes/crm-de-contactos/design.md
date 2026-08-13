## Context

E3 es la tercera épica de dominio del frontend y la primera que modela un **proceso**, no un formulario: los contactos avanzan por un embudo con transiciones gobernadas y con un límite duro de dos toques. E1 y E2 dejaron el patrón de feature de dominio resuelto (servicio de recurso, `httpResource`, Signal Forms, rutas hijas del shell, errores por `codigo`), así que aquí se aplica sin reinventarlo; lo nuevo son las reglas del embudo.

Dos hechos del contrato mandan sobre el diseño:

- **El `estado` es `readOnly` en `Contacto`.** No se edita con el `PATCH` de contenido: se mueve con `POST .../estado`. Contenido y posición en el embudo son dos superficies distintas.
- **`entrevistado` no es alcanzable manualmente.** Solo lo origina el registro de una entrevista (E4). Pedirlo en la transición responde `409`. Pero un contacto **sí puede estar** en ese estado, así que la vista tiene que saber mostrarlo y filtrarlo sin ofrecerlo como destino.

El `Contacto` es además **información personal**: el aislamiento por propietario deja de ser una cuestión de correción y pasa a ser de privacidad.

## Goals / Non-Goals

**Goals:**
- CRUD de `Contacto` bajo una idea propia, con listado paginado y filtrado por estado del embudo.
- Transiciones del embudo que solo ofrezcan destinos alcanzables, sin ofrecer nunca `entrevistado`.
- Registro de toques con el límite de dos reflejado en la UI, no solo en el error del backend.
- Vínculo de referido (`referidoPorId`) restringido a contactos de la misma idea.
- Traducir los dos `409` distintos del tag a mensajes que expliquen la regla, no el código.

**Non-Goals:**
- Originar el estado `entrevistado` (E4) ni registrar entrevistas.
- Calcular los KPIs de alcance que se derivan de este embudo (E5).
- Importación masiva de contactos, deduplicación o integración con LinkedIn/correo: el contrato no los contempla.
- Recordatorios o programación del segundo toque: no hay endpoint ni modelo para ello.
- Un tablero kanban con arrastre: descartado en la propuesta por incompatibilidad con la paginación del contrato.

## Decisions

### D1 — Un `ContactosService` para todo el tag
Un único servicio `providedIn: 'root'` concentra las siete operaciones (`crear`, `listar`, `consultar`, `editar`, `eliminar`, `transicionar`, `registrarToque`), devolviendo los tipos del contrato. El `ideaId` se interpola siempre en el path y nunca viaja en el cuerpo, igual que en E2. Se mantiene un solo servicio —y no uno para contenido y otro para embudo— porque todas las operaciones actúan sobre el mismo recurso y comparten la ruta base; separarlas dispersaría el contrato sin ganar nada.

### D2 — La lista reutiliza el patrón del portafolio, con el filtro del contrato
`httpResource` cuya *request* deriva de los signals `pagina`/`porPagina`/`filtroEstado`, exactamente como `features/ideas/lista/`. El filtro se envía como el parámetro `estado` del contrato, así que filtrar es una petición nueva, no un recorte en cliente: los recuentos y la paginación siguen siendo los del servidor.

### D3 — El filtro ofrece los seis estados; la transición ofrece un subconjunto
Son dos catálogos distintos con la misma unión de tipos, y conviene no confundirlos. **Filtrar** por `entrevistado` es legítimo —hay contactos ahí, puestos por E4— y la lista debe permitirlo. **Transicionar** a `entrevistado` no lo es. El código expresa esa diferencia con dos constantes separadas (`ESTADOS_FILTRO` y la función de destinos alcanzables), no con una sola lista filtrada en el punto de uso.

### D4 — Los destinos alcanzables se derivan de una tabla local, que nunca sustituye al `409`
El contrato describe el orden del embudo en prosa (`por_contactar → contactado → respondio → agendado → entrevistado → descartado`, con `descartado` alcanzable desde cualquier estado no terminal) pero no expone una representación consultable de las transiciones. El cliente encodea esa tabla para **no ofrecer acciones condenadas a fallar**, que es una cuestión de calidad de UI.

Es una duplicación consciente de una regla que gobierna el backend, y se acota así: la tabla solo decide **qué botones se pintan**; la autoridad sigue siendo el servidor y el `409 CONFLICTO` se maneja y se muestra igual. Si la tabla se desincronizara del backend, el peor caso es ofrecer una acción que falla con un mensaje claro, no corromper nada. Alternativa descartada: ofrecer los seis estados y dejar que el backend rechace — convierte el error en el mecanismo de descubrimiento de la regla.

### D5 — El número de toques se deriva de las fechas, no se cuenta aparte
`primerToqueEn` y `segundoToqueEn` son los únicos datos de toque del contrato, ambos `readOnly` y anulables. El cliente deriva de ellos «0, 1 o 2 toques» y **retira la acción de registrar cuando ya hay dos**. No se introduce ningún contador local: sería un tercer estado que podría desincronizarse de las dos fechas que son la verdad.

El límite se comunica **antes** de intentarlo (la acción desaparece y se explica por qué), no solo al recibir el `409`. La disciplina de no insistir más allá del follow-up es parte del método, así que la UI la presenta como una regla del proceso y no como un fallo del sistema.

### D6 — La `fecha` del toque es opcional y por defecto se omite
El contrato permite registrar un toque sin cuerpo, asumiendo el momento actual. La UI ofrece un campo de fecha opcional —útil para anotar un toque hecho fuera de la herramienta— y **omite el campo** cuando está vacío, en vez de enviar la fecha de ahora calculada en el cliente. Así el reloj de referencia sigue siendo el del servidor.

### D7 — El selector de referido se carga bajo demanda y excluye al propio contacto
`referidoPorId` solo tiene sentido cuando `origen` es `referido`, así que la lista de candidatos se pide **solo entonces**, reutilizando `listar` con un `porPagina` generoso, y se excluye del selector el contacto que se está editando (nadie se refiere a sí mismo). El contrato no ofrece un endpoint de «todos los contactos de la idea» sin paginar, así que esta es la aproximación disponible; su límite se recoge en Riesgos.

### D8 — Un formulario Signal Forms reutilizado por alta y edición
Mismo criterio que E1/E2: un modelo `{ nombre, perfil, enlace, canal, origen, referidoPorId, notas }` con `nombre` requerido, reutilizado por el alta (`POST`) y la edición (`PATCH`). El formulario **no** modela `estado` ni las fechas de toque: son superficies de las acciones, no del contenido. Los opcionales vacíos se omiten del cuerpo, como en E1.

### D9 — El detalle es el hogar de las acciones; la lista solo navega
La lista muestra y filtra; toda mutación que no sea el alta vive en el detalle (`ideas/:id/contactos/:idContacto`). Evita replicar la lógica de transiciones y toques en dos sitios y mantiene la fila ligera. La eliminación se confirma **en línea** en el detalle, con el patrón de dos pasos de E2 (nada de `window.confirm`).

### D10 — El mismo `codigo` se traduce distinto según la acción que lo provocó
`CONFLICTO` significa dos cosas en este tag: «esa transición no está permitida» y «ya hay dos toques». Ramificar solo por `codigo` daría un mensaje genérico e inútil. El mensaje lo elige **quien invocó la acción**, que sabe qué intentaba: la traducción se parametriza por operación, no por código a secas. Es un matiz sobre el patrón heredado de E1 (D6 de aquel change), no una excepción a él: se sigue sin leer nunca el `mensaje` del backend.

### D11 — Un `403` sobre un contacto no revela absolutamente nada
Reafirmado y elevado: el `Contacto` es información personal, así que ante `ACCESO_DENEGADO` la vista muestra el aviso y **ningún** dato —ni el nombre, ni el perfil, ni un contador—. Vale también para el detalle de un contacto ajeno alcanzado por URL directa.

### D12 — Modelos a mano en `core/api/contacto.model.ts` y catálogos como arreglos `const`
Siguiendo E2 (D10): las uniones se derivan de arreglos `const` para poder iterarlas con orden estable en filtros y selects sin que arreglo y tipo diverjan. Las etiquetas legibles viven en un mapa local con degradación a la clave cruda, por si el catálogo del contrato crece.

### D13 — Dos rutas hijas del shell; acceso desde el detalle de la idea
`ideas/:id/contactos` e `ideas/:id/contactos/:idContacto` como hijas de la ruta del shell (ya protegida por `sesionGuard`), con `loadComponent`. El detalle de la idea suma el acceso a contactos junto a los de hipótesis y umbrales.

## Risks / Trade-offs

- **La tabla de transiciones vive en dos sitios** → si el backend cambiara el embudo, el cliente ofrecería destinos obsoletos. Mitigación: la tabla solo pinta botones y el `409` se sigue manejando; el peor caso es una acción que falla explicándose. Se acepta frente a descubrir la regla a base de errores.
- **El selector de referido solo ve una página de contactos** → en una idea con muchos contactos, el referidor podría no aparecer. Mitigación: `porPagina` generoso al poblar el selector y, si no aparece, el vínculo puede fijarse editando después. El contrato no ofrece mejor herramienta; si esto molesta en uso real, es una petición de cambio al contrato, no un parche en el cliente.
- **`entrevistado` visible pero inalcanzable** → un usuario puede leerlo como una acción que le falta. Mitigación: la UI explica que ese estado lo fija el registro de una entrevista, en vez de limitarse a ocultarlo sin decir nada.
- **Dos `409` distintos bajo el mismo código** → si se añadiera un tercer conflicto al tag, el mapeo por operación habría que ampliarlo. Es el coste de dar mensajes útiles; se prefiere a un texto genérico que obligue al usuario a adivinar.
- **Información personal en la vista** → cualquier estado intermedio (carga, error, vacío) que filtre datos de un contacto ajeno sería una fuga. Mitigación: los estados de error se renderizan **en lugar** del contenido, nunca junto a él, y hay escenarios explícitos que lo verifican.
- **La lista no da lectura de embudo de un vistazo** → con filtro y paginación se ve un estado a la vez, no la forma del embudo. Es la consecuencia aceptada de la decisión de producto; los recuentos por estado llegarán como KPIs de alcance en E5, que es donde el contrato sí los modela.
