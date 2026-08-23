## MODIFIED Requirements

### Requirement: Consultar el detalle de una idea propia
El cliente SHALL presentar el detalle de una idea consumiendo `GET /ideas/{id}`, mostrando `titulo`, `descripcion`, `problema`, `segmentoBeachhead` y `estado`. Un `403 ACCESO_DENEGADO` (idea ajena) MUST mostrarse como acceso denegado sin revelar datos; un `404 RECURSO_NO_ENCONTRADO` MUST mostrarse como idea inexistente. Desde el detalle el cliente MUST ofrecer las acciones disponibles según el `estado` (editar, archivar o desarchivar). El detalle MUST ofrecer además el acceso a las **hipótesis**, a los **umbrales kill/go**, a los **contactos** y a las **entrevistas** de esa idea, como puntos de entrada a la definición de su criterio de validación y al descubrimiento que la alimenta.

#### Scenario: Detalle de idea propia
- **WHEN** el usuario abre una idea suya
- **THEN** el cliente hace `GET /ideas/{id}` y muestra su contenido y su `estado`

#### Scenario: Idea ajena
- **WHEN** `GET /ideas/{id}` responde `403 ACCESO_DENEGADO`
- **THEN** el cliente muestra un mensaje de acceso denegado sin revelar contenido de la idea

#### Scenario: Idea inexistente
- **WHEN** `GET /ideas/{id}` responde `404 RECURSO_NO_ENCONTRADO`
- **THEN** el cliente muestra un estado de idea no encontrada

#### Scenario: Acceso a las hipótesis y los umbrales de la idea
- **WHEN** el usuario ve el detalle de una idea suya
- **THEN** dispone de accesos a las hipótesis y a los umbrales de esa idea, junto a las acciones de editar, archivar o desarchivar

#### Scenario: Acceso a los contactos de la idea
- **WHEN** el usuario ve el detalle de una idea suya
- **THEN** dispone también del acceso a los contactos de esa idea

#### Scenario: Acceso a las entrevistas de la idea
- **WHEN** el usuario ve el detalle de una idea suya
- **THEN** dispone también del acceso a las entrevistas de esa idea
