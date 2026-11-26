# Hook evidence — protect-migrations

## Violation: edit an applied migration

```text
$ node .claude/hooks/protect-migrations.mjs < docs/ai/sample-payload.json
BLOCKED: db/migrations/001_create_tasks.sql is an applied migration and is immutable. Add a new numbered file in db/migrations/ instead (see the add-migration skill).
exit code: 2
```

## Allowed: create a new migration

```text
$ node .claude/hooks/protect-migrations.mjs < docs/ai/sample-payload-ok.json
exit code: 0
```

## Log

```text
2026-11-26T09:22:46.003Z Edit db/migrations/001_create_tasks.sql -> exit 2
```
