## Why

El contrato declara `openapi: 3.1.0` y usa en veinte sitios la palabra clave `nullable`, que **no existe en OpenAPI 3.1**: se eliminó al alinear la especificación con JSON Schema 2020-12, donde la nulabilidad se expresa con el tipo `null`. `redocly lint` lo reporta como veinte errores de estructura.

Que sea sintaxis inválida ya bastaría, pero el problema real es peor en cinco de esos veinte casos. Son propiedades que usan el apaño de 3.0 para «`$ref` nulable»:

```yaml
score:
  allOf:
    - $ref: '#/components/schemas/ScoreEntrevista'
  nullable: true
  description: Resultado del agente; `null` mientras el scoring está `pendiente` o `fallida`.
```

Como `nullable` se ignora en 3.1, para cualquier herramienta que lea el contrato esa propiedad es **obligatoriamente un objeto** — mientras su propia descripción afirma que puede ser `null`. El contrato se contradice a sí mismo en `score`, `ajuste`, `verificacion` y las dos propiedades `proveedor` del costo: precisamente los campos que el cliente debe tratar con cuidado, porque llegan vacíos hasta que el agente puntúa, el humano verifica o el usuario configura su BYOK.

En las quince restantes el efecto es más benigno —un generador las tratará como no nulables cuando sí lo son—, pero la causa es la misma.

Se cierra ahora porque es la última deuda conocida del contrato y su corrección es mecánica.

## What Changes

- **Las quince propiedades escalares** pasan de `type: X` + `nullable: true` a la forma de 3.1: `type: [X, 'null']`.
- **Las cinco propiedades con `$ref`** abandonan el apaño `allOf` + `nullable` y pasan a `oneOf` con una rama `type: 'null'`, que es la forma en que 3.1 expresa «este esquema o nulo». Con esto vuelven a ser nulables de verdad, no solo en la descripción.
- **Nuevo job `Contrato de API` en el CI**, que ejecuta `redocly lint` sobre el documento. Tras esta corrección el contrato queda en **0 errores**, así que el job entra en verde desde el primer día; los tres avisos restantes (`info-license`, `no-server-example.com`, `operation-4xx-response`) no rompen el build.
- **No cambia ningún comportamiento descrito**: las propiedades que hoy la documentación declara nulables siguen siéndolo, y las demás siguen sin serlo. Lo que cambia es que el esquema lo dice de una forma que las herramientas entienden.

**Fuera de alcance**: resolver los tres avisos restantes —`no-server-example.com` exigiría una URL de servidor real que aún no existe—; cualquier cambio de endpoints, códigos de error o semántica; y el código de backend y frontend, que ya tratan estos campos como nulables.

## Capabilities

### New Capabilities
- `validez-del-contrato`: el documento OpenAPI es sintácticamente válido para la versión que declara, y esa validez se verifica automáticamente en cada integración en vez de depender de que alguien recuerde comprobarla.

### Modified Capabilities
<!-- Ninguna. Las capacidades de dominio (`usuarios`, `ideas`, `entrevistas`, `agente`, `proveedores`…) describen comportamiento, y este change no altera ninguno: corrige cómo el documento expresa una nulabilidad que ya estaba declarada en prosa. -->

## Impact

- **`contrato-api/openapi.yaml`**: veinte propiedades cambian de forma sintáctica. Ningún endpoint, esquema ni código de error nuevo o eliminado.
- **CI (`.github/workflows/ci.yml`)**: un job nuevo. Es el único archivo fuera del contrato que se toca.
- **Clientes generados**: quien genere un cliente a partir del contrato obtendrá tipos nulables donde corresponde. Es una corrección, aunque para un cliente ya generado suponga un cambio de tipos.
- **Backend y frontend**: **sin cambios**. Ambos ya tratan esos campos como nulables, porque la nulabilidad estaba documentada en las descripciones y en las specs de dominio. Este change alinea el esquema con lo que el código ya hace.
- **Sin dependencias nuevas**: `redocly` se ejecuta con `npx` en el CI, como ya se venía haciendo a mano.
