---
name: verify-change
description: Verify a Team Tasks change before handoff or a pull request, and record reproducible evidence.
disable-model-invocation: true
---
<!-- owner: @vvedula-svg · why: prevent unverified completion claims and stale evidence · review-by: 2027-03-25 -->
# Verify a change

1. Read the ticket and spec. Map each acceptance criterion to a named test. Record any unapproved or untested requirement.
2. Inspect `git status --short` and `git diff --stat`. Check that no existing migration or unrelated behaviour changed.
3. For a bug fix, run the regression test against the old implementation and save the failure before applying the fix.
4. Run `npm test`, `npm run typecheck`, and `node --test scripts/migration-guard.test.mjs`. Run `npm run build` for application/configuration changes.
5. A failed check blocks a completion claim. Diagnose the failure, fix only the relevant change, and rerun affected checks plus the suite.
6. Record `git rev-parse HEAD`, exact commands, raw outputs and exit codes in `docs/evidence/<KEY>/<slice>.md`. If code is uncommitted, say so; do not attach results to an older SHA.
7. For HW 1.2, commit code first, check that revision, then commit only evidence with an `Evidence:` trailer. Run the supplied trace gate against the PR base.
8. Fill `docs/ai/handoff-template.md`. Distinguish local checks, GitHub CI and human review; list anything still pending.

Completion check: every criterion has evidence or an explicit gap, all required checks passed, and the evidence revision still matches the code.
