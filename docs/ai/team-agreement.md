# Team AI agreement — Team Tasks

<!-- owner: @AlexSylka · why: without an agreed autonomy level per change type, each person trusts agent output differently and reviews are inconsistent · review-by: 2027-02-22 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`**/*.test.ts`) | L3 | The new test fails when the code it covers is broken on purpose (shown in the PR); `npm test` and `npm run typecheck` green. Moves to L4 once CI runs both on every PR | Any team member reviews the PR |
| Business rules (`lib/tasks.ts`) | L3 | Every rule the PR adds or changes has a test in `lib/tasks.test.ts` that fails without it; `npm test` and `npm run typecheck` green | Any team member reviews the PR |
| API endpoint (`app/api/**`) | L3 | `npm test` and `npm run typecheck` green; a manual `curl` against `npm run dev` for every status code the PR adds or changes, pasted in the PR | Any team member reviews the PR |
| New DB migration (`db/migrations/NNN_*.sql`, new file) | L2 | `npm test` green (every test opens an in-memory DB and runs all migrations from 001); an upgrade test that applies the new migration to a DB already holding a task (plain `npm test` cannot catch a migration that breaks on existing rows); rollback note in the PR; next unused number | Tech lead reviews every line |
| Editing or deleting a committed migration | L0 | Blocked by the `PreToolUse` hook (exit 2, covered by `.claude/hooks/protect-migrations.test.ts`); schema changes go in a new migration | — |
| Harness (`AGENTS.md`, `.claude/**`, `.github/**`, `docs/ai/**`, `next.config.ts`) | L2 | `ask` in `.claude/settings.json` makes a human approve each agent edit; CODEOWNERS review on the PR | Harness owner |
| Secrets (`.env*` except `.env.example`) | L0 | `deny` rules in `.claude/settings.json` for Read and Edit | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.
`deny` and `ask` rules on `Bash(...)` are a speed bump, not a wall: they match command prefixes, and `cat .env` or
`node -e` get around them. The real guards are the hook and CODEOWNERS review.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. "The agent did it" is not a reason for a bug, and the
author must be able to explain every changed line before asking for review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `.github/**`, `docs/ai/**`, `next.config.ts`: @AlexSylka (see `.github/CODEOWNERS`)
- Single-owner team for this homework: @AlexSylka holds every role named in the matrix (tech lead, harness owner,
  reviewer). A real team adds a second owner, so one person's absence never blocks a rule change.

## 4. How rules change

1. Anyone proposes a change by PR that touches the rule, skill, hook or this matrix. No direct pushes to `main`:
   its branch protection must require a PR and "Review from Code Owners", otherwise CODEOWNERS only requests a review.
2. A CODEOWNER reviews it. A behaviour change needs evidence: an A/B note (`docs/ai/ab-note.md` format) with at
   least 2 runs on each side, or a hook test with its exit codes.
3. Every rule, skill and hook has `owner`, `why` and `review-by` in its header. After the review-by date the owner
   either renews it with a new date, or removes it in a PR. Expired rules are not silently trusted.
4. A level moves up only after the check for it exists and has run on at least two merged PRs. A level moves down
   immediately after an incident, and the incident is described in the PR.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
