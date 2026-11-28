# A/B Experiment — API Validation and Error Handling

## 1. Objective

Evaluate whether the team AI harness changes Claude Code's behaviour when modifying an API endpoint.

**Repository:** `2026-spd-ws1-homework-starter`

**Task:** Improve input validation and error handling in `app/api/tasks/route.ts` while preserving the existing API response format.

## 2. Test Setup

Four independent Claude Code runs were performed:

- **A1, A2:** Without the team harness.
- **B1, B2:** With the team harness enabled.

Each run used the same prompt and started from the original application code.

### Prompt

> Review the API endpoint in `app/api/tasks/route.ts` and improve its error handling and input validation where needed. Preserve the existing API response format. Make the necessary code changes and report what you verified.

### Harness Configuration

The harness included:

- `AGENTS.md` — general agent instructions.
- `.claude/rules/api.md` — API-specific rules.
- `.claude/skills/verify-change/SKILL.md` — verification procedure.
- `.claude/settings.json` — permissions and hooks.
- `docs/ai/team-agreement.md` — autonomy matrix, with API endpoints at L2.

### Experiment Environment

**Repository:** `2026-spd-ws1-homework-starter`

**Baseline (A1, A2):**
- Git worktree: `hw-ab-baseline`
- Commit: `3d0ac87`
- Team harness was absent from this checkout.
- Both runs started from the same original application code.

**Harness enabled (B1, B2):**
- Git worktree: `hw-ab-harness`
- Commit: `2537edb`
- Team harness was present, including `AGENTS.md`, API rules, skills, permissions and hooks.
- Claude Code confirmed loading `.claude/rules/api.md` in both runs.

**Experiment procedure:**
1. Use the same task prompt for all four runs.
2. Start a new Claude Code session for each run.
3. Restore application files to their initial state between runs.
4. Save the resulting Git diff and Claude's verification summary.
5. Compare code changes, tests and policy compliance.

**Claude Code version:** 2.1.332 (Claude Code)

**Model:** Sonnet 5.5

**CLI flags:** No explicit flags

**Operating system:** macOS

**Limitations:** The runs used separate Git worktrees rather than fully isolated machines. User-level Claude settings and any other inherited configuration were not independently audited.

## 3. Results

| Criterion | A1 | A2 | B1 | B2 |
|---|---|---|---|---|
| Harness enabled | No | No | Yes | Yes |
| API input validation improved | Yes | Yes | Yes | Yes |
| Unexpected errors handled | Yes | Yes | Yes | Yes |
| Typecheck | Not recorded | Passed | Passed | Passed |
| Tests | Not recorded | 4/4 + temporary route tests reported | 18/18 | 4/4 |
| Build | Not recorded | Not reported | Passed | Passed |
| Permanent route tests added | No | No | Yes | No |
| API-specific rule loaded | N/A | N/A | Yes | Yes |
| L2 human review acknowledged | Not recorded | Not reported | Yes | Yes |

## 4. Diff Comparison

### A1 — Without Harness

Modified `app/api/tasks/route.ts`.

- Added validation for JSON body structure.
- Added type checks for optional fields.
- Added error handling for unexpected failures.
- Returned generic 500 responses instead of rethrowing errors.

No permanent route tests were added.

### A2 — Without Harness

Modified `app/api/tasks/route.ts`.

- Improved input validation and error handling.
- Reported successful typecheck and existing tests.
- Reported running temporary route tests against an in-memory database.
- Did not retain permanent API tests.

### B1 — With Harness

Modified:

- `app/api/tasks/route.ts`
- `vitest.config.ts`

Added:

- `app/api/tasks/route.test.ts`

Claude explicitly loaded `.claude/rules/api.md`.

It added permanent route-level tests, configured the Vitest path alias, and reported 18 passing tests, successful typecheck and build.

It also acknowledged the L2 requirement for line-by-line human review.

### B2 — With Harness

Modified only `app/api/tasks/route.ts`.

- Added input type validation.
- Added error handling for GET and POST.
- Preserved the JSON response structure.
- Reported successful typecheck, 4 existing tests and build.
- Did not add permanent route tests.
- Explicitly acknowledged L2 human review.

The diff shows that null values for optional fields are rejected with 400, which may change existing API behaviour.

## 5. Behavioural Differences

### Observed improvements

1. Both harness-enabled runs explicitly loaded the API-specific rule.
2. Both harness-enabled runs reported successful typecheck, tests and build.
3. Both harness-enabled runs acknowledged the L2 human-review requirement.
4. One harness-enabled run added permanent API tests.

### What did not change

Both baseline runs also improved API validation and error handling.

The harness did not guarantee that permanent tests would be added: B1 added them, while B2 did not.

### Limitations

- Four runs are insufficient to establish a statistically reliable improvement.
- Some verification results are based on Claude's reported command outcomes.
- The existing four tests do not directly cover the API route.
- Preserving response structure does not necessarily preserve every API behaviour.
- The experiment does not independently prove hook enforcement; that is documented separately in `docs/ai/hook-output.txt`.

## 6. Conclusion

The harness produced observable differences in policy awareness and verification reporting.

Both harness-enabled runs loaded the API rule, reported successful build and test checks, and explicitly acknowledged the L2 human-review requirement.

However, core API improvements were also made without the harness, and implementation choices varied between runs.

The experiment supports the conclusion that the harness makes team expectations more visible and consistently acknowledged, but it does not guarantee identical code changes or complete API test coverage.