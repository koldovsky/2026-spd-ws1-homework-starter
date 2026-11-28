# Team AI agreement — Team Tasks

<!-- owner: @Kurkov1990 · review-by: 2027-03-23 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | L3 | `npm test` green; the new test fails when the code under test is reverted (shown in the PR) | any team member |
| README / docs text (`README.md`, `docs/**` outside `docs/ai/`) | L3 | `git diff --name-only origin/main...` lists only those paths (not just any `*.md`: `AGENTS.md` and `.claude/rules/*.md` are harness) | any team member |
| Business rule in `lib/tasks.ts` | L3 | skill `change-task-rule` followed: boundary test red → green, `npm test` + `npm run typecheck` green, README row updated | any team member |
| API route in `app/api/**` | L3 | a test per status code it can return (200/201, 400, 422); `npm test` green; `runtime = "nodejs"` kept | any team member |
| New DB migration (`db/migrations/NNN_*.sql`) | L2 | hook accepts the name (next number); `npm test` green (tests use `:memory:`, so this already applies every migration to a fresh DB); upgrade path shown in the PR: a DB created on `main` opened once with `DB_FILE=<copy>`, `schema_migrations` gains the new row and existing rows survive; rollback note | @Kurkov1990 |
| Harness (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L2 | A/B note for behaviour changes; a hook change ships with a manual run (payload, stderr, exit code) | CODEOWNERS |
| Editing, renaming or deleting an applied (committed) migration | L0 | `.claude/hooks/guard-migrations.mjs`: PreToolUse blocks it (exit 2); PostToolUse `git diff --name-status HEAD -- db/migrations` catches what the Bash parsing misses and tells the agent to `git restore --source=HEAD` | — |
| Secrets (`.env*` except `.env.example`), dependency changes | L1 | `deny` on the common `.env*` names plus `.claude/hooks/guard-env.mjs` (file tools, Grep, Bash; limits in `docs/ai/hook-evidence.md` §4); `ask` on `npm install` / `package.json` in `.claude/settings.json` | human only |

No row is L4 yet: `git commit` / `git push` are `ask` and there is no CI, so an agent cannot merge on green gates.
Tests-only and docs rows move to L4 once CI runs `npm test` on every PR and the path check above is a required status.

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.
After an incident in a change type, its level drops one step until a new check covers the incident.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it: they ran the checks, read the diff and can explain every line.
"The agent did it" is not an answer in review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`, `db/migrations/`: @Kurkov1990 (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone opens a PR that changes a rule, skill, hook or permission, with the `owner · why · review-by` header filled in.
2. The PR names the reason (incident, review comment, A/B result). A rule without a reason is not merged.
3. A behaviour change ships with an A/B note (≥ 2 runs per side); a hook change ships with its manual-run output
   (`bash docs/ai/hook-samples.sh`).
4. A CODEOWNER approves; merge only with `npm test` green.
5. On the `review-by` date the owner either re-confirms the rule (bumps the date in a PR) or deletes it.
   Expired rules are removed at the first retro after the date.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
