<!-- owner: @vovchik-manko · why: the autonomy matrix claims a unit-test change is verified by a new test that fails before and passes after; this shows it · review-by: 2027-03-31 -->

# Evidence — HW 1.1 unit-test check

- Revision: `62ac6f869d6b75531aa161d18f34b16e36f07380` (HEAD of `main`, the commands ran on a detached worktree of this commit)
- Ran: 2026-11-26 00:36 EET, Darwin 25.4.0, Node v22.18.0, Vitest 5.1.0
- Who ran it: the agent, driven by the repo owner (@vovchik-manko)

## What was done

1. A throwaway worktree `/tmp/t-evidence` at the revision above, with `node_modules` linked from the main repo.
2. One test appended to `lib/tasks.test.ts` in that worktree only: an estimate of `1.5` must throw `RuleViolation`.
3. Run before the fix: the test fails, because `createTask` accepts `1.5` (the TASK-7 bug).
4. The one-line fix below was applied to `lib/tasks.ts` in the same worktree and the suite was rerun.
5. Neither the test nor the fix is committed to the repo. The main repo is unchanged by this check.

Fix (applied in the worktree only, `git diff lib/tasks.ts`):

```diff
-  if (input.estimateHours !== undefined && (input.estimateHours < 1 || input.estimateHours > 40)) {
+  if (input.estimateHours !== undefined && (!Number.isInteger(input.estimateHours) || input.estimateHours < 1 || input.estimateHours > 40)) {
```

Test added (worktree only):

```ts
describe("estimate acceptance", () => {
  it("rejects a non-integer estimate such as 1.5", () => {
    const db = openDb(":memory:");
    expect(() => createTask(db, { title: "Fractional", estimateHours: 1.5 })).toThrow(RuleViolation);
  });
});
```

## Raw output

```text
## BEFORE the change (HEAD 62ac6f8 + new test only)
$ npx vitest run

 RUN  v5.1.0 /private/tmp/t-evidence

(node:37638) ExperimentalWarning: SQLite is an experimental feature and might change at any time
 ❯ lib/tasks.test.ts (5 tests | 1 failed) 9ms
   ❯ estimate acceptance (1)
     × rejects a non-integer estimate such as 1.5 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  lib/tasks.test.ts > estimate acceptance > rejects a non-integer estimate such as 1.5
AssertionError: expected function to throw an error, but it didn't
 ❯ lib/tasks.test.ts:38:79
     36|   it("rejects a non-integer estimate such as 1.5", () => {
     37|     const db = openDb(":memory:");
     38|     expect(() => createTask(db, { title: "Fractional", estimateHours: …
       |                                                                               ^
     39|   });
     40| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
   Start at  00:36:06
   Duration  277ms (tests 35%, import 33%, transform 21%, worker 10%)

Exit code: 1

$ npm run typecheck

> ws1-homework-starter@0.1.0 typecheck
> tsc --noEmit

Exit code: 0

## AFTER the change (one-line integer check in lib/tasks.ts)
$ npx vitest run

 RUN  v5.1.0 /private/tmp/t-evidence

(node:37687) ExperimentalWarning: SQLite is an experimental feature and might change at any time

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  00:36:09
   Duration  268ms (import 35%, tests 31%, transform 24%, worker 10%)

Exit code: 0

$ npm run typecheck

> ws1-homework-starter@0.1.0 typecheck
> tsc --noEmit

Exit code: 0
```

## Not verified

- The production build (`npm run build`) was not run.
- The `TASK-7` fix is not committed. It belongs to HW 1.2 Phase 2, which is paused.
- The 1.5 case is the only new acceptance test; the string `"3"` and the `"abc"` case from TASK-7 are not covered here.
