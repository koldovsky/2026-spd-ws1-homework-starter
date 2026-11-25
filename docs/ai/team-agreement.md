# Team AI agreement — Team Tasks

<!-- owner: @vajs · review-by: 2027-02-24 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | L3 | New tests fail without the change and pass with it; `npm test` and `npm run typecheck` exit 0, re-run by the reviewer | Any team member reviews the PR |
| API endpoint (`app/api/**`) | L3 | One route test per status code; `npm test`, `npm run typecheck`, `npm run build` green | Any team member reviews the PR |
| New DB migration (`db/migrations/**`, new file) | L2 | `npm test` exits 0 (it applies every migration to an in-memory DB, so the new file runs after `001`, `002`); rollback note in the PR | @vajs (tech lead) reviews every line |
| Editing a tracked migration (committed `db/migrations/*.sql`) | L0 | Blocked by the `PreToolUse` hook (exit 2); fix forward with a new migration | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

No row is L4 yet. L4 needs a CI job that runs `npm test` and `npm run typecheck` on every PR, and an agent merge path; the repo has neither, and `git push` is `ask` in `.claude/settings.json`. Tests-only changes move to L4 when both exist.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. "The agent did it" is not a review answer.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @vajs (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone proposes a change to a rule, skill, hook or permission by PR that touches the harness files.
2. At least one CODEOWNER approves. Behaviour changes need an A/B note (`docs/ai/ab-note.md` format): same task, 2+ runs before and after.
3. The PR updates the `review-by` date of every rule it touches, and states the `why`.
4. When a rule passes its `review-by` date, its owner either renews it by PR with fresh evidence or deletes it. Expired rules are not silently trusted.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
