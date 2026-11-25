# Team AI agreement — Team Tasks

<!-- owner: @mmelnyk-spd · review-by: 2027-05-25 · change it by PR, CODEOWNERS approve -->

How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Test files only (`*.test.ts`) | L3 | Tests fail without the change, pass with it; `npm test` green; typecheck passes | Any team member |
| New API endpoint + tests | L2 | Route test per status code; `npm test` and `npm run typecheck` green; code review by human | Tech lead |
| DB migration (new file) | L2 | Runs clean on `npm run db:reset`; rollback note in PR; `npm test` green | Tech lead |
| Edit existing migration | L0 | Blocked by hook — never allowed | — |
| Documentation / markdown | L3 | Content reviewed in PR diff; no code changes mixed in | Any team member |
| Dependency changes (`package.json`) | L1 | Agent proposes; human evaluates security, license, bundle size before applying | Tech lead |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. Agent output must pass the same review standards as human-written code.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @mmelnyk-spd (see `.github/CODEOWNERS`)

## 4. How rules change

1. Any team member can propose a change via PR.
2. Harness owners (CODEOWNERS) review. Behaviour changes require an A/B note showing the difference.
3. Rules past their review-by date are either re-confirmed with a new date or removed in the next sprint.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
