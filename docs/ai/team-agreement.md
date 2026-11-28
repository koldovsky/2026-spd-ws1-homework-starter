# Team AI agreement — Team Tasks

<!-- owner: @evgenyadev · why: agree how far agents go before they go there · review-by: 2027-02-20 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

"CI" means `.github/workflows/ci.yml`: `npm test`, `npm run typecheck`, `npm run hook:test`, `npm run harness:check`.
It runs on every push and PR, whoever wrote the change.

| Change type | Level | Evidence that earns this level | Enforced by | Who signs off |
|---|---|---|---|---|
| Tests only (`*.test.ts`, `*.test.mjs`) | L3 now, L4 target | Each new test fails on the code before the change and passes after; CI green | CI | Any member; weekly sample at L4 |
| Docs outside the harness (`README.md`, code comments) | L3 | `git diff --stat` shows no code change; CI green | CI | Any member |
| API route (`app/api/**`) | L3 | A test per status code the change touches (201/400/404/422); no input yields a 500; CI green. **Known gap:** no route-test helper yet. Until one exists, the PR pastes `curl -i` output against `npm run dev` for each status code the change touches, and this row is effectively L2 | CI, `AGENTS.md` | Any member |
| Business rule (`lib/tasks.ts`) | L2 | Boundary tests on both sides of every limit; app rule and DB `check` agree | `AGENTS.md`, CI | @evgenyadev |
| New migration (`db/migrations/NNN_*.sql`) | L2 | `npm test` applies every migration to a fresh DB; `git status --porcelain db/migrations` shows only the new file; rollback note in the PR | Path rule `migrations.md`, skill `add-migration`, CI | @evgenyadev |
| Dependencies (`package.json`, lockfile) | L1 | Human runs the install and reads the lockfile diff | `ask` on `npm install` and `package.json` edits | @evgenyadev |
| Harness (`AGENTS.md`, `.claude/**`, `docs/ai/**`, CI) | L1 | A/B note for any behaviour change; `harness:check` green | CODEOWNERS approval (the real gate). `ask` on Edit/Write of these paths stops file-tool edits, but `Edit(...)` rules do not cover shell writes, and `acceptEdits` auto-approves simple ones like `printf >> file` (verified, `hook-evidence.md` §7) | @evgenyadev |
| Editing an applied migration · reading `.env` · creating `CLAUDE.md` | L0 | Blocked; `hook:test` proves the block in CI | Hook `protect-migrations.mjs` (exit 2), `deny` rules | — |

**Moving levels.** A change type goes one level up only when its check is cheap, independent of the agent, and runs
every time. It goes one level down after any incident that its check missed, until a check covers that case.
Tests stay at L3 until branch protection makes CI a required check; only then can a green gate merge.

## 2. Who owns agent output

The person who opens the PR owns every line in it as if they wrote it, including what an agent generated.
"The agent did it" is not a review answer.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`, `.github/**`: @evgenyadev (see `.github/CODEOWNERS`).
- The owner of a single rule, skill or hook is in its header (`owner · why · review-by`).

## 4. How rules change

1. Anyone opens a PR that adds, changes or removes a rule, with the `why` in the header.
2. A CODEOWNER approves. A change meant to alter agent behaviour needs an A/B note (`docs/ai/ab-note.md` format),
   2+ runs per side.
3. CI must be green, including `npm run hook:test` for hook changes and `npm run harness:check` for headers.
4. When `harness:check` reports a passed `review-by`, the owner re-confirms the rule with a new date or deletes it
   in a PR, within a week.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
