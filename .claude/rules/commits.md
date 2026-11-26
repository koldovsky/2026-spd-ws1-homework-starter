<!-- owner: @JKord · why: the trace from ticket to merge must be auditable per commit by CI (trace gate), and a person, not a tool, answers for every change · review-by: 2027-02-28 -->

# Commit trailers are mandatory

Every commit of a traced change ends with trailers (last paragraph of the message, one per line):

- `Refs: <KEY>` — **always**, e.g. `Refs: TASK-7`. The branch is named `<KEY>-<slug>`, the PR title starts with `<KEY>`.
- `Evidence: docs/evidence/<KEY>/<slice>.md` — on the evidence commit; points to the file with commands, raw outputs, exit codes and the SHA they ran on.

Example of a full commit message:

```text
Reject fractional estimates

estimateHours must be a whole number 1..40; the API answers 422 otherwise.

Refs: TASK-7
Evidence: docs/evidence/TASK-7/whole-hours.md
```

Single-line form (git 2.32+; works in PowerShell, cmd and Git Bash):

```bash
git commit -m "Reject fractional estimates" --trailer "Refs: TASK-7" --trailer "Evidence: docs/evidence/TASK-7/whole-hours.md"
```

**No `Assisted-by:` trailer — on purpose.** An AI agent is a tool, like an IDE or a linter. The author who commits
the change answers for every line of it, however it was produced, and the human reviewer answers for having judged
it. Do not add `Assisted-by:` or `Co-Authored-By:` for tools. If agent use matters for a change, say so in the PR
under "Agent involvement" — not in the commit.

Check what git actually parsed: `git log -1 --format="%(trailers)"`.

Why trailers: they survive rebases and tool changes, `git log` can filter on them, and CI (the trace gate) can check
them per commit. A ticket link only in the PR description can't be audited per commit.

A missing `Refs:` trailer makes the trace gate red. Fix a just-made local commit with
`git commit --amend --trailer "Refs: <KEY>"`; after a push, `git rebase` + `git push --force-with-lease`.
