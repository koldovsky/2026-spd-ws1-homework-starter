# AGENTS.md — spd-ws1 task API

Governed by [docs/ai/team-agreement.md](docs/ai/team-agreement.md) (autonomy matrix, owners). Rules here are the short version; the agreement is the source of truth.

## Commands

- `npm install` — setup (Node ≥ 22.13)
- `npm test` — vitest
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:reset` — recreate SQLite DB and apply `db/migrations/*.sql` in order
- `npm run dev` — http://localhost:3000 (Next.js 16 writes a managed block into this file on `next dev`; keep it or set `agentRules: false` — see next.config.ts)

## Stack map

- `app/api/**` — route handlers (`/api/tasks`, `/api/tasks/<id>`)
- `lib/tasks.ts` — business rules (title 1..120, estimate 1..40, status flow todo → doing → done; `done` is final)
- `lib/db.ts` — `node:sqlite`; applies pending migrations in file-name order
- `db/migrations/*.sql` — append-only; never edit an applied migration

## Hard rules

1. **Never edit an existing file in `db/migrations/`** — add a new migration instead. Blocked by hook.
2. **Never read, write or commit `.env` / `.env.local` / `.env.development` / `.env.production`, keys or tokens.** Read and edit denied via permissions (`.env.example` stays readable — it documents the shape).
3. Business-rule changes in `lib/tasks.ts` come with a test in `lib/tasks.test.ts`.
4. Every rule/skill/hook file carries an `owner · why · review-by` header — see [docs/ai/templates/rule-header.md](docs/ai/templates/rule-header.md).
5. Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`, `.github/CODEOWNERS`) change only by PR with CODEOWNERS approval.

## Pointers

- Full autonomy matrix and change process: [docs/ai/team-agreement.md](docs/ai/team-agreement.md)
- Skills: `.claude/skills/` · Path rules: `.claude/rules/` · Permissions & hooks: `.claude/settings.json`
- Repeated procedures live as skills — check `.claude/skills/` before improvising one.
- Handoff: [docs/ai/handoff-template.md](docs/ai/handoff-template.md)
