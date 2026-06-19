# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This file covers the **backend** package. The companion doc `../CLAUDE.md` (repo root) is the source of truth for *what* to build: the ValidaLab domain model, the Validador Inteligente agent, BYOK, KPIs, and the SRS-driven feature epics. Read it alongside this file.

## Commands

Run from `backend/`:

```bash
npm run start:dev    # nest start --watch — dev server, default port 3000 (PORT env overrides)
npm run start:debug  # same, with --debug inspector attached
npm run build        # nest build — output to dist/
npm run start:prod   # node dist/main — runs the built output
npm run lint         # eslint --fix over {src,apps,libs,test}/**/*.ts
npm run format       # prettier --write over src + test
```

Tests (Jest + ts-jest):

```bash
npm test                                # all unit specs (*.spec.ts under src/)
npm run test:watch                      # watch mode
npm run test:cov                        # with coverage (output to ../coverage)
npm run test:e2e                        # e2e specs under test/ (separate config: test/jest-e2e.json)
npm test -- src/app.controller.spec.ts  # run a single spec file
npm test -- -t "name of the test"       # run tests matching a name pattern
```

Unit-test config lives inline in `package.json` (`rootDir: src`, `testRegex: .*\.spec\.ts$`). E2e tests use `test/jest-e2e.json` and `rootDir: .` — keep unit specs next to source and e2e specs in `test/`.

## Architecture

This is a **NestJS 11** scaffold with only the default `AppController`/`AppService` so far — no domain code, no persistence, no auth. `src/main.ts` bootstraps `AppModule`. When building, the structure is mandated by the SRS (see root doc), not yet present in the tree:

- **Modular by domain (RNF-10).** One Nest module per bounded context: `usuarios`, `ideas`, `contactos`, `entrevistas`, `kpis`, `agente`, `proveedores`. Wire each as a feature module imported by `AppModule`.
- **Multi-tenant from day one.** Every query filters by `owner_id`; no user sees another's data. Auth + RBAC + tenant isolation are foundational (epic E0), not a later add-on.
- **The Validador Inteligente** (the agent) is a **LangGraph.js** service, not a plain API call. It lives in the `agente` module as an **injectable service decoupled from controllers**. It does interview scoring (auto, on save) and idea verdicts (on demand). All agent output is **validated with Zod** before it can touch scores/KPIs/verdicts; invalid output is retried, never persisted.
- **Provider-agnostic agent layer (RNF-06).** An abstraction layer hides Anthropic/OpenAI/Google differences behind a common adapter, selected per user via their BYOK config. Adding a fourth provider must not ripple. Curated model lists are configurable at runtime — **never hard-code model names**.
- **Persistence is PostgreSQL.** KPIs must be reconstructible from the interviews that originate them (RNF-15); an interview cannot exist without a valid idea + contact of the same user (RNF-14). When a user adjusts an agent score, both values are kept and the manual one prevails in KPI math.

Build in SRS epic order: accounts/isolation (E0) → ideas (E1) → hypotheses/thresholds (E2) → contacts CRM (E3) → interviews + AI scoring (E4) → KPIs/dashboard (E5) → verdict (E6) → BYOK config (E7).

Keep domain identifiers in **Spanish** to match the SRS (`idea`, `hipótesis`, `entrevista`, `veredicto`, `umbral`, `score`, `contacto`).

## Toolchain notes

- **TypeScript is configured loose**, not strict: `strict` is not set, `noImplicitAny: false`, `strictBindCallApply: false`. Only `strictNullChecks` is on. Module mode is `nodenext`. Decorator metadata (`emitDecoratorMetadata` / `experimentalDecorators`) is on for Nest DI.
- `npm run lint` and `npm run format` apply fixes in place (both use `--fix` / `--write`). This is the package that owns linting for the monorepo — `frontend/` has Prettier only.

## OpenSpec workflow

This package uses **OpenSpec** (spec-driven development): `openspec/` here holds `config.yaml`, `specs/`, and `changes/`. Substantial features should go through the lifecycle propose → apply → verify → archive, driven by the `opsx:*` / `openspec-*` skills. Check `openspec/changes/` for in-flight work before starting a feature.
