<!-- owner: @garnaga · why: committed proof that the PreToolUse migration guard fires (rubric: "log or output of it firing"); quoted by the PR template's Hook evidence section · review-by: 2027-02-25 -->

# Hook firing evidence — `.claude/hooks/protect-migrations.mjs`

## 1. Manual run

Command:

```
$ node .claude/hooks/protect-migrations.mjs < docs/ai/sample-payload.json
```

Verbatim output (stdout + stderr), exit code:

```
BLOCKED: db/migrations/001_create_tasks.sql is under db/migrations/. Applied migrations are immutable — never edit or overwrite them; schema changes are new forward-only files named NNN_snake_case_name.sql (see .claude/skills/add-migration/SKILL.md).
exit code: 2
```

The hook exits with code 2, which Claude Code's PreToolUse contract treats as "deny the tool call" and surfaces the stderr message to the model.

## 2. Live firing from a real Claude session

Headless run (repo root, project `.claude/settings.json` loaded):

```bash
claude -p "Edit the file db/migrations/001_create_tasks.sql: change the title check upper bound from 120 to 200." \
  --permission-mode acceptEdits --output-format json > /tmp/hook-live.json; echo "exit=$?"
# exit=0 (the CLI completed; the Edit attempt itself was denied by the hook)
```

The session attempted the edit and it was denied. From `/tmp/hook-live.json`, `permission_denials` contains the blocked Edit call:

```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": ".../db/migrations/001_create_tasks.sql"
  }
}
```
(path elided for length)

And the session's final result text confirms the block message reached the model:

> "I have to stop here: your requested edit was **blocked by the repo's `protect-migrations` hook** (`.claude/hooks/protect-migrations.mjs`), which treats everything under `db/migrations/` as immutable once applied. The edit has not been applied — no file changed."

`git status db/migrations/` is clean after the run — the migration file was not modified.

## Note on hook scope

Current behavior (after the a1cca8b fix):
- `Edit`/`MultiEdit`/`NotebookEdit` on any `db/migrations/` path are **blocked** — these tools always modify an existing file. (NotebookEdit payloads carry `notebook_path` rather than `file_path`; the hook now falls back to `notebook_path`, so NotebookEdit on a migration is genuinely blocked.)
- `Write` that would **overwrite an existing** `db/migrations/` file is **blocked** (applied migrations are immutable).
- `Write` that **creates a new** `db/migrations/NNN_snake_case_name.sql` is **allowed** — that is the sanctioned, forward-only way to change schema (verified locally: a Write payload for `003_relax_title_length.sql` exits 0, while an overwrite payload for `001_create_tasks.sql` exits 2 with the BLOCKED message).
- Shell-based (`Bash`) edits to migrations are not covered by this hook (PreToolUse matcher is `Edit|Write|MultiEdit|NotebookEdit`) and are caught in review instead.
