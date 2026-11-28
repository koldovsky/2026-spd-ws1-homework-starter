# Team AI agreement for Team Tasks

<!-- owner: @TyshchenkoOleksandr · why: set the limits of agent work · review-by: 2027-02-25 -->

This page has three parts. It shows how far agents can go in this repo. It shows how we make sure that their work is correct. It names the owners of the agent rules.

## 1. Autonomy matrix

The levels are:

- L0: no agent.
- L1: the agent suggests. A human writes.
- L2: the agent writes. A human reviews every line.
- L3: the agent writes and operates the checks. A human reviews the PR.
- L4: if the gates are green, the agent merges. A human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | L3 | New tests fail without the change and pass with it. `npm test` is green. | Any team member |
| Business rules (`lib/tasks.ts`) | L3 | A unit test for each rule and each boundary. `npm test` and `npm run typecheck` are green. | Any team member |
| API route (`app/api/**`) | L3 | A test or a manual call for each status code (201, 400, 422). `npm test` is green. | Any team member |
| New DB migration (`db/migrations/`) | L2 | It runs on a fresh DB (`npm test` opens an in-memory database and applies every migration). The PR has a rollback note. | Tech lead |
| Edit of an applied migration | L0 | The `PreToolUse` hook blocks it with exit code 2. Write a new migration instead. | None |
| Agent rules (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L1 | The agent drafts and a human edits. An A/B note shows the change in behavior. | Rule owner |

A change type moves up one level after its check meets three conditions. The check is cheap. The check does not depend on the agent. The check runs every time.

The repo has no CI, and `git push` is on the `ask` list. So no change type can reach L4 today. Tests only move to L4 after a CI gate exists.

## 2. Who owns agent output

The person who opens the PR owns the change. This rule holds for code that an agent wrote. "The agent did it" is not a reason in a review.

## 3. Owners of the agent rules

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @TyshchenkoOleksandr (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone proposes a change in a PR. The PR says which problem the change fixes.
2. A change in behavior needs evidence. This is an A/B note or the output of the hook.
3. The owner approves the PR through CODEOWNERS.
4. A rule that is past its `review-by` date gets a new date or the next PR that touches it removes the rule.

## 5. Personal and team settings

Personal preferences go to `~/.claude/CLAUDE.md` and `.claude/settings.local.json` (git-ignored). The repo has no `CLAUDE.md` and no `CLAUDE.local.md`.
