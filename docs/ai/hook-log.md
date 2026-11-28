# Hook firing log — no-migration-edits

<!-- owner: @vvfesik · why: the homework and the team agreement's L0 row require evidence that the hook actually blocks a violation; this log captures the manual test runs of the hook script · review-by: 2027-02-25 -->

Script: `.claude/hooks/no-migration-edits.mjs` (PreToolUse, exit 2 = block). Payload format per [hook-test](hook-test.md).

Hook behaviour: `Edit` is always blocked on `db/migrations/*.sql`. `Write`/`NotebookEdit` are blocked only when the target file already exists — a `Write` to a not-yet-existing migration file is creating a new migration, which is the legitimate L2 "fix forward" path. To change an in-progress (unmerged) migration, re-`Write` the whole file or bypass manually; the `Edit` tool will not open it.

## Run 1 — violation: Edit an applied migration → BLOCKED (exit 2)

```json
{ "tool_name": "Edit", "tool_input": { "file_path": "db/migrations/001_create_tasks.sql" } }
```

```
$ node .claude/hooks/no-migration-edits.mjs < docs/ai/sample-payload.json; echo "exit=$?"
BLOCKED: Edit on db/migrations/001_create_tasks.sql. Applied migrations are immutable (team agreement L0): lib/db.ts records applied files in schema_migrations and skips them, so an edit never re-runs and fresh checkouts diverge from existing DBs. Fix forward: add a new migration (next number in db/migrations/, e.g. 003_<what>.sql) and run `npm run db:reset && npm test`.
exit=2
```

Reason shown to the agent: yes (stderr, above) — the L0 mechanism and the fix-forward path.

## Run 2 — not a violation: Write a NEW migration → allowed (exit 0)

```json
{ "tool_name": "Write", "tool_input": { "file_path": "db/migrations/003_new_thing.sql" } }
```

```
$ echo '{"tool_name":"Write","tool_input":{"file_path":"db/migrations/003_new_thing.sql"}}' | node .claude/hooks/no-migration-edits.mjs; echo "exit=$?"
exit=0
```

Target does not exist, so this is migration creation, not mutation of an applied file.

## Run 3 — violation: Write OVER an applied migration → BLOCKED (exit 2)

```json
{ "tool_name": "Write", "tool_input": { "file_path": "db/migrations/001_create_tasks.sql" } }
```

```
$ echo '{"tool_name":"Write","tool_input":{"file_path":"db/migrations/001_create_tasks.sql"}}' | node .claude/hooks/no-migration-edits.mjs; echo "exit=$?"
BLOCKED: Write on db/migrations/001_create_tasks.sql. Applied migrations are immutable (team agreement L0): lib/db.ts records applied files in schema_migrations and skips them, so an edit never re-runs and fresh checkouts diverge from existing DBs. Fix forward: add a new migration (next number in db/migrations/, e.g. 003_<what>.sql) and run `npm run db:reset && npm test`.
exit=2
```

The existsSync check keeps full-file overwrites of applied files blocked too — immutability does not depend on which mutating tool is used.

## Run 4 — not a violation: Read a migration → allowed (exit 0)

```json
{ "tool_name": "Read", "tool_input": { "file_path": "db/migrations/001_create_tasks.sql" } }
```

```
$ echo '{"tool_name":"Read","tool_input":{"file_path":"db/migrations/001_create_tasks.sql"}}' | node .claude/hooks/no-migration-edits.mjs; echo "exit=$?"
exit=0
```

Reads stay open; only mutating tools (Edit / Write / NotebookEdit) can be blocked.
