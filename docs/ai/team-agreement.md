# Team AI agreement — Team Tasks

<!-- owner: @vovchik-manko · review-by: 2027-03-31 · change it by PR, CODEOWNERS approve -->

How far agents may go in this repo, how we check their work, and who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Unit tests in `lib/tasks.test.ts` only | L3 | New test fails on the old code and passes on the new one, shown in [docs/evidence/HW-1.1/unit-tests.md](docs/evidence/HW-1.1/unit-tests.md); `npm test` green | PR reviewer |
| Business rule in `lib/tasks.ts` (e.g. estimate validation) | L3 | One unit test per acceptance case; `npm test` and `npm run typecheck` green with exit 0; the acceptance test fails before the change (same evidence file) | PR reviewer |
| API route change in `app/api/**` | L2 | Agent writes, human reviews every line; a test per status code (201, 422) | Harness owner |
| New DB migration in `db/migrations/` | L2 | Migration applies on a fresh database (`openDb(":memory:")` in a test); a rollback note in the PR | Harness owner |
| Editing an applied migration in `db/migrations/` | L0 | Blocked by the `PreToolUse` hook (see `.claude/settings.json`) | — |
| UI changes | L1 | No automated check exists yet, so the human writes the code | Any team member |

Rule of thumb: a change type moves one level up only when its check is cheap, does not depend on the agent, and runs
every time. If a check is missing, the level stays where it is.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. "The agent wrote it" is not a reason for a failing check.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`, `.github/**`: @vovchik-manko (enforced by `.github/CODEOWNERS`)
- `.claude/settings.json` has no header comment, because JSON cannot hold one. Its owner and review-by date are recorded here instead: owner @vovchik-manko, review-by 2027-03-31.

## 4. How rules change

1. Anyone proposes a change by PR that edits the file being changed and states the reason in the PR description.
2. A harness owner reviews it. A behaviour change needs an A/B note (`docs/ai/ab-note.md`) that compares before and after.
3. When a rule passes its `review-by` date, its owner re-confirms it in a PR or removes it.

## 5. Personal vs team

Personal preferences go to `~/.claude/CLAUDE.md` and `.claude/settings.local.json` (git-ignored). The repo has no
`CLAUDE.md` or `CLAUDE.local.md`; `AGENTS.md` is the shared instruction file.
