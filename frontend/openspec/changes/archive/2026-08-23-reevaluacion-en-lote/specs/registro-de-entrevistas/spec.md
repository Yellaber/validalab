## MODIFIED Requirements

### Requirement: Listado paginado de las entrevistas de una idea
El cliente SHALL presentar el listado de las entrevistas de una idea propia consumiendo `GET /ideas/{id}/entrevistas` con `pagina` y `porPagina`, mostrando de cada entrevista el **nombre** del contacto entrevistado, el **nombre** del guión usado, su fecha y su `estadoScoring`. El cliente NO SHALL mostrar identificadores en crudo: SHALL resolver `contactoId` y `guionId` a nombres, y cuando un nombre no pueda resolverse SHALL mostrar un texto neutro en lugar del identificador. Desde el listado el cliente MUST ofrecer además el acceso a la **re-evaluación en lote** de las entrevistas de la idea (tras un cambio de rúbrica), junto a las acciones de registrar y volver.

#### Scenario: Listado con entrevistas
- **WHEN** el usuario abre el listado de entrevistas de una idea y la respuesta trae entrevistas
- **THEN** ve cada una con el nombre de su contacto, el nombre de su guión, su fecha y su estado de scoring

#### Scenario: Nombre no resoluble
- **WHEN** una entrevista referencia un contacto que no aparece entre los cargados
- **THEN** el cliente muestra un texto neutro en esa fila y no renderiza el identificador

#### Scenario: Paginación del listado
- **WHEN** el usuario avanza de página
- **THEN** el cliente pide el listado con la `pagina` nueva y renderiza los controles a partir del bloque `paginacion`

#### Scenario: Listado vacío
- **WHEN** la idea no tiene entrevistas registradas
- **THEN** el cliente muestra un estado vacío que invita a registrar la primera, sin mensaje de error

#### Scenario: Error al cargar el listado
- **WHEN** la carga del listado falla
- **THEN** el cliente muestra un aviso derivado del `codigo` del error y ofrece reintentar

#### Scenario: Acceso a la re-evaluación en lote
- **WHEN** el usuario ve el listado de entrevistas de una idea suya
- **THEN** dispone del acceso a la re-evaluación en lote de esas entrevistas
