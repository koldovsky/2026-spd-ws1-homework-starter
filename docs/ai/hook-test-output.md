# Hook test output — block-migration-edit

## Test 1: Editing existing migration (should BLOCK)

**Command:**
```bash
node .claude/hooks/block-migration-edit.mjs < docs/ai/sample-payload.json
```

**Payload:**
```json
{ "tool_name": "Edit", "tool_input": { "file_path": "db/migrations/001_create_tasks.sql" } }
```

**Stderr output:**
```
BLOCKED: Cannot edit existing migration "db/migrations/001_create_tasks.sql". Applied migrations are immutable. Create a new migration file instead.
```

**Exit code:** `2` (blocks the tool call)

---

## Test 2: Creating new migration (should ALLOW)

**Command:**
```bash
echo '{ "tool_name": "Write", "tool_input": { "file_path": "db/migrations/003_new_feature.sql" } }' | node .claude/hooks/block-migration-edit.mjs
```

**Stderr output:** (none)

**Exit code:** `0` (allows the tool call)
