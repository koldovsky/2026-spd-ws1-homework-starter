# Team Tasks — agent instructions

<!-- owner: @garnaga · why: one instruction file every fresh agent session reads in this repo, instead of scattered CLAUDE.md copies · review-by: 2027-02-25 -->

## Commands

- `npm install` — install dependencies
- `npm test` — vitest
- `npm run typecheck` — TypeScript
- `npm run db:reset` — rebuild SQLite from migrations
- `npm run dev` — dev server at localhost:3000, API at `/api/tasks`

## Hard rules

- Never edit files in `db/migrations/` — a hook will block you; add a new numbered migration (skill: `add-migration`).
- Never commit `.env` or anything in `secrets/`.
- No `CLAUDE.md`/`CLAUDE.local.md` in this repo — `AGENTS.md` is the single instruction file.
- Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) change only by PR reviewed by `@garnaga` (see `CODEOWNERS`).

## Pointers

- Autonomy levels + who signs off → `docs/ai/team-agreement.md`
- Schema changes → `.claude/skills/add-migration/SKILL.md`
- Migrations rule → `.claude/rules/db-migrations.md`
- End-of-session handoff → `docs/ai/handoff-template.md`
- Proof the harness works → `docs/ai/ab-note.md`
