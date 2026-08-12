## Context

`FORMATO_UNIDAD` (en `src/app/features/ideas/umbrales/unidad-kpi.ts`) asigna a cada `UnidadKpi` un número `decimales` —porcentaje 1, ratio 2, `puntaje_0_10` 1, conteos 0— y ese único número gobierna hoy **dos reglas distintas**:

1. **Presentación:** `aPresentacion` redondea a `decimales` antes de que `textoDe` produzca el texto del control.
2. **Entrada:** `motivoFueraDeRango` rechaza lo tecleado si excede `decimales`.

Mientras el valor almacenado encaje en esa precisión, ambas reglas coinciden y nada se nota. Pero el contrato declara `umbralGo`/`umbralKill` como `number` sin restricción de precisión: en cuanto el backend guarde algo más fino, la regla (1) lo oculta.

El daño de escritura ya está resuelto: el commit `fix(frontend): evita degradar umbrales que el usuario no editó` hizo que un campo no editado se reenvíe tal como vino del contrato, en vez de reconstruirse desde el texto. Queda el daño de **lectura**: el usuario decide sobre una cifra que no es la que el sistema guarda.

Restricciones heredadas: Angular 22 zoneless (estado por signals), organización por sub-feature, contrato OpenAPI como fuente de verdad, y la capacidad `hipotesis-y-umbrales` ya archivada y promovida a `openspec/specs/`. Las mecánicas de Angular las gobierna la skill `angular-developer`.

## Goals / Non-Goals

**Goals:**
- Que el control muestre el valor que el contrato entregó, sin redondearlo.
- Que `decimales` signifique **solo** precisión de entrada.
- Que un valor vigente nunca deje su fila bloqueada, sea cual sea su precisión.
- Que el texto del control sea siempre decimal legible y reeditable, nunca notación exponencial.
- Mantener intactos el guardado fila por fila y el reenvío intacto de los campos no editados.

**Non-Goals:**
- Cambiar el valor de `decimales` de ninguna unidad: la precisión de entrada se queda como está.
- Tocar `contrato-api/openapi.yaml`: ni el transporte ni el cuerpo del `PUT` cambian.
- Corregir el artefacto de coma flotante de `redondear` (`Math.round(1.005 * 100)` → `100`): es cosmético y, tras el arreglo previo, no alcanza datos guardados.
- Ofrecer al usuario una forma de teclear precisión arbitraria (ver D5: la asimetría es deliberada).
- Mostrar de dónde viene un umbral (editado vs. por defecto): el contrato no expone esa procedencia y sigue prohibido prometerlo.

## Decisions

### D1 — `aPresentacion` convierte pero no redondea
Pasa a hacer un solo trabajo: llevar el valor de la unidad de transporte a la de presentación (×100 en `porcentaje`, identidad en el resto). El redondeo sobrevive **solo** en `aTransporte`, sobre lo que el usuario teclea. Así la conversión deja de ser una función con pérdida en el sentido lectura, que es exactamente el defecto que este change corrige. Alternativa descartada: añadir un parámetro `redondear?: boolean` — dos comportamientos en una firma es cómo `decimales` acabó significando dos cosas.

### D2 — Fidelidad con saneamiento de ruido IEEE-754 a 10 decimales
Fiel no puede significar «vuelca los bits». Si el backend calcula `0.1 + 0.2` y guarda `0.30000000000000004`, la presentación fiel literal mostraría `30.000000000000004`, que es ruido de coma flotante, no precisión real. `aPresentacion` redondea a **10 decimales** en la unidad de presentación: suficiente para no tocar ninguna precisión con significado en un umbral (10 decimales de punto porcentual es una billonésima de tasa) y bastante para eliminar el ruido, que aparece más allá del decimal 15. Alternativa descartada: no sanear — expondría artefactos del backend como si fueran decisiones del usuario.

### D3 — `textoDe` garantiza notación decimal
`String(0.0000001)` produce `"1e-7"`: ilegible en un control de umbral y, al reeditarse, ambiguo. `textoDe` pasa por un helper que detecta la notación exponencial y la reescribe en forma decimal (vía `toFixed` con recorte de ceros finales). Para todo valor de magnitud normal el resultado es idéntico a `String()`, así que el caso común no cambia. Alternativa descartada: `toLocaleString` — introduce separador decimal por locale (`33,33` en español), que un `input[type=number]` no acepta.

### D4 — La validación de encaje con la unidad solo se aplica a los campos editados
`vistaDe` ya calcula `goCambiado` y `killCambiado` comparando el texto contra la presentación del valor vigente. Se reutiliza ese cálculo: si un campo no cambió, **no** se valida su encaje con la unidad (rango, entero, decimales). Es lo que hace cierto el invariante «un valor vigente nunca bloquea su fila».

Nótese que esto va algo más allá de la regla de decimales que motivó el change: también deja de aplicarse el rango mín/máx a un campo intacto. Es deliberado y por el mismo argumento — el valor vigente es autoridad del backend, no una entrada del usuario, y bloquear la fila por él impediría corregir el **otro** campo, que es justo lo que el usuario habría venido a hacer. Si ese valor es de verdad inválido, el backend lo rechazará con su `422` cuando la fila se guarde, y la UI ya sabe mostrarlo campo a campo.

### D5 — La regla cruzada `kill ≤ go` se aplica siempre
Es la única validación que sobrevive sobre campos no editados, porque es una relación **entre** los dos valores que se van a enviar juntos, no el encaje de uno con su unidad. Se evalúa en unidades de presentación (la conversión es monótona, así que el orden se conserva) usando el valor efectivo de cada campo: el tecleado si cambió, el vigente si no.

### D6 — La asimetría entre lo que se conserva y lo que se puede teclear es un trade-off asumido
Con D1 y D4, un umbral de `0.3333` se muestra como `33.33` y se conserva intacto, pero teclear `33.33` se rechaza por exceder 1 decimal. Es incómodo de explicar, y aun así preferible a las alternativas: subir el tope de decimales elige un número que el contrato no define y que se queda corto en cuanto el backend guarde algo más fino; quitarlo del todo tira la validación local que hoy atrapa dedazos. La lectura correcta es que **la precisión de entrada es una decisión de producto sobre lo que tiene sentido fijar a mano**, mientras que la precisión almacenada es un hecho del backend que el cliente respeta sin poder originarlo.

### D7 — El invariante de la suite se reformula, no se borra
El test actual «todo valor que llega del contrato pasa su propia validación» se cumplía por construcción **porque** la presentación redondeaba; con D1 deja de ser cierto y hay que sustituirlo, no eliminarlo. Su reemplazo expresa la propiedad que de verdad se quiere garantizar y que D4 hace cierta: **un valor vigente, por preciso que sea, nunca deja su fila bloqueada**. Un test que se vuelve falso al corregir un defecto es una señal de que medía el andamio en vez de la propiedad.

## Risks / Trade-offs

- **Un valor muy preciso ensancha el control** → `33.33333333` ocupa más que `33.3`. Mitigación: el `input` de la fila ya tiene ancho fijo con `min-width` y el navegador desplaza el contenido; no rompe la retícula de la fila.
- **La asimetría de D6 confunde** → un usuario puede ver `33.33` y no poder teclearlo. Mitigación: el mensaje de error nombra el límite concreto (`Admite como máximo 1 decimal.`), así que el rechazo se explica solo. No se añade UI extra para justificarlo.
- **Saneamiento a 10 decimales es un número elegido** → si algún KPI futuro necesitara más de 10 decimales en unidad de presentación, se truncaría. Se acepta: no existe umbral de validación con ese significado, y el alternativo (no sanear) tiene un coste seguro frente a uno hipotético.
- **`sinCambios` cambia de comportamiento sutilmente** → deja de haber dos valores almacenados distintos que produzcan el mismo texto (antes `0.3333` y `0.333` daban ambos `"33.3"`). Es una mejora, no una regresión: una edición entre esos dos valores ya no se confunde con «no cambió nada». Conviene fijarlo con un test para que no se lea como accidental.
- **Cobertura del caso raro** → los valores con precisión extra no aparecen en el uso normal, así que solo los tests los ejercitan. Mitigación: los escenarios usan valores explícitos (`0.3333`, `0.30000000000000004`, `1e-7`) para que el comportamiento quede documentado aunque la UI real rara vez lo vea.
