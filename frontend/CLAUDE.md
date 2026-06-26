# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This file covers the **frontend** package. Two companion docs apply and should be read alongside it:

- `../CLAUDE.md` (repo root) — the ValidaLab domain model, the Validador Inteligente agent, BYOK, KPIs, and the SRS-driven feature epics. This is the source of truth for *what* to build, and it indexes the API contract.
- `../contrato-api/openapi.yaml` — the **single API contract** and the source of truth for the frontend↔backend interface. Build every HTTP call against this document; do **not** inspect or import `backend/` code to learn request/response/error shapes. The cross-cutting conventions (auth, `owner_id` isolation, error envelope, pagination, naming) are summarized in the root `CLAUDE.md` and detailed here.
- `.claude/CLAUDE.md` — Angular/TypeScript coding conventions (standalone components, signals, `input()`/`output()`, native control flow, `inject()`, OnPush, reactive forms). These are binding style rules; do not restate them in code review, just follow them.

## Commands

Run from `frontend/`:

```bash
npm start            # ng serve — dev server at http://localhost:4200
npm run build        # ng build — output to dist/ (production-optimized by default)
npm run watch        # ng build --watch --configuration development
npm test             # ng test — Karma + Jasmine, watches by default
```

Run a single test file or focus a suite:

```bash
npm test -- --include='**/app.spec.ts'   # restrict the run to one spec file
```

Or focus in code with Jasmine's `fdescribe` / `fit` (remember to revert before committing). There is no e2e framework wired up yet.

This package has no `lint` script and no ESLint config — only Prettier (configured inline in `package.json`: 100-col, single quotes, Angular HTML parser). The `backend/` package is where `npm run lint` lives.

## Architecture

- **Angular 22, standalone bootstrap.** No NgModules. Entry is `src/main.ts` → `src/app/app.ts`, configured by `src/app/app.config.ts`. Routes live in `src/app/app.routes.ts` (currently empty — feature routes get added here, lazy-loaded).
- **Zoneless change detection.** `app.config.ts` uses `provideZonelessChangeDetection()`, so there is no Zone.js. Change detection is driven by signals — component state that the template reads **must** be a signal (or set via `markForCheck`-equivalent signal updates), otherwise the view will not update. This makes the signals-first rules in `.claude/CLAUDE.md` mandatory, not stylistic. Async work that should refresh the UI must flow through signals.
- Global error listeners are enabled via `provideBrowserGlobalErrorListeners()`.

This is a fresh Angular CLI scaffold: the only app code is the root `App` component. There is no HTTP layer, auth, state library, or domain UI yet. When building features, follow the SRS epic order from the root doc (accounts/isolation → ideas → hypotheses/thresholds → contacts CRM → interviews+AI scoring → KPIs/dashboard → verdict → BYOK config) and keep domain identifiers in **Spanish** to match the SRS (`idea`, `hipótesis`, `entrevista`, `veredicto`, `umbral`, `score`).

The frontend is a multi-tenant SaaS client talking to the NestJS backend; the agent (Validador Inteligente), BYOK key handling, and KPI calculation all live server-side — the frontend never sees raw API keys and never runs the agent.

## OpenSpec workflow

This repo uses **OpenSpec** (spec-driven development). `openspec/` exists at the repo root and inside both `frontend/` and `backend/`, each with `config.yaml`, `specs/`, and `changes/`. Substantial features should go through the OpenSpec change lifecycle (propose → apply → verify → archive) — the `opsx:*` / `openspec-*` skills drive this. Check `openspec/changes/` for in-flight work before starting a feature.
