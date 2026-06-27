# guias-claude-md-paquetes

## Purpose

Define cómo deben redactarse y estructurarse las guías `CLAUDE.md` de los paquetes `frontend/` y `backend/`: coherencia idiomática en español con el `CLAUDE.md` raíz, referencia a las skills de Angular (`angular-new-app`, `angular-developer`) como fuente de mejores prácticas, y delegación de las convenciones de estilo de Angular en la skill `angular-developer` en lugar de mantener una copia estática versionada en el repositorio.

## Requirements

### Requirement: Guías CLAUDE.md de paquete en español

Las guías `CLAUDE.md` de los paquetes `frontend/` y `backend/` SHALL estar redactadas en español, en coherencia con el `CLAUDE.md` raíz del proyecto. Los literales técnicos (comandos, rutas, nombres de módulos, identificadores `RNF`/`RF`, `owner_id`) MUST conservarse sin traducir.

#### Scenario: Frontend CLAUDE.md en español

- **WHEN** se abre `frontend/CLAUDE.md`
- **THEN** su contenido descriptivo está en español y conserva los comandos y literales técnicos sin traducir

#### Scenario: Backend CLAUDE.md en español

- **WHEN** se abre `backend/CLAUDE.md`
- **THEN** su contenido descriptivo está en español y conserva los comandos y literales técnicos sin traducir

### Requirement: Referencia a las skills de Angular en el frontend

El archivo `frontend/CLAUDE.md` SHALL incluir una sección que referencie las skills `angular-new-app` y `angular-developer` e indique cuándo aplicarlas, de modo que el desarrollo del frontend emplee las mejores prácticas y características más recientes de Angular.

#### Scenario: Crear una nueva app Angular

- **WHEN** se va a crear una nueva aplicación Angular en el frontend
- **THEN** la guía indica invocar la skill `angular-new-app`

#### Scenario: Generar código o pedir guía arquitectónica de Angular

- **WHEN** se va a generar un componente o servicio, o se necesita guía sobre signals, formularios, DI, routing, SSR, accesibilidad o testing en Angular
- **THEN** la guía indica invocar la skill `angular-developer`

### Requirement: Convenciones de estilo Angular delegadas en la skill

Las convenciones de estilo de Angular del frontend SHALL provenir de la skill `angular-developer` (y su `get_best_practices` alineado a la versión instalada), no de una copia estática versionada en el repositorio. El archivo `frontend/.claude/CLAUDE.md` MUST eliminarse y `frontend/CLAUDE.md` MUST dejar de referenciarlo.

#### Scenario: No existe guía de estilo estática duplicada

- **WHEN** se busca la fuente de las convenciones de estilo Angular del frontend
- **THEN** no existe `frontend/.claude/CLAUDE.md` y `frontend/CLAUDE.md` dirige a invocar la skill `angular-developer` para esas convenciones

#### Scenario: Trabajo de Angular antes de codificar

- **WHEN** se va a generar o modificar código Angular en el frontend
- **THEN** `frontend/CLAUDE.md` instruye invocar `angular-developer` para aplicar las prácticas vigentes de la versión instalada
