# Team Tasks — agent instructions

Next.js 16 + SQLite (`node:sqlite`) app. Node >= 22.13. Team agreement: `docs/ai/team-agreement.md`.

## Commands
- `npm test` — vitest; `npm run typecheck` — tsc. Both must pass before you say "done".
- `npm run db:reset` — deletes the local DB (`data/tasks.db`); never run it against anything but local data.
- `npm run dev` — http://localhost:3000. `next.config.ts` sets `agentRules: false`, so it does not edit this file.

## Hard rules
- Business rules live in `lib/tasks.ts` only; route handlers in `app/api/` just parse input and map errors
  (`RuleViolation` → 422, bad body → 400).
- Applied migrations in `db/migrations/` are immutable. Schema change = a new numbered file
  (use the `add-migration` skill). A hook blocks edits to existing ones.
- Every behaviour change ships with a test in `lib/*.test.ts`.
- Do not create `CLAUDE.md` / `CLAUDE.local.md`. Personal prefs go in `~/.claude/CLAUDE.md`.
- Never commit `.env*` (except `.env.example`) or `data/*.db`.

## Pointers
- Path rule for migrations: `.claude/rules/migrations.md`; skill: `.claude/skills/add-migration/`.
- End of session: fill `docs/ai/handoff-template.md` into a handoff note.
- Rule headers (owner / why / review-by): `docs/ai/templates/rule-header.md`.
