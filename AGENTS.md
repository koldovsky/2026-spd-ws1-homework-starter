<!-- owner: @Bondarenko199 · why: one-page entry point so a fresh agent session can work from the repo alone · review-by: 2027-02-22 -->

# AGENTS.md — Team Tasks (homework starter)

Team agent rules live here. Do **not** create `CLAUDE.md` — this file is the single instruction source.

## Commands

- `npm test` — vitest run (must be green before any PR)
- `npm run typecheck` — `tsc --noEmit` (must be green)
- `npm run dev` — app at http://localhost:3000 (writes nothing into AGENTS.md: `agentRules: false` is set)
- `npm run db:reset` — deletes the local SQLite dev DB; **human-run only** — denied for agents as `npm run db:reset`/`node *db-reset.mjs`, but the effect (deleting `data/tasks.db`) is otherwise reachable; don't do it. A fresh-DB check for agents is `npm test` (why: add-migration skill step 5)

## Hard rules

- **Never edit an existing `db/migrations/*.sql`.** Migrations are immutable once applied. Add a new numbered
  `0NN_*.sql` instead. A PreToolUse hook blocks violations (exit 2); see `.claude/rules/migrations.md` and
  `.claude/skills/add-migration/SKILL.md`.
- Business rules live in `lib/tasks.ts` (title 1..120, estimate 1..40h, `todo → doing → done`, done is final).
  Keep API handlers thin: they map `RuleViolation` to HTTP 422 and nothing else.
- Tests next to the code they cover (`lib/*.test.ts`); no separate test dirs.
- Next.js 16.4.6 is pinned here — your training-data Next.js knowledge may be stale; prefer `node_modules/next/dist/docs/` over recall.
- No secrets, no client code, nothing under NDA — this repo is public.

## Pointers

- Governance: `docs/ai/team-agreement.md` (autonomy matrix, owners, rule changes)
- Harness docs & templates: `docs/ai/` — handoff template, A/B note, hook testing
- Rule/skill/hook header convention (owner · why · review-by): `docs/ai/templates/rule-header.md`
