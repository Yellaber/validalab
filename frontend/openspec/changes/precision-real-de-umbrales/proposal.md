## Why

En E2 el número `decimales` de cada unidad quedó haciendo **dos trabajos a la vez**: redondear lo que se muestra y limitar lo que se puede teclear. Mientras ambos coincidan no se nota, pero el contrato no fija ninguna precisión para `umbralGo`/`umbralKill`: el backend puede guardar `0.3333` y la fila lo dibuja como `33.3`, sin decir que hay más detrás.

Un arreglo previo (commit `fix(frontend): evita degradar umbrales que el usuario no editó`) ya impidió el daño real —un campo no editado se reenvía tal como vino, sin reconstruirse desde el texto redondeado—, así que ese valor ya no se degrada al guardar. Pero **sigue mostrándose truncado**, y eso deja al usuario juzgando un criterio de kill sobre una cifra que no es la que el sistema tiene. Un umbral es precisamente el número que decide si una idea se mata: mostrarlo redondeado sin avisar es la clase de imprecisión que este producto no se puede permitir.

Este change separa los dos conceptos que `decimales` mezcló: la presentación pasa a ser **fiel** (se muestra lo que hay) y `decimales` queda como **precisión de entrada** exclusivamente.

## What Changes

- **`aPresentacion` deja de redondear** (`unidad-kpi.ts`): convierte de tasa a puntos porcentuales cuando la unidad lo pide, pero entrega el valor íntegro. El redondeo sobrevive **solo** en `aTransporte`, aplicado a lo que el usuario teclea.
- **`textoDe` produce notación decimal siempre**: `String()` emite notación exponencial para magnitudes pequeñas (`1e-7`), ilegible en un control de umbral y ambigua al reeditarla. Se sustituye por una conversión que garantiza forma decimal.
- **La validación de decimales se aplica solo a los campos editados**: un valor vigente más fino que la precisión de entrada se muestra completo y **no bloquea su fila**. El componente ya distingue `goCambiado`/`killCambiado` en `vistaDe`; se reutiliza ese cálculo en lugar de añadir estado nuevo.
- **Se reformula el invariante de la suite**: el test actual «todo valor que llega del contrato pasa su propia validación» se apoyaba en que la presentación redondeaba. Con presentación fiel deja de cumplirse por construcción, y se sustituye por el invariante que de verdad importa: **un valor vigente nunca bloquea su fila**.
- **Se verifica que `sinCambios` sigue siendo correcto**: compara texto contra texto, y con presentación fiel el texto inicial pasa a ser el valor completo; la comparación sigue detectando «no se tocó nada», pero deja de haber dos valores distintos que produzcan el mismo texto.

**Trade-off asumido explícitamente:** el usuario podrá **conservar** un valor que no podría **escribir** él mismo (ver `0.3333` mostrado como `33.33`, pero teclear `33.33` se rechaza por exceder 1 decimal). Se prefiere esa asimetría a inventar un tope de decimales que el contrato no define y que quedaría corto en cuanto el backend guardase algo más fino.

**Fuera de alcance:** cambiar el valor de `decimales` de ninguna unidad, tocar `contrato-api/openapi.yaml`, y el artefacto de coma flotante de `redondear` (`Math.round(1.005 * 100)` → `100`), que es cosmético y —tras el arreglo previo— ya no puede alcanzar datos guardados.

## Capabilities

### Modified Capabilities
- `hipotesis-y-umbrales`: la presentación de un umbral pasa a ser fiel al valor del contrato en lugar de redondearse a la precisión de la unidad, y la validación de decimales pasa a aplicarse solo a los campos que el usuario edita, de modo que un valor vigente más preciso se muestre íntegro sin bloquear su fila.

## Impact

- **Código**: `src/app/features/ideas/umbrales/unidad-kpi.ts` (`aPresentacion`, `textoDe`, y la regla de decimales de `motivoFueraDeRango`) y `umbrales.ts` (`vistaDe`, que deja de validar decimales en los campos no editados). `umbrales.html` no cambia: sigue pintando el texto que le da la vista.
- **Tests**: `unidad-kpi.spec.ts` y `umbrales.spec.ts`. Un test existente cambia de intención (el invariante de validación) y varios de la conversión pasan a esperar el valor íntegro donde antes esperaban el redondeado.
- **Dependencias**: ninguna nueva.
- **Contrato**: no se modifica ni se consume distinto; el cuerpo del `PUT` sigue llevando `umbralGo` y, cuando aplica, `umbralKill`.
- **Compatibilidad**: no hay migración ni dato persistido en el cliente. El cambio es de presentación y de validación local; para un umbral cuya precisión ya encajaba en su unidad —el caso mayoritario— nada se ve distinto.
- **Riesgo acotado**: la superficie es una función de conversión y una regla de validación, ambas ya cubiertas por tests; el guardado fila por fila y el envío del valor intacto no se tocan.
