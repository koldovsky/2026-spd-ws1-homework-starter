# Team AI agreement — Team Tasks

<!-- owner: @flatdeh · review-by: 2027-03-01 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Business rule / API route (`lib/tasks.ts`, `app/api/**`) | L3 | A test per rule and per status code (400/422/201); `npm test` + `npm run typecheck` exit 0 | @flatdeh Any team member reviews the PR |
| New DB migration (new file in `db/migrations/`) | L2 | Applies on a fresh `:memory:` DB via tests; `check` constraints mirror `lib/tasks.ts`; rollback = a follow-up migration | @flatdeh Any team member reviews the PR |
| Editing an applied migration | L0 | Blocked by the `protect-migrations` hook (exit 2) | — |
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L1 | Agent proposes; A/B note shows the behaviour change | CODEOWNERS |
| Secrets, `.env*`, force-push | L0 | Denied in `.claude/settings.json` | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. "The agent did it" is not a review answer.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @flatdeh (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone proposes a rule change by PR; the PR states the incident or need (the `why`).
2. The harness owner reviews. Behaviour changes need an A/B note (same task, ≥ 2 runs each side) or hook output as evidence.
3. Every rule, skill and hook has `owner`, `why`, `review-by`. Past `review-by` the owner re-confirms (new date) or deletes it.
4. A level moves up only with a new cheap, independent check; it moves down immediately after an incident.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
