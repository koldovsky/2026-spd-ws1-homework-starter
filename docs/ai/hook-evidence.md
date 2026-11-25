# Hook evidence — `protect-migrations`

<!-- owner: @vajs · why: proof that the hook blocks edits to a committed migration, as HOMEWORK.md item 6 requires · review-by: 2027-02-24 -->

Hook: `.claude/hooks/protect-migrations.mjs`, registered in `.claude/settings.json` twice:
`PreToolUse` for `Edit|Write|MultiEdit|NotebookEdit|Bash`, and `PostToolUse` for `Bash`.
Run on 2026-11-25 with the payload method from `docs/ai/hook-test.md` (piped JSON, not a live agent session), in a scratch copy of the repo so `block.log` and the edited tracked file did not touch the real checkout. The payload line is shown with `$`; the repo path is shortened to `<repo>`.
Blocked calls are also appended to `.claude/hooks/block.log` (git-ignored); its lines are at the end.

What the hook decides:

- **Applied = committed in HEAD** (`git ls-tree HEAD`). A new, uncommitted `003` can still be edited. If git cannot answer, any existing file counts as applied.
- **Bash, layer 1 (PreToolUse):** a command that names `db/migrations` and writes (`sed -i`, `tee`, `mv`, `cp`, `rm`, `>` …) is refused.
- **Bash, layer 2 (PostToolUse):** after any Bash command, `git diff --name-status HEAD -- db/migrations` must show no M/D/R/T row. This does not depend on how the command was written.
- **Fails closed:** an unreadable payload exits 2 (exit 1 would let the call through).

## File tools

```text
$ {"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"db/migrations/001_create_tasks.sql"}}
BLOCKED: db/migrations/001_create_tasks.sql is a committed migration and is frozen. Add a new numbered file in db/migrations/ instead (see .claude/rules/migrations.md).
exit code: 2

$ {"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"<repo>/db/migrations/002_add_task_estimate.sql"}}
BLOCKED: db/migrations/002_add_task_estimate.sql is a committed migration and is frozen. Add a new numbered file in db/migrations/ instead (see .claude/rules/migrations.md).
exit code: 2

$ {"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"lib/../db/migrations/002_add_task_estimate.sql"}}
BLOCKED: db/migrations/002_add_task_estimate.sql is a committed migration and is frozen. ...
exit code: 2

$ {"hook_event_name":"PreToolUse","tool_name":"MultiEdit","tool_input":{"file_path":"db/migrations/001_create_tasks.sql","edits":[]}}
BLOCKED: db/migrations/001_create_tasks.sql is a committed migration and is frozen. ...
exit code: 2

$ {"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"db/migrations/003_add_task_due_date.sql"}}
exit code: 0            (new file, does not exist yet)

$ {"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"db/migrations/003_add_task_due_date.sql"}}
exit code: 0            (003 exists but is untracked: the agent can fix its own draft)

$ {"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"db/migrations/003_add_task_due_date.sql"}}
BLOCKED: db/migrations/003_add_task_due_date.sql is a committed migration and is frozen. ...
exit code: 2            (same file after `git commit`)

$ {"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"lib/tasks.ts"}}
exit code: 0
```

## Bash, PreToolUse (layer 1)

```text
$ {"tool_name":"Bash","tool_input":{"command":"sed -i 's/1/2/' db/migrations/002_add_task_estimate.sql"}}
BLOCKED: this command writes under db/migrations/, where applied migrations are frozen. Create a new numbered file with the Write tool instead (see .claude/rules/migrations.md).
exit code: 2

$ {"tool_name":"Bash","tool_input":{"command":"cd db/migrations && sed -i 's/1/2/' 001_create_tasks.sql"}}
BLOCKED: (same message)
exit code: 2

$ {"tool_name":"Bash","tool_input":{"command":"echo x>db/migrations/001_create_tasks.sql"}}
BLOCKED: (same message)
exit code: 2

$ {"tool_name":"Bash","tool_input":{"command":"echo x | tee db/migrations/001_create_tasks.sql"}}
BLOCKED: (same message)
exit code: 2

$ {"tool_name":"Bash","tool_input":{"command":"cat db/migrations/001_create_tasks.sql 2>&1"}}
exit code: 0

$ {"tool_name":"Bash","tool_input":{"command":"ls db/migrations"}}
exit code: 0

$ {"tool_name":"Bash","tool_input":{"command":"npm test"}}
exit code: 0
```

## Bash, PostToolUse (layer 2): a command layer 1 misses

`cd db && sed -i … migrations/001_create_tasks.sql` never contains the string `db/migrations`, so layer 1 lets it through. Layer 2 catches the result:

```text
$ {"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"x"}}
exit code: 0            (clean tree)

$ {"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"cd db && sed -i 's/1/2/' migrations/001_create_tasks.sql"}}
exit code: 0            (layer 1 does not see it; I then ran the command)

$ {"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"x"}}
BLOCKED: that command changed applied migrations (M	db/migrations/001_create_tasks.sql). Restore them with git checkout HEAD -- db/migrations and add a new numbered file instead (see .claude/rules/migrations.md).
exit code: 2

$ git checkout HEAD -- db/migrations   (then the same PostToolUse payload)
exit code: 0
```

## Malformed payload: fails closed

```text
$ printf '' | node .claude/hooks/protect-migrations.mjs
BLOCKED: protect-migrations hook could not read its input, so it refuses the call (fail closed).
exit code: 2
```

`not json` and `null` give the same message and exit code 2.

## `.claude/hooks/block.log` after the run

```text
2026-11-25T20:00:58.808Z Edit db/migrations/001_create_tasks.sql
2026-11-25T20:00:58.853Z Write db/migrations/002_add_task_estimate.sql
2026-11-25T20:00:58.892Z Edit db/migrations/002_add_task_estimate.sql
2026-11-25T20:00:58.928Z MultiEdit db/migrations/001_create_tasks.sql
2026-11-25T20:00:59.044Z Edit db/migrations/003_add_task_due_date.sql
2026-11-25T20:00:59.132Z Bash sed -i 's/1/2/' db/migrations/002_add_task_estimate.sql
2026-11-25T20:00:59.188Z Bash cd db/migrations && sed -i 's/1/2/' 001_create_tasks.sql
2026-11-25T20:00:59.244Z Bash echo x>db/migrations/001_create_tasks.sql
2026-11-25T20:00:59.301Z Bash echo x | tee db/migrations/001_create_tasks.sql
2026-11-25T20:00:59.575Z Bash(post) M	db/migrations/001_create_tasks.sql
2026-11-25T20:00:59.637Z unreadable payload: Unexpected end of JSON input
2026-11-25T20:00:59.670Z unreadable payload: Unexpected token 'o', "not json" is not valid JSON
2026-11-25T20:00:59.698Z unreadable payload: payload is not an object
```

## Limits

- **Layer 2 runs after the command.** It cannot undo the change; it reports it and tells the agent to restore the file. The block is the report, not prevention.
- **Layer 2 sees only tracked files.** A command that changes a migration and commits it, or runs `git checkout`/`git stash` in the same command, leaves no diff to find.
- **Layer 1 has false positives.** A harmless command that names `db/migrations` and contains `>` (for example `cp x.sql db/migrations/003_x.sql`) is refused; use the Write tool instead.
- **Live session:** the earlier live run (B2 in `docs/ai/ab-note.md`) covered only the `Edit` path. The Bash layers here are shown by payload, except that layer 1 also refused several of my own commands while I was testing in this session.
