# Changelog

Todas las versiones notables de ValidaLab se documentan en este archivo. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado es
[SemVer](https://semver.org/lang/es/).

## [0.1.0] - 2026-08-23

Primera versión del MVP de ValidaLab: SaaS multi-tenant para **validar ideas de software antes
de codificarlas**. Backend (NestJS) y frontend (Angular) cubren el contrato de API completo
(épicas **E0–E8**), sincronizados con `contrato-api/openapi.yaml` como fuente de verdad única.

### Contrato de API

- **contrato-api:** define el contrato OpenAPI completo (E0–E8) vía OpenSpec
- **contrato-api:** un guión con evidencia es inmutable en su estructura
- **contrato-api:** un contacto con entrevistas no se elimina
- **contrato-api:** eliminar una entrevista devuelve el contacto a agendado

### Backend (NestJS)

- **backend:** fundación E0 — plomería transversal multi-tenant
- **backend:** módulo usuarios — autenticación y perfil propio
- **backend:** endpoints de administración de usuarios con RBAC
- **backend:** transporta el refresh token en cookie httpOnly
- **backend:** módulo ideas (E1) — portafolio y archivado
- **backend:** hipótesis tipificadas por idea (E2)
- **backend:** umbrales kill/go por KPI (E2)
- **backend:** CRM de contactos y embudo de outreach (E3)
- **backend:** guión de entrevista reutilizable (E4)
- **backend:** registro y CRUD de entrevistas (E4)
- **backend:** scoring inteligente de entrevistas con LangGraph (E4)
- **backend:** re-disparo manual del scoring de una entrevista (RF-09b)
- **backend:** tablero de KPIs y señales estructuradas del agente (E5a)
- **backend:** alertas de cruce de umbral de KPI (E5b)
- **backend:** veredicto de idea del agente en modo consultivo (E6)
- **backend:** catálogo curado de proveedores y modelos (E7a)
- **backend:** configuración BYOK con cifrado y validación de la key (E7b)
- **backend:** precios y costo estimado del consumo de IA (E8a)
- **backend:** re-evaluación en lote tras cambio de rúbrica (E8b)

### Frontend (Angular)

- **frontend:** cimientos y autenticación (E0)
- **frontend:** portafolio de ideas (E1)
- **frontend:** hipótesis y umbrales kill/go por idea (E2)
- **frontend:** CRM de contactos y embudo de outreach (E3)
- **frontend:** guiones de entrevista reutilizables (E4a)
- **frontend:** registro de entrevistas (E4b-1)
- **frontend:** scoring y ajuste del score de la entrevista (E4b-2)
- **frontend:** tablero de KPIs y alertas de cruce de umbral (E5)
- **frontend:** veredicto de idea del agente en modo consultivo (E6)
- **frontend:** configuración BYOK del proveedor de IA (E7)
- **frontend:** visibilidad de costo estimado del consumo de IA (E8a)
- **frontend:** re-evaluación en lote de entrevistas tras cambio de rúbrica (E8b)

### Corrección de errores

- **backend:** repara el toolchain del scaffold para TypeScript 6.0
- **frontend:** muestra la precisión real de los umbrales kill/go

### Refactorización interna

- **backend:** agrupa los módulos usuarios, ideas y auth por sub-dominio/tipo técnico
- **backend:** elimina duplicaciones y mejora legibilidad (clean code)

[0.1.0]: https://github.com/Yellaber/validalab/releases/tag/v0.1.0
