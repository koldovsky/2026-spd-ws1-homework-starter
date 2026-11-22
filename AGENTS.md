<!-- owner: @AlexSylka · why: a fresh agent session must start a task from the repo alone; this is the only file every session loads · review-by: 2027-02-22 -->
# Team Tasks — agent guide

Next.js 16 app (tasks API + UI) on SQLite via `node:sqlite`. Node >= 22.13. Team rules: `docs/ai/team-agreement.md`.

## Commands
- `npm install` — first, on a fresh clone
- `npm test` — vitest, must pass before you say "done"
- `npm run typecheck` — `tsc --noEmit`, must pass too
- `npm run dev` — app on http://localhost:3000, API at `/api/tasks`
- `npm run db:reset` — delete the local DB; migrations re-run on next start

## Where things live
- `lib/tasks.ts` — business rules: title 1..120, estimate 1..40 h, `todo ⇄ doing → done`, done is final
- `lib/db.ts` — applies `db/migrations/*.sql` in file-name order
- `app/api/**` — route handlers; `lib/*.test.ts` — tests

## Hard rules
- NEVER edit, rename or delete a committed migration in `db/migrations/`. Schema change: use the `add-db-migration` skill.
- Business rules go in `lib/tasks.ts`, not in route handlers. Allowed values and ranges (a priority level, a length) are
  business rules: a route only checks that the JSON has the right type, `lib/tasks.ts` throws `RuleViolation`.
- A behaviour change comes with a test that fails without it.
- No secrets or `.env*` in commits; use `.env.example` for new variables.
- No `CLAUDE.md` or `CLAUDE.local.md`. Personal settings go to `~/.claude/` and `.claude/settings.local.json`.

## Harness
- Path rules: `.claude/rules/`; skills: `.claude/skills/`; hooks and permissions: `.claude/settings.json`
- Handoffs: if `docs/ai/handoffs/` has a note for your branch, read it first. Ending mid-task: write one from
  `docs/ai/handoff-template.md`.
- Changing any rule or hook: PR, owner approval via `.github/CODEOWNERS`

<!-- Next.js agent rules are disabled on purpose: `agentRules: false` in next.config.ts, so `npm run dev` never rewrites this file. -->
