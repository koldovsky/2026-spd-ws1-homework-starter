# Team Tasks — agent guide

<!-- owner: @SayidJarrah · why: one shared entry point so a fresh session can start a task without extra explanation · review-by: 2027-05-25 -->

Tiny Next.js 16 app with a SQLite API. Business rules live in `lib/tasks.ts`; routes in `app/api/` only translate HTTP.

## Commands (Node >= 22.13)

- `npm test` — unit tests; they open `:memory:` and apply every migration from scratch
- `npm run typecheck` — TypeScript, no emit
- `npm run dev` — app on http://localhost:3000 · `npm run db:reset` — drop the local DB

## Hard rules

- **Never edit an applied migration** in `db/migrations/`. A schema change is a new file `NNN_<what>.sql`
  with the next number. A hook blocks edits to existing files.
- Validation lives in `lib/tasks.ts` and throws `RuleViolation`; routes map it to 422, a malformed body to 400.
  A DB `check` mirrors the rule, it never replaces it.
- Every rule change comes with tests, boundaries included. Done means `npm test` and `npm run typecheck` exit 0.
- Ask before adding dependencies. Never read or write `.env`. No `CLAUDE.md` in the repo.

## Where to look

- How far you may go per change type: `docs/ai/team-agreement.md`
- Path-specific rules: `.claude/rules/` · repeatable procedures: `.claude/skills/`
- Tickets: `docs/tickets/` · handing work over: `docs/ai/handoff-template.md`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
