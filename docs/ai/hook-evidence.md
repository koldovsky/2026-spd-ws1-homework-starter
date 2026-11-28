<!-- owner: @edvardino · why: proof that the protect-migrations hook blocks violations (HW 1.1, item 6) · review-by: 2027-03-01 -->

# Hook evidence — `protect-migrations`

Hook: `.claude/hooks/protect-migrations.mjs`, wired in `.claude/settings.json` as `PreToolUse` for `Edit|Write|MultiEdit`.
Run with sample payloads as in [hook-test.md](hook-test.md) (2026-11-26, macOS, zsh).

| Payload | stderr | Exit |
|---|---|---|
| `Edit db/migrations/001_create_tasks.sql` | `BLOCKED: db/migrations/001_create_tasks.sql is an applied migration and is immutable. Add a new db/migrations/NNN_<name>.sql instead (see the add-migration skill).` | **2** |
| `Write <abs path>/db/migrations/002_add_task_estimate.sql` | same message for `002_add_task_estimate.sql` | **2** |
| `Write db/migrations/003_add_task_priority.sql` (new file) | — | 0 |
| `Edit lib/tasks.ts` | — | 0 |

Log written by the hook (`.claude/hooks/hook.log`, git-ignored):

```
2026-11-26T20:19:35.754Z Edit db/migrations/001_create_tasks.sql BLOCKED
2026-11-26T20:19:35.975Z Write /Users/e.nazarenko/github_personal/2026-spd-ws1-homework-starter/db/migrations/002_add_task_estimate.sql BLOCKED
2026-11-26T20:19:36.190Z Write db/migrations/003_add_task_priority.sql allowed
2026-11-26T20:19:36.406Z Edit lib/tasks.ts allowed
```

Reproduce: `echo '{"tool_name":"Edit","tool_input":{"file_path":"db/migrations/001_create_tasks.sql"}}' | node .claude/hooks/protect-migrations.mjs; echo $?`
