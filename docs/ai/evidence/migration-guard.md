# Migration guard evidence

Run on 2026-11-25 with Node 26.13.0, macOS. Direct hook invocation using the same stdin format as PreToolUse. This is not a claim of a live Claude hook event.

Command:
```sh
node .claude/hooks/protect-migrations.mjs < docs/ai/evidence/migration-edit-payload.json
```

Stderr:
```text
Blocked: cannot rewrite an existing migration. Create a new migration instead; schema history is immutable.
```

Stdout: empty.

Exit code: 2

No migration was edited; the hook only inspects paths. Automated positive and negative checks: `node --test scripts/migration-guard.test.mjs` (6 passed).
