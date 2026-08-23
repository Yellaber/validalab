# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual del repositorio

**El monorepo ya está inicializado** como repositorio Git propio en `validalab/`, con dos paquetes andamiados pero aún sin código de dominio:

- `frontend/` — scaffold de Angular 22 (standalone, detección de cambios *zoneless*). Ver `frontend/CLAUDE.md` para comandos y arquitectura del frontend.
- `backend/` — scaffold de NestJS 11 (aún el `AppController`/`AppService` por defecto).

Ambos paquetes, y la raíz, usan **OpenSpec** (desarrollo guiado por especificación): hay `openspec/` con `config.yaml`, `specs/` y `changes/`. Las funcionalidades sustanciales pasan por el ciclo propose → apply → verify → archive (skills `opsx:*` / `openspec-*`).

La fuente de verdad funcional sigue siendo la especificación de requerimientos (SRS), en la carpeta hermana:

```
../Especificacion de requerimientos de software/SRS_ValidaLab_v6.0.docx   ← versión vigente
```

Las versiones v1.0, v3.0 y v5.0 son históricas; **usa siempre la v6.0**. Este CLAUDE.md resume su contenido, pero ante cualquier duda funcional consulta el SRS.

## Qué es ValidaLab

SaaS multiusuario para **validar ideas de software antes de codificarlas** ("validate-first, build-second"). El usuario (un fundador/validador) registra ideas, hipótesis, contactos y entrevistas de descubrimiento; un agente de IA puntúa las entrevistas y emite un veredicto **go / pivote / kill** sobre cada idea. El humano verifica; el agente nunca decide en firme.

Principio de diseño central — **la tríada de responsabilidades**:
- **El usuario alimenta** (registra ideas, contactos, respuestas de entrevistas) y **verifica**.
- **El agente ejecuta** (puntúa entrevistas y dictamina el veredicto).
- **El sistema calcula** (KPIs) **y orquesta** (la invocación al agente).

## Stack tecnológico previsto (RNF-03)

- **Frontend:** Angular
- **Backend:** NestJS sobre Node.js — arquitectura modular por dominio (RNF-10): `usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`. **Validación con Zod (`nestjs-zod`)** en los DTOs HTTP, unificando una sola gramática de esquemas con la capa agéntica (que ya exige Zod)
- **Persistencia:** PostgreSQL con **TypeORM** (entidades y repositorios por decoradores, alineado con la DI de Nest; el esquema se gobierna con migraciones, nunca con `synchronize` en entornos reales)
- **Capa agéntica:** LangGraph.js + `@langchain/core`, TypeScript, esquemas **Zod** para tools y salida estructurada

El proyecto es **multi-tenant desde la primera versión**: autenticación, RBAC y aislamiento por `owner_id` filtrado en cada consulta. Ningún usuario ve datos de otro.

## Contrato de API (fuente de verdad frontend ↔ backend)

El contrato de API es la **fuente de verdad única** que dirige el desarrollo de `frontend/` y `backend/`. Cada equipo desarrolla contra el contrato **sin conocer ni depender del código del otro**. Todo endpoint, payload o comportamiento de borde entre cliente y servidor se define **primero en el contrato** y solo después se implementa.

**Índice — el contrato es un único documento OpenAPI:**

```
contrato-api/openapi.yaml   ← contrato completo (un solo archivo, navegable por `tags` de dominio)
```

Los `tags` del documento corresponden a los módulos de dominio: `usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`.

**Regla anti-crecimiento de esta memoria:** aquí va **solo** el índice (arriba) y el **resumen normativo** de las convenciones transversales (abajo). El detalle voluminoso —endpoint por endpoint, esquemas concretos y el **catálogo completo de códigos de error**— vive en `contrato-api/openapi.yaml`, **no** en este archivo. Así `CLAUDE.md` se mantiene acotado y estable aunque el contrato crezca; la consulta sigue siendo **integral** porque desde este índice se alcanza todo el detalle.

**Convenciones transversales (resumen normativo; el detalle está en el OpenAPI):**

- **Autenticación:** JWT en `Authorization: Bearer <token>` en toda operación salvo registro/login. Sin token válido → `401 NO_AUTENTICADO`.
- **Aislamiento multi-tenant (`owner_id`):** el `owner_id` se deriva **siempre** del token, nunca se acepta como entrada del cliente; cada consulta filtra por él. Pedir un recurso ajeno → `403 ACCESO_DENEGADO` sin revelar datos.
- **Formato de error:** todo error usa el sobre `Error` con un `codigo` estable del catálogo `CodigoError` (catálogo completo en el OpenAPI).
- **Paginación:** colecciones con parámetros `pagina` y `porPagina`; respuesta en el sobre `RespuestaPaginada` con bloque `paginacion`.
- **Nombres:** rutas en plural y kebab-case (`/ideas`, `/entrevistas`); campos JSON en camelCase y en español (terminología del SRS); `id` en formato `uuid`.

## Modelo de dominio

Dos entidades raíz: **Usuario** e **Idea**. Cada idea pertenece a un usuario (`owner_id`) y cuelga de ella todo lo demás:

```
Usuario ─┬─ Idea ─┬─ Hipótesis (problema/mercado/pago; confirmada/refutada/pendiente)
         │        ├─ Umbrales kill/go (por KPI, editables por idea)
         │        ├─ Contacto ── (embudo outreach: por contactar→contactado→respondió→
         │        │               agendado→entrevistado→descartado; máx. 2 toques)
         │        ├─ Entrevista (vinculada a Idea + Contacto del mismo usuario;
         │        │               respuestas + citas; score del agente + ajuste del usuario)
         │        ├─ KPIs agregados (calculados, reconstruibles desde las entrevistas)
         │        └─ Veredictos (con snapshot de KPIs + proveedor + modelo)
         └─ Config BYOK (proveedor + API key cifrada + modelos scoring/veredicto)
```

Invariantes clave:
- Una entrevista **no puede existir** sin idea y contacto válidos del mismo usuario (RNF-14).
- Todo KPI debe ser **reconstruible** desde las entrevistas que lo originan (RNF-15).
- Cuando el usuario ajusta un score, se **conservan ambos valores** (agente + usuario); el ajuste manual prevalece en el cálculo de KPIs.

## El Validador Inteligente (componente distintivo)

Es el núcleo del producto. Es un **agente LangGraph.js**, no una simple llamada a API. Vive en el backend NestJS como **servicio inyectable desacoplado de los controladores**. Tiene dos funciones:

1. **Scoring de entrevistas** (alto volumen) — se dispara automáticamente al guardar una entrevista. Salida Zod: `score (0–10)`, `justificacion`, `señales`, `confianza (0–100)`.
2. **Veredicto de idea** (baja frecuencia, bajo demanda) — analiza el snapshot de KPIs. Salida Zod: `veredicto ('go'|'pivote'|'kill')`, `confianza`, `justificacionPorKPI[]`, `recomendaciones[]`.

Reglas de la capa agéntica (sección 8 del SRS):
- **Agnóstica del proveedor (RF-AG-06):** el modelo se inyecta según la config BYOK del usuario. Una **capa de abstracción** oculta las diferencias entre Anthropic / OpenAI / Google detrás de un adaptador común (RNF-06), de modo que añadir un cuarto proveedor no afecte al resto.
- **Salida estructurada siempre validada con Zod (RF-AG-02, RNF-20):** ninguna respuesta sin validar puede afectar scores, KPIs ni veredictos. Si no cumple el esquema → reintentar/solicitar corrección antes de persistir (RF-AG-03); nunca romper el flujo.
- **Tools (function calling) definidas con Zod (RF-AG-04/05):** `calcularKPIs`, `consultarEntrevistas`, `consultarHipotesis`, `consultarUmbrales`. Argumentos inválidos se devuelven al agente para autocorrección.
- **Gobierno de ejecución (RF-AG-07/08):** límite de iteraciones + timeout por ejecución; persistir estado/tools/salida/tokens para trazabilidad (posible checkpointer de LangGraph sobre PostgreSQL).
- **Modo consultivo:** la idea solo cambia de estado **tras aprobación humana** del veredicto. Se conservan veredicto del agente y verificación del usuario aunque difieran.

## BYOK, proveedores y costo

- Cada usuario aporta **su propia API key** (BYOK). Debe **cifrarse en reposo** y **nunca devolverse al frontend** tras guardarla (RF-21, RNF-07). Se **valida contra el proveedor** al guardarla (RF-20).
- Los modelos por proveedor son una **lista curada, configurable y actualizable sin redesplegar** (RF-19, RNF-18) — los catálogos cambian rápido. **No cablear modelos en código.**
- Se configuran **dos modelos por tarea**: uno económico para scoring, uno potente para veredicto (RF-22b).
- **Scoring idempotente (RF-22c):** hash de respuestas + versión de rúbrica; no re-puntuar si nada cambió.
- **Costo estimado** (RF-22e/f): calculado localmente desde tokens × tabla de precios configurable. **Es un estimado del consumo vía ValidaLab, NO el saldo de la cuenta** — las API keys de inferencia no exponen el saldo. Para recargar, solo se enlaza al panel de facturación del proveedor.

## KPIs (sección 7 del SRS)

ValidaLab calcula KPIs en cuatro grupos (outreach, calidad del descubrimiento, señal de problema, señal de mercado/pago), cada uno con umbral GO y KILL por defecto **editables por idea**. Los umbrales **no** son la decisión: son el criterio que el agente pondera. La traducción de KPIs a veredicto la hace el **razonamiento del agente**, no una fórmula rígida. Refresco de KPIs: < 1 s para hasta 200 entrevistas (RNF-02).

## Prioridades de implementación (MoSCoW)

Los requisitos **Must** constituyen el MVP. Al construir, prioriza en este orden el camino crítico: cuentas/aislamiento (E0) → portafolio de ideas (E1) → hipótesis y umbrales (E2) → CRM de contactos (E3) → entrevistas + scoring por IA (E4) → KPIs y tablero (E5) → veredicto del agente (E6) → config BYOK (E7). Costo/optimización (E8) es mayormente Should/Could.

## Idioma

El dominio, la documentación y los identificadores funcionales están en **español** (idea, hipótesis, entrevista, veredicto, umbral, score). Mantén la terminología del SRS en el código de dominio para que coincida con la especificación.
