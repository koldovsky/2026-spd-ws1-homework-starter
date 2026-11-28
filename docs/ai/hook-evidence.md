<!-- owner: @AlexGLT · why: proof that both PreToolUse hooks block a violation with exit 2 and let a valid call pass · review-by: 2027-04-24 -->

# Hook evidence

Run on 2026-11-25 with Node v24.3.0. Method: `docs/ai/hook-test.md`.
Exit code 2 blocks the tool call. Exit code 0 allows it. Commands run from the repo root.

## Live session block

The hook also fired in a real Claude Code session. The agent ran a Bash command that named
`001_create_tasks.sql` and also used a write redirect (`>>`). The command only tested the hook. Claude Code stopped the call and showed this message:

```text
PreToolUse:Bash hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/block-applied-migrations.mjs"]: BLOCKED: 001_create_tasks.sql is an applied migration. Do not edit it. Create a new numbered file in db/migrations/ instead (for example 003_<name>.sql). Rule: docs/ai/team-agreement.md, "Editing an applied migration" is L0.
```

## Manual runs with sample payloads

## Hook 1 — block-applied-migrations.mjs

### Block: Edit an applied migration (docs/ai/sample-payload.json)

```bash
echo '{ "tool_name": "Edit", "tool_input": { "file_path": "db/migrations/001_create_tasks.sql" } }' | node .claude/hooks/block-applied-migrations.mjs
```

- stderr: BLOCKED: 001_create_tasks.sql is an applied migration. Do not edit it. Create a new numbered file in db/migrations/ instead (for example 003_<name>.sql). Rule: docs/ai/team-agreement.md, "Editing an applied migration" is L0.
- exit code: **2** (blocked)

### Block: Bash overwrites an applied migration

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"echo x > db/migrations/002_add_task_estimate.sql"}}' | node .claude/hooks/block-applied-migrations.mjs
```

- stderr: BLOCKED: 002_add_task_estimate.sql is an applied migration. Do not edit it. Create a new numbered file in db/migrations/ instead (for example 003_<name>.sql). Rule: docs/ai/team-agreement.md, "Editing an applied migration" is L0.
- exit code: **2** (blocked)

### Allow: Write a new migration (docs/ai/sample-payload-allowed.json)

```bash
echo '{ "tool_name": "Write", "tool_input": { "file_path": "db/migrations/003_add_task_label.sql" } }' | node .claude/hooks/block-applied-migrations.mjs
```

- stderr: (empty)
- exit code: **0** (allowed)

### Allow: Bash only reads an applied migration

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"cat db/migrations/001_create_tasks.sql"}}' | node .claude/hooks/block-applied-migrations.mjs
```

- stderr: (empty)
- exit code: **0** (allowed)

## Hook 2 — block-env-files.mjs

### Block: Read .env.local (docs/ai/sample-payload-env.json)

```bash
echo '{ "tool_name": "Read", "tool_input": { "file_path": ".env.local" } }' | node .claude/hooks/block-env-files.mjs
```

- stderr: BLOCKED: .env.local is a .env* file. Do not read or change .env* files. They can hold secrets. Ask the user to read or change the file themselves.
- exit code: **2** (blocked)

### Block: Bash reads .env

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"cat .env"}}' | node .claude/hooks/block-env-files.mjs
```

- stderr: BLOCKED: .env is a .env* file. Do not read or change .env* files. They can hold secrets. Ask the user to read or change the file themselves.
- exit code: **2** (blocked)

### Allow: Read a normal file

```bash
echo '{"tool_name":"Read","tool_input":{"file_path":"lib/tasks.ts"}}' | node .claude/hooks/block-env-files.mjs
```

- stderr: (empty)
- exit code: **0** (allowed)

