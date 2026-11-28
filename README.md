# 2026-spd-ws1-homework-starter

Starter repo for **Homework 1.1 «Your team harness, in one PR»** of the SPD «Team AI Engineering» workshop.
A tiny Next.js app (Team Tasks) with an API, SQLite migrations and tests. The app is small on purpose: the homework
is the agent harness around it.

**Start here: [HOMEWORK.md](HOMEWORK.md)** — task, deliverables, how to submit, rubric.

**Homework 1.2 (traceability): [HOMEWORK-1.2.md](HOMEWORK-1.2.md)** — ticket [TASK-7](docs/tickets/TASK-7.md),
CI files in [docs/ai/ci/](docs/ai/ci/README.md), deadline Wed 02.12.2026 23:59 (Kyiv).

## Run it

Needs Node.js 22.13 or newer (Node 24 LTS recommended) and Claude Code 2.1.281 or newer.

```bash
npm install
```

```bash
npm test
```

```bash
npm run dev
```

The app is at http://localhost:3000, the API at `/api/tasks` (`GET`, `POST`) and `/api/tasks/<id>` (`PATCH` with a status).

| Where | What |
|---|---|
| `lib/tasks.ts` | business rules: title and estimate limits, `todo → doing → done`, done is final (the code is the source of the numbers) |
| `lib/db.ts` | SQLite via `node:sqlite`, applies `db/migrations/*.sql` in order |
| `db/migrations/` | applied migrations, protected by a `PreToolUse` hook (`.claude/hooks/`) and a `deny` rule for `sed -i` |
| `app/api/` | route handlers |
| `docs/ai/templates/` | templates for the homework |
| `docs/tickets/` | tickets to deliver (HW 1.2) |
| `docs/ai/ci/` | copy-paste CI gates (HW 1.2), not active here |

Agent harness: `AGENTS.md` (agent instructions), `.claude/` (rules, skill, hook, permissions), `docs/ai/` (team agreement,
handoff template, A/B note) and `.github/CODEOWNERS`. Rules, autonomy levels and owners: `docs/ai/team-agreement.md`.
`next.config.ts` sets `agentRules: false`, so `npm run dev` does not write a managed block into `AGENTS.md`.
