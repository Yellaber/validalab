## MODIFIED Requirements

### Requirement: Validar la salida del agente con Zod y reintentar
El sistema SHALL validar toda salida del agente contra un esquema Zod antes de persistirla: `score` entero 0–10, `justificacion` texto, `senales` lista de texto, `confianza` entero 0–100, y un bloque de **señales estructuradas** `senalesEstructuradas` con `dolorConfirmado`, `dolorUrgente`, `sinSolucionActual` y `disposicionPago` (booleanos). Estas señales estructuradas SHALL ser el insumo de los KPIs de señal de problema/pago (E5). Si la salida no cumple el esquema, el sistema SHALL solicitar corrección al agente y reintentar hasta un máximo configurable; agotados los reintentos SHALL marcar la entrevista `fallida`. Ninguna salida sin validar SHALL afectar el `score`.

#### Scenario: Salida válida se persiste
- **WHEN** el agente devuelve una salida que cumple el esquema Zod, incluidas las señales estructuradas
- **THEN** el sistema la persiste como el bloque `score` de la entrevista, con sus `senalesEstructuradas`

#### Scenario: Salida inválida se reintenta
- **WHEN** el agente devuelve una salida que no cumple el esquema (p. ej. `score` fuera de 0–10 o una señal estructurada ausente)
- **THEN** el sistema solicita corrección y reintenta; si tras los reintentos permitidos no hay salida válida, el `estadoScoring` queda `fallida`

#### Scenario: El modo fake emite señales deterministas
- **WHEN** el entorno está en modo `fake` y se puntúa una entrevista
- **THEN** el bloque `score` incluye `senalesEstructuradas` deterministas derivadas del hash, sin invocar a ningún proveedor
