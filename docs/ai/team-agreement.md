# Team AI agreement — Team Tasks

<!-- owner: @edvardino · why: one shared definition of how far agents may go, so every session behaves the same · review-by: 2027-03-01 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | L4 | New tests fail without the change and pass with it; `npm test` green | Sampled weekly |
| Business rules (`lib/tasks.ts`) | L3 | Every rule in the README table has a test; `npm test` green | PR reviewer |
| API route (`app/api/**`) | L3 | A test per status code (200/201/400/422); `npm test` green | PR reviewer |
| New DB migration (`db/migrations/NNN_*.sql`) | L2 | Applies on a fresh DB (`npm run db:reset`), has a rollback note in the PR, `npm test` green | Tech lead, line by line |
| Editing an applied migration | L0 | Blocked by the `protect-migrations` hook and a `deny` permission | — |
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L2 | A/B note or hook-test output showing the behaviour change | Harness owners |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. "The agent did it" is never a reason in review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @edvardino (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone can propose a change by PR. Touching a rule, skill or hook means updating its header (`owner`, `why`, `review-by`).
2. A harness owner reviews. A behaviour change needs evidence: an A/B note, or hook-test output for hooks.
3. A rule past its `review-by` date is re-confirmed (date moved, with a reason) or removed in the next harness PR.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
