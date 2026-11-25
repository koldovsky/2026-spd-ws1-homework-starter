# Hook evidence — `protect-migrations`

<!-- owner: @SayidJarrah · why: proof that the PreToolUse hook blocks edits to applied migrations (HW 1.1, item 6) · review-by: 2027-05-25 -->

Hook: `.claude/hooks/protect-migrations.mjs`, wired in `.claude/settings.json` as `PreToolUse` on
`Edit|Write|MultiEdit|NotebookEdit|Bash`. "Applied" = the migration file is tracked by git.

## 1. Live session (Claude Code 2.1.332, macOS, 2026-11-25)

Prompt: *"In db/migrations/001_create_tasks.sql change the title check from 120 to 200 characters. Use the Edit tool
directly on that file. If you are blocked, quote the exact block message you got and stop."*

Tool calls from the transcript (`claude -p … --output-format stream-json`):

```text
CALL Read  db/migrations/001_create_tasks.sql
CALL Edit  db/migrations/001_create_tasks.sql
RESULT: PreToolUse:Edit hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-migrations.mjs"]: BLOCKED by
.claude/hooks/protect-migrations.mjs: db/migrations/001_create_tasks.sql is an applied migration (tracked in git).
lib/db.ts runs each migration once, so editing it never reaches existing databases. Create a new file
db/migrations/NNN_<what>.sql with the next number instead (see .claude/rules/migrations.md).
```

Agent's final answer: *"The edit was blocked, so I've stopped there. … `001_create_tasks.sql` is unchanged and still
has the 120-character limit."* `git diff --stat db/migrations` after the run: empty.

Hook log (`.claude/hooks/protect-migrations.log`, git-ignored):

```text
2026-11-25T16:46:44.523Z BLOCK tool=Edit target=db/migrations/001_create_tasks.sql via=file tool
```

## 2. Manual runs (as in `docs/ai/hook-test.md`)

`echo '<payload>' | node .claude/hooks/protect-migrations.mjs; echo $?`

| # | Payload | Exit | Result |
|---|---|---|---|
| 1 | `Edit` `db/migrations/001_create_tasks.sql` | 2 | blocked |
| 2 | `Edit` absolute path to `002_add_task_estimate.sql` | 2 | blocked |
| 3 | `Write` new `db/migrations/003_add_task_priority.sql` (untracked) | 0 | allowed |
| 4 | `Edit` `lib/tasks.ts` | 0 | allowed |
| 5 | `Bash` `sed -i "" s/40/80/ db/migrations/002_add_task_estimate.sql` | 2 | blocked |
| 6 | `Bash` `cat db/migrations/001_create_tasks.sql` | 0 | allowed |

## 3. Permissions `deny` (same session setup)

Prompt: *"Read the file .env …"* → `Read .env` →
`File is in a directory that is denied by your permission settings.` The agent stopped.

## Known limits

- The Bash check is a pattern match on write-like commands (`sed -i`, `>`, `tee`, `mv`, `cp`, `rm`, …) that name an
  applied migration. It can be bypassed by an obfuscated command and may block a harmless `cp` from a migration.
  The hook is a guard rail for honest mistakes; code review stays the control.
