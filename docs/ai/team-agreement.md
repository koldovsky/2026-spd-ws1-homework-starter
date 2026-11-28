# Team AI agreement — Team Tasks

<!-- owner: @AlexGLT · why: one place that says how far agents may go, how we check their work and who owns the harness · review-by: 2027-02-24 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | L3 | `npm test` green; new test fails without the change | PR reviewer |
| Business rule in `lib/` | L2 | `npm test` and `npm run typecheck` green; each test fails when the rule is wrong | PR reviewer |
| API route in `app/api/` | L2 | Manual check: bad input gives 400, rule failure gives 422; `npm run typecheck` green (L3 after route tests are written) | PR reviewer |
| New DB migration (`db/migrations/`) | L2 | App starts on a fresh DB after `npm run db:reset`; the PR says how to undo it (a new migration, no `down` file) | Owner (`@AlexGLT`) |
| Dependency in `package.json` | L2 | Exact version, no `^`; `npm test` green | Owner (`@AlexGLT`) |
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L2 | Owner header present; a fresh session can start a task from the repo alone | CODEOWNERS owner |
| Editing an applied migration (`001`, `002`) | L0 | Blocked by hook | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.
No CI exists today, so no change type reaches L4.

## 2. Who owns agent output

The person who opens the PR owns agent output as if they wrote it.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: `@AlexGLT` (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone changes a rule by PR. A new review-by date is also a change.
2. The PR author makes every update, including the fixes a reviewer asks for.
3. A change to agent behaviour needs an A/B note (`docs/ai/templates/ab-note.md`) in the PR.
4. The CODEOWNERS owner reviews the PR. The owner comments, approves, or rejects. The owner does not push to the PR branch.
5. A rule past its review-by date is stale. Anyone opens a PR to set a new date or to remove the rule. The owner's approval re-confirms it.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
