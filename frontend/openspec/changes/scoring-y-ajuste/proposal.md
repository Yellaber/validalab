## Why

E4b-1 dejó la evidencia capturada y el juicio del agente **invisible**: la entrevista se registra, el scoring se dispara, y el cliente solo muestra una etiqueta de estado que nunca cambia sin recargar. El agente trabaja y nadie ve el resultado.

Este change cierra E4 completando la tríada del SRS. El usuario ya alimentó; ahora **el agente ejecuta** —y su juicio se muestra con la trazabilidad que lo hace auditable— **y el humano verifica**, ajustando el score cuando no está de acuerdo.

Ese ajuste es el punto donde ValidaLab se define como herramienta **consultiva**: el agente puntúa, pero no manda. Por eso el contrato exige conservar **ambos** valores —el del agente y el del usuario— y que sea el del usuario el que prevalezca en los KPIs (E5). Un producto que dejara al agente decidir en firme, o que borrara su score al corregirlo, sería otro producto.

Falta además resolver el problema práctico que E4b-1 dejó abierto: `estadoScoring` es asíncrono y el contrato no expone websockets ni webhooks, así que quien registra una entrevista se queda mirando `procesando` sin que nada avance.

## What Changes

- **Bloque de score en el detalle**: `score` (0–10), `justificacion`, `senales` y `confianza` (0–100), con su **trazabilidad** —`proveedor`, `modelo`, `rubricaVersion` y `fechaScoring`— que es lo que permite auditar un juicio meses después.
- **Señales estructuradas**: las cuatro banderas que el agente clasifica (`dolorConfirmado`, `dolorUrgente`, `sinSolucionActual`, `disposicionPago`). Son opcionales en el contrato: un score de una rúbrica anterior no las trae, y en ese caso la UI lo **dice** en vez de pintar cuatro «no» que serían mentira.
- **Costo del scoring**: `tokensEntrada`, `tokensSalida` y `costoEstimado`, etiquetados sin ambigüedad como **estimación del consumo vía ValidaLab, no saldo de la cuenta** del proveedor (RNF-17).
- **Polling acotado con corte**: mientras el `estadoScoring` sea `pendiente` o `procesando`, el detalle vuelve a consultar cada pocos segundos, con **límite de intentos**, parando en cuanto llega a `puntuada` o `fallida`. Al agotarse ofrece refrescar a mano. Ni deja la vista colgada ni martillea el backend.
- **Re-disparar el scoring** (`POST .../puntuar`): acción del detalle, presentada como reintento cuando el estado es `fallida` y como re-puntuado cuando ya está `puntuada`.
- **Ajuste humano del score** (`POST .../ajuste-score`): formulario con `scoreAjustado` (0–10) y una `nota` obligatoria que explique el motivo. La vista muestra **siempre los dos valores** y señala cuál prevalece en los KPIs.
- **`EntrevistasService` gana `puntuar` y `ajustarScore`**, los dos métodos que E4b-1 dejó deliberadamente fuera hasta que existiera la vista que los usa.
- **Se retira la frontera temporal** que E4b-1 declaró: aquel requisito prohibía renderizar el score, consultar el estado repetidamente y ofrecer acciones de scoring. Era andamiaje para marcar el corte, y esta capacidad lo sustituye.

**Fuera de alcance**: los KPIs que agregan estos scores y el tablero (E5); el veredicto del agente (E6); la configuración BYOK del proveedor y modelo (E7); y la re-evaluación en lote con su estimación de costo (E8), que tiene sus propios endpoints.

## Capabilities

### New Capabilities
- `scoring-y-ajuste`: presentación y gobierno en el cliente del juicio del agente sobre una entrevista — bloque de score con justificación, señales, confianza, señales estructuradas y trazabilidad de proveedor/modelo/rúbrica; costo estimado del scoring etiquetado como consumo y no como saldo; seguimiento del `estadoScoring` asíncrono mediante polling acotado con corte y refresco manual al agotarse; re-disparo del scoring; y registro del ajuste humano conservando **ambos** valores y señalando que el ajuste prevalece en los KPIs.

### Modified Capabilities
- `registro-de-entrevistas`: se **retira** el requisito «Frontera con el scoring del agente», que prohibía renderizar el bloque `score`, consultar repetidamente el estado y ofrecer acciones de scoring. Era una frontera temporal entre los dos cortes de E4b y deja de aplicar en cuanto existe `scoring-y-ajuste`.

## Impact

- **Código**: `features/ideas/entrevistas/` gana el bloque de score, el formulario de ajuste y la lógica de polling; el detalle de entrevista pasa de mostrar una etiqueta a gobernar un ciclo asíncrono. `EntrevistasService` suma sus dos últimas operaciones.
- **Dependencias**: ninguna nueva. El polling se resuelve con las primitivas de Angular, sin librería de temporización.
- **Contrato**: consume `POST .../puntuar` y `POST .../ajuste-score`, las dos únicas rutas del tag `entrevistas` que quedaban sin usar (salvo las de re-evaluación en lote, que son de E8). **No** lo modifica.
- **Modelos**: `ScoreEntrevista`, `SenalesEstructuradas` y `AjusteScore` ya se declararon en E4b-1 fieles al contrato, anotados como «se leen en el change de scoring». Ese momento es este; **no hace falta tocar `entrevista.model.ts`**.
- **Aislamiento multi-tenant**: el bloque `score` es de solo lectura y el cliente nunca lo envía; el cuerpo del ajuste lleva solo `scoreAjustado` y `nota`.
- **Coste real**: re-puntuar consume tokens del proveedor del usuario. La UI lo dice antes de disparar, y se apoya en que el scoring es idempotente por hash de respuestas y versión de rúbrica (RF-22c): re-puntuar una entrevista intacta no vuelve a invocar al agente.
- **Aguas abajo**: con esto E4 queda cerrada y E5 puede agregar scores y señales en KPIs, tomando el `ajuste` cuando existe.
- **Zoneless**: el polling se expresa con signals y se cancela al destruir el componente; nada de temporizadores huérfanos.
