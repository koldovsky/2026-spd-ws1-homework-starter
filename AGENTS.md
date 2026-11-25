# Team Tasks — Agent Instructions

## Stack

Next.js 16, React 19, SQLite (node:sqlite), Vitest. Node ≥ 22.13.

## Commands

- `npm test` — run all tests (vitest)
- `npm run typecheck` — TypeScript check
- `npm run dev` — dev server on :3000
- `npm run db:reset` — reset local database

## Hard rules

1. **Never edit applied migrations** in `db/migrations/`. Create a new migration file instead.
2. **Every API route** must have a corresponding test in the same directory or `lib/`.
3. **No `console.log`** in committed code — use proper error handling.
4. **No secrets** in source — use environment variables.
5. **Immutable data** — return new objects, never mutate arguments.

## Workflow

- Run `npm test` before suggesting a task is done.
- Run `npm run typecheck` after editing `.ts`/`.tsx` files.

## Deeper docs

- Team agreement: `docs/ai/team-agreement.md`
- Handoff template: `docs/ai/handoff-template.md`
- Skills: `.claude/skills/`
