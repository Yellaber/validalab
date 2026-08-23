## 1. Preparación

- [x] 1.1 Consultar la skill `angular-developer` antes de escribir código (Signal Forms, efectos y temporizadores en zoneless, testing con temporizadores falsos)
- [x] 1.2 Releer en `../contrato-api/openapi.yaml` `POST .../puntuar` y `POST .../ajuste-score`, más los esquemas `ScoreEntrevista`, `SenalesEstructuradas`, `AjusteScore` y `AjustarScoreRequest`
- [x] 1.3 Confirmar que `core/api/entrevista.model.ts` ya declara los tres tipos del bloque de score y **no necesita cambios**

## 2. Servicio: las dos operaciones que faltaban

- [x] 2.1 Añadir `puntuar(ideaId, idEntrevista)` a `EntrevistasService`
- [x] 2.2 Añadir `ajustarScore(ideaId, idEntrevista, datos)` con el cuerpo `AjustarScoreRequest`
- [x] 2.3 Sustituir el test de frontera («no expone las acciones de scoring») por los que verifican ruta, método y cuerpo de ambas, incluido que ningún cuerpo lleva el bloque `score`

## 3. Bloque de score (`score/`)

- [x] 3.1 Crear el componente con `score`, `justificacion`, `senales` y `confianza`, con `ChangeDetectionStrategy.OnPush`
- [x] 3.2 Renderizar las señales estructuradas cuando vengan, y **declarar su ausencia** cuando no, sin pintarlas como negativas
- [x] 3.3 Renderizar la trazabilidad (`proveedor`, `modelo`, `rubricaVersion`, `fechaScoring`) omitiendo los campos ausentes
- [x] 3.4 Renderizar tokens y `costoEstimado` etiquetados como **consumo estimado**, nunca como saldo; omitir el bloque si no vienen
- [x] 3.5 Mostrar el `ajuste` junto al score del agente cuando exista, señalando cuál prevalece en los KPIs
- [x] 3.6 Escribir los specs del componente: score completo, ausencia de señales estructuradas, trazabilidad parcial, costo presente y ausente, y ambos valores visibles con el ajuste

## 4. Seguimiento del scoring (polling acotado)

- [x] 4.1 Crear el helper de seguimiento con intervalo y límite de intentos como constantes justificadas
- [x] 4.2 Arrancar solo cuando el estado sea `pendiente` o `procesando`; parar en `puntuada` o `fallida`
- [x] 4.3 Detener al agotar los intentos y exponer el estado «tardando más de lo normal» para que la vista ofrezca refresco manual
- [x] 4.4 Cancelar al destruir el componente, sin temporizadores huérfanos
- [x] 4.5 Escribir su spec con temporizadores falsos: termina y para, ya puntuada no consulta, se agotan los intentos, refresco manual, y cancelación al destruir

## 5. Detalle: acciones sobre el scoring

- [x] 5.1 Integrar el bloque de score y el seguimiento en el detalle de entrevista
- [x] 5.2 Implementar la acción de (re)disparar el scoring, con el texto de **reintento** en `fallida` y de **re-puntuado** en `puntuada`
- [x] 5.3 Advertir del consumo del proveedor antes de disparar
- [x] 5.4 Arrancar el seguimiento con el estado devuelto, sin lógica de espera propia de la acción
- [x] 5.5 Escribir los specs: reintento, re-puntuado con advertencia, arranque del seguimiento y explicación del estado `fallida`

## 6. Ajuste humano del score

- [x] 6.1 Crear el formulario Signal Forms con `scoreAjustado` (`required`, `min` 0, `max` 10) y `nota` (`required` con contenido)
- [x] 6.2 Abrirlo y cerrarlo desde el detalle, sin pantalla propia; bloquear la confirmación con `formulario().valid()`
- [x] 6.3 Enviar `POST .../ajuste-score` con solo `scoreAjustado` y `nota`, y reflejar la entrevista devuelta
- [x] 6.4 Mapear el `422` campo a campo desde `detalles`
- [x] 6.5 Escribir los specs: ajuste válido, bloqueo sin nota, bloqueo fuera de rango, `422` campo a campo, ambos valores visibles tras ajustar y la justificación del agente intacta

## 7. Cierre

- [x] 7.1 Verificar que ningún cuerpo enviado en toda la feature contiene el bloque `score` ni sus campos
- [x] 7.2 Ejecutar `npm test -- --no-watch` y dejar la suite completa en verde
- [x] 7.3 Ejecutar `npm run build` y confirmar que compila sin errores ni avisos de presupuesto
- [x] 7.4 Pasar Prettier **solo sobre los archivos tocados**, sin globs amplios
- [x] 7.5 Revisar el diff contra las specs del change: cada requisito con su implementación y cada escenario con su test
- [x] 7.6 Verificación ejecutada: 8 requisitos nuevos y 1 retirado, 25 escenarios cubiertos por 94 tests de la feature (318 en total), build sin avisos de presupuesto tras mover el CSS del bloque de score a su componente
