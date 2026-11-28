# Handoff — <ticket or short title> — <YYYY-MM-DD>

<!-- owner: @evgenyadev · why: a session that ends mid-task loses its context; the next session must continue from the repo alone · review-by: 2027-02-20 -->
<!-- Write it when you stop mid-task. Save as docs/ai/handoffs/<YYYY-MM-DD>-<slug>.md. Facts, not narrative.
     A fresh session is told only: "Continue from docs/ai/handoffs/<file>". If it has to ask you something, the handoff missed it. -->

**Goal:** <one sentence: what "done" means, observable>

**Where:** branch `<branch>` · last commit `<sha>` · <uncommitted changes: none / which files>

**State**
- Done: <what is finished, with commit or PR links>
- In progress: <what is half-done and where exactly it stops>
- Not started: <remaining steps, in order>

**Checks right now:** `npm test` <green/red: which test> · `npm run typecheck` <green/red>

**Next step:** <the single next action, concrete enough to start without reading anything else>

**Read first:** <files and lines that matter, e.g. `lib/tasks.ts:18`>

**Decisions made:** <decision — reason; link to the PR comment or doc>

**Do not:** <traps found, approaches already rejected and why>

**Open questions / blockers:** <question — who can answer>

**How to verify done:** <commands to run, what green looks like, any manual check>

**Links:** <ticket, PRs, CI runs, docs>
