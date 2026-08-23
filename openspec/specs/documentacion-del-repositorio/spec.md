# documentacion-del-repositorio

## Purpose

Fija **qué puede afirmar** la documentación del repositorio —las guías `CLAUDE.md` y los `README.md`— y la estructura que se deriva de ello.

El principio es la no-caducidad: estos archivos describen invariantes (modelo de dominio, arquitectura, convenciones, reglas y comandos) y nunca el alcance construido en un momento dado. Nace de una observación concreta: las secciones que describen un instantáneo del avance («estado actual», «andamiaje recién creado», «aún no hay X») caducan por diseño, y corregir su redacción sin eliminarlas garantiza repetir el trabajo en cada épica. La pregunta «qué hay construido» la responden mejor `openspec/specs/` —que se actualiza sola en cada archivado— y el propio código.

De ahí se sigue la estructura: el `README.md` raíz es la única puerta de entrada y los de paquete no lo duplican, porque la duplicación es la misma clase de problema que la caducidad — dos documentos que solo pueden divergir.

Esta capacidad es complementaria a [`guias-claude-md-paquetes`](../guias-claude-md-paquetes/spec.md), que gobierna **cómo** se redactan las guías de paquete (idioma, referencia a las skills de Angular, delegación de las convenciones de estilo). Aquella dice cómo se escriben; esta, qué pueden afirmar, y cubre además los `README.md` y el `CLAUDE.md` raíz.

## Requirements

### Requirement: La documentación no afirma estado caducable
Las guías `CLAUDE.md` y los archivos `README.md` del repositorio SHALL describir invariantes —modelo de dominio, arquitectura, convenciones, reglas y comandos— y NO SHALL afirmar qué alcance está construido en un momento dado. Quedan prohibidas las secciones que describen un instantáneo del avance («estado actual», «andamiaje recién creado», «aún no hay X», «solo Y por ahora»).

El criterio para distinguir qué se documenta es si la frase **seguirá siendo cierta después del próximo change**: una regla vigente se documenta aunque describa el presente; un inventario de lo construido no se documenta aunque hoy sea exacto. Una decisión activa del proyecto (p. ej. que un paquete no use cierta herramienta) es un invariante, no un hito de avance, y SHALL conservarse.

El `CHANGELOG.md` queda excluido de este requisito: su propósito es precisamente registrar el estado en momentos concretos.

#### Scenario: Ausencia de secciones de estado
- **WHEN** se revisan `CLAUDE.md` (raíz), `backend/CLAUDE.md`, `frontend/CLAUDE.md` y los `README.md`
- **THEN** ninguno declara qué épicas, módulos o funcionalidades están construidos
- **AND** ninguno describe el repositorio como andamiaje, esqueleto o trabajo inicial

#### Scenario: Un invariante se conserva aunque describa el presente
- **WHEN** la documentación afirma una decisión activa del proyecto, como que el backend usa TypeScript en modo laxo o que el frontend no tiene ESLint
- **THEN** esa afirmación se conserva, porque describe una decisión vigente y no un hito de avance

#### Scenario: Tras completar una funcionalidad nueva
- **WHEN** se archiva un change que añade una capacidad al proyecto
- **THEN** las guías y los README no requieren actualización por ese motivo
- **AND** solo cambian si cambiaron las convenciones o la arquitectura

### Requirement: El alcance implementado se consulta en las capacidades vigentes
La documentación SHALL remitir a `openspec/specs/` como fuente de verdad de qué está implementado, en lugar de enumerarlo en prosa. Las guías `CLAUDE.md` SHALL mantener el orden de épicas del SRS como guía de **prioridades de construcción**, que es estable, sin declarar cuáles están completadas.

#### Scenario: Buscar qué hay implementado
- **WHEN** alguien consulta la documentación para saber qué funcionalidades existen
- **THEN** la documentación lo remite a `openspec/specs/` y al código
- **AND** no ofrece una lista en prosa que pueda divergir de ellos

#### Scenario: El roadmap se conserva
- **WHEN** se consulta el orden de construcción por épicas (E0 → E8)
- **THEN** sigue documentado como prioridad derivada del SRS
- **AND** sin marcar cuáles están terminadas

### Requirement: Las referencias citadas existen
Todo comando, ruta de archivo y nombre de archivo que la documentación ofrezca como ejemplo SHALL corresponder a algo que existe en el repositorio. Un ejemplo que no resuelve es peor que la ausencia de ejemplo, porque se copia y falla.

#### Scenario: Ejemplos de comandos de test
- **WHEN** una guía ofrece un comando de ejemplo para ejecutar un test concreto
- **THEN** el archivo citado existe en el repositorio

#### Scenario: Rutas de configuración
- **WHEN** una guía cita el archivo de configuración de una herramienta
- **THEN** el nombre y la extensión coinciden con el archivo real

### Requirement: README raíz como única puerta de entrada
El `README.md` de la raíz SHALL ser el documento de entrada del repositorio: propósito del producto, stack, estructura del monorepo, puesta en marcha, contrato de API y flujo de desarrollo. Los `README.md` de `backend/` y `frontend/` SHALL limitarse a lo propio de su paquete —qué es y sus comandos— y SHALL remitir al `README.md` raíz y a su `CLAUDE.md` para el resto. NO SHALL duplicar el dominio, el stack, el contrato ni el flujo de ramas.

Ningún `README.md` de paquete SHALL conservar contenido de plantilla generado por su herramienta de andamiaje.

#### Scenario: README de paquete
- **WHEN** se abre `backend/README.md` o `frontend/README.md`
- **THEN** identifica el paquete, lista sus comandos reales y remite al README raíz y a su `CLAUDE.md`
- **AND** no repite el modelo de dominio, el stack ni el flujo de ramas

#### Scenario: Sin plantillas de andamiaje
- **WHEN** se revisan los `README.md` de los paquetes
- **THEN** no contienen el texto de plantilla de NestJS ni el del CLI de Angular
- **AND** no citan versiones de herramientas distintas de las instaladas

#### Scenario: Punto de entrada del repositorio
- **WHEN** alguien llega al repositorio por primera vez
- **THEN** el `README.md` raíz le da propósito, stack, estructura, puesta en marcha y flujo de trabajo sin necesidad de abrir otros archivos
