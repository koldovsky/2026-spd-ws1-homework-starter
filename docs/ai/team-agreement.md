# Team AI agreement — Team Tasks

<!-- owner: @skindyk · why: one page that says how far agents may go here and what evidence earns it · review-by: 2027-03-01 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level (checked every time) | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | **L3** | Red→green shown in the PR: the new test's failing run before the change (skill step 3) and green after; CI (`.github/workflows/ci.yml`) green. Not L4 yet: CI is not a required check and auto-merge is off. | any team member |
| Business rule in `lib/tasks.ts` (limits, transitions) | **L3** | One test per bound / transition (valid edge, invalid edge) in `lib/tasks.test.ts`; `npm test` + `npm run typecheck` green locally and in CI; SQL `check` matches the TS limit | any team member |
| API route (`app/api/**`) | **L3** | Follows `.claude/rules/api-routes.md` (400 shape / 422 `RuleViolation`); `npm run typecheck` + `npm test` green; PR shows a `curl` per status code | any team member |
| New migration (`db/migrations/NNN_*.sql`) | **L2** | Runs on a fresh DB (`npm test` uses `:memory:`, applying every migration) and on an existing one (upgrade test for table rebuilds); CI step "Applied migrations are unchanged" green; human reads every SQL line (data loss risk) | @skindyk (CODEOWNERS) |
| Harness (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | **L2** | A/B note for behaviour changes (`docs/ai/ab-note.md`); `node docs/ai/hook-cases.mjs` green (also in CI); edits to `.claude/**`, `.github/**` and `AGENTS.md` are `ask` in settings | @skindyk (CODEOWNERS) |
| Dependencies (`package.json`, lockfile) | **L1** | `npm install` and edits to `package.json` are `ask`; human decides and runs the install | @skindyk |
| Editing / deleting an applied migration | **L0** | Blocked before the call by `.claude/hooks/protect-migrations.mjs` (exit 2); anything that slips through is reported after the command by `check-migrations-diff.mjs`; CI fails the PR for every agent and person | — |
| Secrets, local DB (`.env*`, `data/**`) | **L0** | `deny` Read/Edit rules in `.claude/settings.json`. Claude Code also applies them to shell reads (`cat .env`, `Get-Content .env` were denied in a live test). `.claude/hooks/protect-secrets.mjs` blocks what the denies miss: recursive searches over the root (`grep -rn X .` printed `.env` before the hook) and inline scripts. Cases in `hook-cases.mjs`, run in CI. | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.
Tests-only goes to L4 when the `ci` workflow is a **required** status check on `main` and auto-merge is enabled for agent PRs.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it: they ran the checks in the matrix, read the diff, and answer
review comments. "The agent did it" is not an answer in review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`, `.github/**`, `db/migrations/`, `lib/db.ts`, `package*.json`, `next.config.ts`: @skindyk (see `.github/CODEOWNERS`)
- CODEOWNERS only gates merges with branch protection on `main`: "Require a pull request", "Require review from Code Owners", and `ci` as a required check.
- One owner cannot approve their own PR. Until a second owner is added, harness PRs by @skindyk need one other team member's approval. Adding a second harness owner is the first change to make when the team grows.

## 4. How rules change

1. Anyone proposes a change by PR, with the incident or need in the `why:` of the rule header.
2. A CODEOWNER reviews. Behaviour changes (new/changed rule, skill, hook, permission) need evidence: an A/B note with
   ≥ 2 runs per side, or for a hook the manual run output and exit code.
3. On merge the header gets a `review-by` date 3–6 months out.
4. Past its `review-by`, the owner re-confirms the rule (new date, same PR flow) or deletes it. A rule nobody can
   justify is removed.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
