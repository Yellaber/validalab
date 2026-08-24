# validez-del-contrato

## Purpose

El documento OpenAPI de `contrato-api/` es sintácticamente válido para la versión que declara, y esa validez se verifica automáticamente en cada integración en vez de depender de que alguien recuerde comprobarla.

Nace de un desfase concreto: el contrato declaraba `openapi: 3.1.0` y usaba en veinte sitios la palabra clave `nullable`, eliminada en 3.1 al alinear la especificación con JSON Schema 2020-12. En quince casos el efecto era que un generador de clientes tratase como no nulables campos que sí lo eran; en cinco —los que usaban el apaño `allOf` + `nullable` para referenciar otro esquema— el contrato llegaba a **contradecirse a sí mismo**, declarando obligatorio un objeto cuya propia descripción decía que podía llegar `null`.

De ahí las dos mitades de esta capacidad. Una fija cómo se expresa la nulabilidad para que el esquema diga lo mismo que la prosa. La otra pone la comprobación en integración continua, porque la causa del desfase no fue que faltara el linter —existía— sino que nada lo ejecutaba.

El contrato es la frontera entre `frontend/` y `backend/` y no pertenece a ninguno, así que su verificación vive en un job propio.

## Requirements

### Requirement: El contrato es válido para la versión de OpenAPI que declara
El documento `contrato-api/openapi.yaml` SHALL usar exclusivamente sintaxis válida para la versión que declara en su campo `openapi`. Declarando `3.1.0`, NO SHALL aparecer la palabra clave `nullable`, eliminada de la especificación al alinearse con JSON Schema 2020-12.

#### Scenario: Sin palabras clave de versiones anteriores
- **WHEN** se inspecciona el documento en busca de `nullable`
- **THEN** no aparece ninguna ocurrencia

#### Scenario: El linter no reporta errores de estructura
- **WHEN** se valida el documento con un linter de OpenAPI
- **THEN** no se reporta ningún error de estructura

### Requirement: La nulabilidad se expresa con el tipo `null`
Una propiedad de tipo escalar que admita ausencia de valor SHALL declararlo incluyendo `'null'` en su `type`. Una propiedad que referencie otro esquema y admita ausencia de valor SHALL declararlo mediante una composición con una rama `type: 'null'`, y NO SHALL usar el envoltorio `allOf` con `nullable` propio de OpenAPI 3.0.

El tipo `null` MUST escribirse entrecomillado en YAML: sin comillas, el analizador lo interpreta como el valor nulo en lugar del nombre del tipo, produciendo un esquema que el linter acepta y que significa otra cosa.

#### Scenario: Propiedad escalar nulable
- **WHEN** una propiedad de tipo escalar puede llegar sin valor
- **THEN** su `type` incluye `'null'` junto al tipo de dato

#### Scenario: Propiedad con referencia nulable
- **WHEN** una propiedad que referencia otro esquema puede llegar sin valor
- **THEN** se expresa como una composición entre esa referencia y una rama `type: 'null'`
- **AND** no queda ningún `allOf` cuyo único propósito fuera permitir `nullable`

#### Scenario: El tipo `null` no se confunde con el valor nulo
- **WHEN** se examina el documento ya interpretado por un analizador de YAML
- **THEN** las propiedades nulables declaran la cadena `null` como nombre de tipo, no el valor nulo del lenguaje

### Requirement: La nulabilidad declarada coincide con la documentada
El conjunto de propiedades nulables del contrato SHALL corresponder exactamente con las que su documentación describe como tales. Una propiedad cuya `description` afirme que puede llegar `null` MUST declararlo también en su esquema, de modo que las herramientas que consumen el contrato lleguen a la misma conclusión que un lector humano.

#### Scenario: Un campo descrito como nulable lo es en el esquema
- **WHEN** la descripción de una propiedad afirma que puede ser `null` en alguna circunstancia
- **THEN** su esquema admite el tipo `null`

#### Scenario: No se introduce nulabilidad nueva
- **WHEN** se compara el conjunto de propiedades nulables antes y después de una corrección de sintaxis
- **THEN** es el mismo conjunto
- **AND** ninguna propiedad no nulable pasó a serlo por efecto de la corrección

### Requirement: La validez del contrato se verifica en integración continua
El workflow de integración continua SHALL validar el contrato con un linter de OpenAPI en cada `pull_request` y en cada `push` a las ramas protegidas. Un error de validación SHALL hacer fallar la comprobación. La verificación SHALL ejecutarse en un job propio, independiente de los paquetes, porque el contrato no pertenece a ninguno: es la frontera entre ambos.

#### Scenario: Se introduce sintaxis inválida
- **WHEN** un cambio añade al contrato una palabra clave que su versión de OpenAPI no admite
- **THEN** la comprobación del contrato falla

#### Scenario: Contrato válido
- **WHEN** el contrato no tiene errores de estructura
- **THEN** la comprobación pasa
- **AND** los avisos del linter no hacen fallar el build
