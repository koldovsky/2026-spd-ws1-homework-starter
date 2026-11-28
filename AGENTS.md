# Team Tasks

<!-- owner: @artem-tkachenko · why: one entry point so a fresh agent session can start a task from the repo alone · review-by: 2027-05-23 -->

A simple team todo list. Next.js 16 (App Router) + React 19. Route handlers in `app/api/` call business rules in `lib/tasks.ts`,
which use SQLite via `node:sqlite` (`lib/db.ts`). Tests: Vitest. Node.js 22.13+.

## Commands

- `npm install` — ask first; if `node_modules/` is missing, it is safe to approve. Do not add, remove or update packages without approval.
- `npm test`, `npm run typecheck` — run without asking; both must be green before you call a task done
- `npm run dev`, `npm run build`, `npm start` — only with the developer's approval
- `npm run db:reset` — never run it; only a human runs it by hand

## How to work

- Keep business rules in `lib/tasks.ts`; route handlers only parse input and map errors to status codes (`RuleViolation` → 422).
- Every new or changed rule gets a test in `lib/tasks.test.ts`.
- Follow the existing style of the file you edit. Keep changes to the scope of the task.
- If you see something worth improving outside the task, or the task conflicts with existing code, ask the developer first.

## Hard rules

- Never edit an applied migration in `db/migrations/`. To change the schema, follow the `new-migration` skill.
- Never read `.env` or `.env.*` files; `.env.example` is fine (fake values only).
- Never run `git pull`, `git commit`, `git push`, `git reset`, `git clean`, `git restore` or `git checkout --` without the developer's approval.
- Ask before editing files. Ask per file, or once for a whole group: UI (`app/**/*.tsx`), API (`app/api/**`),
  business logic (`lib/**`), documentation (`docs/**`, `README.md`).
- Never create `CLAUDE.md` or `CLAUDE.local.md`; `AGENTS.md` is the only root-level instruction file. Path-specific instructions live in `.claude/rules/`.

## Where to look

- Before a risky change, or to check what needs approval → `docs/ai/team-agreement.md`
- Business rules (title 1..120, estimate 1..40 h, `todo → doing → done`, done is final) → `lib/tasks.ts`, `lib/tasks.test.ts`
- Continuing someone else's work → their handoff note; ending a session → fill `docs/ai/handoff-template.md`
