# Team AI agreement — Team Tasks

<!-- owner: @e5d3e1 · review-by: 2027-02-24 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | L3 | Tests for a behaviour change fail without the change and pass with it; regression tests for existing behaviour pass on the base branch and the PR says which behaviour they pin; `npm test` green | Any team member reviews the PR |
| API route (`app/api/**`) | L3 | Logic stays in `lib/`; a test per status/rule branch; `npm test` and `npm run typecheck` green | Any team member |
| Business rule (`lib/tasks.ts`) | L2 | Test for both sides of each boundary; rule change is mentioned in `AGENTS.md` if numbers change | Tech lead reads every line |
| New DB migration (`db/migrations/NNN_*.sql`) | L2 | Done through the `add-migration` skill: runs on a fresh DB (`npm test` applies all migrations to an empty DB), rollback described in the PR | Tech lead |
| Edit of an applied migration | L0 | Blocked by the `protect-migrations` hook (exit 2); see `docs/ai/hook-evidence.md` | — |
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L1 | Agent may draft; change goes through the process in section 4 with CODEOWNERS approval | Harness owner |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.
No type is at L4 yet: we have no CI that gates merges, so nothing here earns "agent merges".

Shell edits of migrations: a `PreToolUse` check on `Bash` blocks write-like commands on `db/migrations`, and a `PostToolUse`
check (`git diff` against `HEAD`) catches the rest after the command ran. Neither sees a change the agent committed, so
reviewers still check the PR diff (merge base to PR head): `git diff --name-status main...HEAD -- db/migrations`
shows only `A` lines and no symlinks (limits: `docs/ai/hook-evidence.md`).

Permissions (`.claude/settings.json`) match the command text: `.env` is denied to the file tools, to commands that name it
(`cat .env`) and to any Bash command containing `.env`; recursive `rm` and force push are denied in their common spellings
(also `git -C . push --force`). Not covered: a command that reads `.env` without naming it (`grep -r KEY .`) or a script
that builds the name itself; OS-level enforcement would need the sandbox, which we do not enable (it breaks the npm cache).

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. "The agent did it" is not a reason in review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @e5d3e1 (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone proposes a change to a rule, skill, hook or permission by PR; the PR says which incident or need it answers (the `why`).
2. A behaviour change (new rule, new hook, changed permission) needs an A/B note in the PR: the same task before and after, at least 2 runs each (`docs/ai/ab-note.md` format).
3. The harness owner (CODEOWNERS) approves. Nobody merges changes to harness files on their own.
4. Every rule carries `owner`, `why` and `review-by`. After the `review-by` date the owner re-confirms the rule (bump the date) or removes it.
5. The Next.js rule (`.claude/rules/nextjs.md`) is a manual copy; re-check it whenever `next` is upgraded.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
