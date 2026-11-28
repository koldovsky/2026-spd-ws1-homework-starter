# Handoff — <ticket or short task name> — <YYYY-MM-DD>

<!-- owner: @Kurkov1990 · why: fresh sessions re-asked the same questions and redid finished steps · review-by: 2027-03-23 -->
<!-- Fill this in at the end of a session. A fresh session must be able to continue from this file and the repo alone.
     Paste it into the PR description, or save it as docs/ai/handoffs/<YYYY-MM-DD>-<task>.md. -->

**Goal:** <one observable sentence, e.g. "PATCH /api/tasks/:id accepts `blocked`; tests green">

**Branch / base:** `<branch>` from `<base sha>` · last commit `<sha>` · uncommitted changes: <none / which files>

## State
- Done: <step — commit or PR link>
- In progress: <file and function, what is half-written, what currently fails>
- Not started: <remaining steps, in order>

## Checks right now
| Command | Result |
|---|---|
| `npm test` | <green / N failing — test names> |
| `npm run typecheck` | <clean / errors in …> |
| `git status --short db/migrations/` | <empty, or only new `??` files> |

## Next step
<the single next action, concrete enough to start without reading anything else: file, function, command>

## Decisions made
- <decision> — <reason> — <link to comment or ADR>

## Open questions / blockers
- <question> — <who can answer> — <blocking: yes / no>

## Traps found this session
- <e.g. "002 is applied: write 003, don't edit 002" or "the hook blocks `sed -i` on migrations">

## Links
- Ticket: <url> · PR: <url> · Skill / rule used: <`change-task-rule`, `.claude/rules/business-rules.md`>
