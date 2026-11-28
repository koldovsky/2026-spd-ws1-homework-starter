# Team AI agreement — Team Tasks

<!-- owner: @IgorPetr · review-by: 2027-02-24 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | L3 | New tests fail without the change and pass with it; `npm test` green. Not L4: the repo has no CI and `git push` needs approval, so nothing can merge on green gates | PR reviewer |
| Business rules (`lib/tasks.ts`) | L3 | One unit test per rule in `lib/tasks.test.ts`; `npm test` and `npm run typecheck` green | PR reviewer |
| API route (`app/api/**`) | L3 | The rule behind each 422 has a unit test in `lib/tasks.test.ts`; the route stays thin (parse, call `lib/tasks.ts`, map `RuleViolation`), which the reviewer checks in the diff; `npm test` and `npm run typecheck` green. There are no route-level HTTP tests yet | PR reviewer |
| New DB migration (new file in `db/migrations/`) | L2 | `npm test` applies every migration to a fresh in-memory DB; `npm run typecheck`; `git diff --stat -- db/migrations` lists only new files; a note on how to undo it; follows the `add-migration` skill | Owner reads every line |
| Editing an applied (committed) migration | L0 | Blocked before the call by the `PreToolUse` hook (Edit, Write and Bash writes) and by `deny` rules for `001_*`/`002_*`; a `PostToolUse` check fails on any modified or deleted tracked migration; schema changes go to a new migration | — |
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L1 | Agent may propose; behaviour changes need an A/B note (`docs/ai/ab-note.md`) | CODEOWNERS |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. "The agent did it" is not a reason in review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`, `db/migrations/**`: @IgorPetr (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone proposes a change by PR. Say which incident or need it comes from (the `why` in the rule header).
2. CODEOWNERS review it. A change in agent behaviour needs evidence: an A/B note with at least 2 runs per side, or the hook output.
3. Every rule, skill and hook has `owner`, `why` and `review-by` (3 months out). Past that date the owner either re-confirms it with a new date or deletes it.
4. Raising a level in the matrix needs the check for that change type to exist and run every time.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
