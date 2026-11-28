# Team Tasks — agent instructions

Next.js 16 + SQLite (`node:sqlite`) app. Node 22.13+. Agreement and autonomy levels: `docs/ai/team-agreement.md`.

## Commands
- `npm test` — vitest, must be green before you say "done"
- `npm run typecheck` — `tsc --noEmit`, must be clean
- `npm run dev` — app on :3000, API at `/api/tasks`
- `npm run db:reset` — delete the local SQLite file (migrations re-run on next start)

## Hard rules
- **Never edit an applied migration** (`db/migrations/001_*`, `002_*`). Add a new numbered file instead. A hook blocks edits.
- Business rules (title length, estimate range, allowed status moves) live only in `lib/tasks.ts`. Do not copy their values elsewhere.
  Route handlers in `app/api/**` stay thin: parse, call `lib/tasks.ts`, map `RuleViolation` to 422.
- Every rule change in `lib/tasks.ts` needs a test in `lib/tasks.test.ts`.
- No `CLAUDE.md` / `CLAUDE.local.md` in the repo. Personal settings go to `~/.claude/` and `.claude/settings.local.json`.
- Never read or commit `.env*` (except `.env.example`). No secrets, no client code.

## Where things are
- `.claude/rules/migrations.md` — loads when you touch `db/migrations/**`
- `.claude/skills/add-migration/` — procedure for a schema change
- `docs/ai/handoff-template.md` — write one at the end of a session
- Changes to `AGENTS.md`, `.claude/**`, `docs/ai/**` need CODEOWNERS review (`.github/CODEOWNERS`)
