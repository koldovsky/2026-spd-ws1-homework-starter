# Evidence — TASK-7 whole-hour estimates

- Revision: `ae827be4600819fef2b44e026bf4ba6338e8ecf3` (`git rev-parse HEAD` → `ae827be` "Drop Assisted-by from the trailer convention", the last non-evidence commit of the PR; the code change is `aaee7d4` "Reject non-whole estimates with 422")
- Ran: 2026-11-26, 13:40 (UTC+2), Windows 11 Pro (10.0.26300), Node v25.2.1
- Who ran it: @JKord (local run via Claude Code)

## `npm test`

```text
> ws1-homework-starter@0.1.0 test
> vitest run


 RUN  v5.1.0 C:/Users/y.kordiuk/Projects/test/2026-spd-ws1-homework-starter

(node:110872) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
warning: in the working copy of 'db/migrations/001_a.sql', LF will be replaced by CRLF the next time Git touches it

 Test Files  2 passed (2)
      Tests  21 passed (21)
   Start at  13:40:16
   Duration  1.32s (tests 97%, import 1%, transform 1%, worker 1%)
```

Exit code: 0

## `npm test` without LLM proxy variables

`env -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN -u LITELLM_PROXY_URL npm test` (Git Bash):

```text
 Test Files  2 passed (2)
      Tests  21 passed (21)
```

Exit code: 0 — the checks don't depend on the LLM proxy.

## `npm run typecheck`

```text
> ws1-homework-starter@0.1.0 typecheck
> tsc --noEmit
```

Exit code: 0

## `node docs/ai/ci/trace-gate.mjs --base main --head HEAD --title "TASK-7 Whole-hour estimates" --key-pattern "TASK-[0-9]+"`

Run on `ae827be` **before** this evidence update; the expected red state: the previous evidence named `aaee7d4`,
and non-evidence files changed after it.

```text
key TASK-7 (from the PR title)
5 commit(s), 0 with Assisted-by
::error::docs/evidence/TASK-7/whole-hours.md names aaee7d4, but code changed after it: .claude/rules/commits.md, .github/pull_request_template.md, AGENTS.md
::error::docs/evidence/TASK-7/whole-hours.md names aaee7d4, but code changed after it: .claude/rules/commits.md, .github/pull_request_template.md, AGENTS.md
trace gate: FAIL (2 error(s))
```

Exit code: 1 (expected; the gate result after this evidence commit is the green CI run linked in the PR)

`0 with Assisted-by` is intended: by the team rule `.claude/rules/commits.md`, commits carry no `Assisted-by`
trailer — the author is accountable.

## Environment

- All checks above are pure local runs (`vitest` + in-memory SQLite, `tsc`, node script) — no LLM, no network.
- `--base main` is the local `main`, which equals the fork's `main` once the HW 1.1 merge is pushed.

## Not verified

- AC2 over real HTTP (`POST /api/tasks` → 422/201 via `curl`): verified indirectly — the route's
  `RuleViolation` → 422 mapping (`app/api/tasks/route.ts`) is unchanged by this PR, and AC2's domain part is
  covered by the unit tests. A live dev-server check was not run.
- CI runs (trace gate on GitHub Actions): not run yet at the time of writing; the red and green run links are
  collected in the PR description.
