# Hook evidence — `protect-migrations`

<!-- owner: @vajs · why: proof that the PreToolUse hook blocks an edit to an applied migration, as HOMEWORK.md item 6 requires · review-by: 2027-02-24 -->

Hook: `.claude/hooks/protect-migrations.mjs`, registered in `.claude/settings.json` for `Edit|Write|MultiEdit|NotebookEdit`.
Run on 2026-11-24 with the payload method from `docs/ai/hook-test.md` (a piped JSON payload, not a live agent session).
Blocked calls are also appended to `.claude/hooks/block.log` (git-ignored, so the output is copied here).

```text
$ {"tool_name":"Edit","tool_input":{"file_path":"db/migrations/001_create_tasks.sql"}}
BLOCKED: db/migrations/001_create_tasks.sql is an applied migration and is frozen. Add a new numbered file in db/migrations/ instead (see .claude/rules/migrations.md).
exit code: 2

$ {"tool_name":"Write","tool_input":{"file_path":"/home/vajs/repositories/2026-spd-ws1-homework-starter/db/migrations/002_add_task_estimate.sql"}}
BLOCKED: db/migrations/002_add_task_estimate.sql is an applied migration and is frozen. Add a new numbered file in db/migrations/ instead (see .claude/rules/migrations.md).
exit code: 2

$ {"tool_name":"Write","tool_input":{"file_path":"db/migrations/003_add_task_due_date.sql"}}
exit code: 0

$ {"tool_name":"Edit","tool_input":{"file_path":"lib/tasks.ts"}}
exit code: 0

```

`.claude/hooks/block.log` after the run:

```text
2026-11-24T22:06:54.470Z Edit db/migrations/001_create_tasks.sql
2026-11-24T22:06:54.503Z Write db/migrations/002_add_task_estimate.sql
```

Reading: existing `001`/`002` are blocked (exit 2, reason on stderr, relative and absolute paths); a new `003` file and unrelated `lib/tasks.ts` pass (exit 0).
Limit: the hook sees file-edit tools only; a `Bash` command such as `sed -i` on a migration is not caught.
