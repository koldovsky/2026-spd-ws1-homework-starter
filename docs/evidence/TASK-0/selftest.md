# Evidence — TASK-0 CI self-test

- Revision: `b3776be4e7155234e894c36429e639bfc4b4d72e` (the commands below ran on this commit)
- Branch: `TASK-0-ci-selftest`
- Ran: 2026-11-23T17:34Z · Node v24.18.0 · git version 2.55.0.windows.2 · MINGW64
- Who ran it: Claude Code (claude-opus-5-5), driven by the workshop author

Self-test of the HW 1.2 CI files. The trace-gate run is expected to fail only because this file does not exist yet at the revision it ran on.

## `npm test`

```text

> ws1-homework-starter@0.1.0 test
> vitest run


 RUN  v5.1.0 C:/Users/koldo/AppData/Local/Temp/claude/508c1a20ff75c6b3/882a636d-912d-4c10-879a-237395042dc5/scratchpad/ws1/starter


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  19:34:06
   Duration  147ms (import 33%, transform 29%, tests 26%, worker 12%)
```

Exit code: 0

## `node docs/ai/ci/trace-gate.mjs --base origin/ci-selftest-base --head HEAD --title "TASK-0 CI self-test" --key-pattern "TASK-[0-9]+"`

```text
key TASK-0 (from the PR title)
1 commit(s), 1 with Assisted-by
::error::evidence file docs/evidence/TASK-0/selftest.md (from b3776be) does not exist at head
trace gate: FAIL (1 error(s))
```

Exit code: 1

