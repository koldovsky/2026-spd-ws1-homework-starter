# Handoff — <TASK-N> — <YYYY-MM-DD>

<!-- owner: @SayidJarrah · why: agent sessions end mid-task (context, end of day, another person picks up); a fresh session must continue from the repo alone, without asking · review-by: 2027-05-25 -->
<!-- Save as docs/ai/handoffs/<TASK-N>-<YYYY-MM-DD>.md at the end of a session. Facts only, no narrative. Delete
     sections that don't apply rather than writing "n/a". -->

**Goal:** <one sentence: what "done" means, from the ticket's acceptance criteria>

**Where the code is**
- Branch: `<branch>` · last commit: `<short sha>` <message> · pushed: <yes/no>
- Uncommitted changes: <none | `git status --short` output>

**State**
- Done: <step — file(s) — commit or PR link>
- In progress: <what is half-done, in which file, what is missing>
- Not started: <remaining steps, in order>

**Next step:** <the single next action, concrete enough to start immediately: file + what to change, or a command>

**Checks at handoff** (paste, don't summarise)

```text
$ npm test            → exit <0|1>, <N passed / M failed>
$ npm run typecheck   → exit <0|1>
```

- Failing on purpose? <test name — why, e.g. red test written before the fix>

**Decisions made:** <decision — reason — where it is recorded (spec, PR comment)>

**Harness notes:** <hook blocks, permission prompts or rules that shaped the work, e.g. "migration hook blocked an
edit to 002, added 003 instead"; skill used, e.g. `/add-task-field`>

**Open questions / blockers:** <question — who can answer — what is blocked until then>

**Do not:** <traps for the next session, e.g. "don't run db:reset, local data is needed for the demo">

**Links:** ticket `docs/tickets/<TASK-N>.md` · spec `docs/specs/<TASK-N>.md` · PR <url> · related handoffs
