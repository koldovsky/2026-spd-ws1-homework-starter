# Testing a hook without a live session

Use this when your company's managed settings block project hooks on your machine, or to debug a hook.
A `PreToolUse` hook gets a JSON payload on stdin; exit code 2 blocks the call and stderr is the reason.

1. The example payload is committed as `docs/ai/sample-payload.json`. It is an `Edit` on an applied migration:

```json
{ "tool_name": "Edit", "tool_input": { "file_path": "db/migrations/001_create_tasks.sql" } }
```

2. Run the hook with it, from the repo root. In Bash or cmd:

```bash
node .claude/hooks/block-applied-migration.mjs < docs/ai/sample-payload.json
echo $?
```

PowerShell has no `<` redirection; there use:

```powershell
Get-Content docs/ai/sample-payload.json | node .claude/hooks/block-applied-migration.mjs
$LASTEXITCODE
```

3. Check the exit code: Bash `echo $?`, cmd `echo %ERRORLEVEL%`, PowerShell `$LASTEXITCODE`. Attach the command, the stderr text and the exit code to your PR.

Expected result for the example (exit 2 and the reason on stderr):

```
BLOCKED: db/migrations/001_create_tasks.sql is an applied migration. Never edit or rename it. Add a new, next-numbered file in db/migrations/ instead (see .claude/rules/migrations.md).
exit=2
```

The same run writes a `BLOCK` line to `.claude/hooks/block-applied-migration.log`, which is git-ignored. Paste that line into the PR too. A path that does not exist yet (a new migration) exits 0 and is logged as `ALLOW`. A payload that is not valid JSON also exits 0, by design. The hook does not see Bash commands; `sed -i` is covered by a `deny` rule in `.claude/settings.json`.
