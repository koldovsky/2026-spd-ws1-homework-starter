# Agent instructions — Team Tasks

<!-- owner: @oksanastrohetska-lab · why: Give AI agents essential repository instructions · review-by: 2027-04-23 -->

## Project

Next.js 16 + React 19 + TypeScript app (Team Tasks) with route handlers in `app/api/`, SQLite via `node:sqlite`
(`lib/db.ts`) and Vitest tests. Business rules live in `lib/tasks.ts`; migrations in `db/migrations/`.
Needs Node 22.13+.

## Commands

 - `npm test` — run Vitest tests.
 - `npm run typecheck` — TypeScript check (`tsc --noEmit`).
 - `npm run build` — production build.
 - `npm run db:reset` — delete the local SQLite file; migrations re-run on next start.

## Hard rules

- Follow the autonomy levels in `docs/ai/team-agreement.md`.
- Never modify existing files in `db/migrations/`; add a new numbered migration instead (a hook blocks edits).
- Never read or commit `.env*` files, secrets, client data or confidential information.
- Do not modify unrelated files.
- Run `npm test` and `npm run typecheck` before reporting a task as complete.
- Do not merge or push without human approval.

## Workflow

1. Read the relevant code, tests and `.claude/rules/` before changing anything.
2. Make the smallest change that satisfies the task; add or update tests.
3. Run the checks and report actual results (PASS / FAIL / NOT RUN).
4. Summarize changed files, risks and open questions; use `docs/ai/handoff-template.md` if work is unfinished.

## References

- Team policy: `docs/ai/team-agreement.md`
- Path rules: `.claude/rules/` · Procedures: `.claude/skills/` (e.g. `add-migration`)
- Hook evidence: `docs/ai/hook-evidence.md` · A/B note: `docs/ai/ab-note.md`
