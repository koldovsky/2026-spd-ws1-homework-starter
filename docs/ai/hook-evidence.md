# PreToolUse Hook — Test Evidence

<!-- owner: @oksanastrohetska · why: Demonstrate that the blocking hook enforces database migration protection · review-by: 2026-12-01 -->

## 1. Purpose

Verify that the `PreToolUse` hook prevents Claude Code's direct file-editing tools from modifying existing database migration files while allowing new migrations to be created.

**Repository:** `2026-spd-ws1-homework-starter`

**Hook:** `.claude/hooks/protect-migrations.py`

**Configuration:** `.claude/settings.json`

**Protected directory:** `db/migrations/`

**Expected behavior:**
- Block direct modifications to existing migration files.
- Allow creation of new migration files.
- Print a clear blocking reason to stderr.
- Return exit code `2` when a prohibited modification is detected.
- Return exit code `0` for an allowed operation.

## 2. Test environment

- **Project:** Next.js task-management application
- **Claude Code version:** 2.1.323
- **Test method:** Direct Python hook execution with simulated Claude Code tool input
- **Working directory:** Repository root
- **Migration files used for verification:**
    - `db/migrations/001_create_tasks.sql`
    - `db/migrations/003_hook_test.sql` (nonexistent test filename)

The tests invoke the hook directly and do not execute actual file modifications.

## 3. Test 1 — Block modification of an existing migration

**Scenario:** Claude Code attempts to edit the existing migration `001_create_tasks.sql`.

**Test command:**

```bash
printf '%s\n' \
'{"tool_name":"Edit","tool_input":{"file_path":"db/migrations/001_create_tasks.sql","old_string":"test","new_string":"modified"}}' \
| python3 .claude/hooks/protect-migrations.py

echo "Exit code: $?"
```

**Actual terminal output:**

```text
BLOCKED: Existing migration cannot be modified: db/migrations/001_create_tasks.sql. Create a new numbered migration instead.
Exit code: 2
```

**Result: PASS**

The hook detected an attempted modification to an existing migration file, printed a clear blocking reason, and exited with code `2`.

No migration file was modified because the test invoked only the hook script.

## 4. Test 2 — Allow creation of a new migration

**Scenario:** Claude Code attempts to create a new migration file that does not already exist.

**Test command:**

```bash
printf '%s\n' \
'{"tool_name":"Write","tool_input":{"file_path":"db/migrations/003_hook_test.sql","content":"-- test"}}' \
| python3 .claude/hooks/protect-migrations.py

echo "Exit code: $?"
```

**Actual terminal output:**

```text
Exit code: 0
```

**Result: PASS**

The hook allowed a simulated `Write` request targeting a new migration filename.

No file was created because the test invoked only the hook script.

## 5. Test results summary

| Test | Expected result | Actual result | Status |
|---|---|---|---|
| Edit existing migration | Block, exit code 2 | Blocked, exit code 2 | PASS |
| Create new migration | Allow, exit code 0 | Allowed, exit code 0 | PASS |

Both direct hook tests passed.

## 5b. Test 3 — Block a shell edit (Bash matcher)

```bash
printf '%s\n' '{"tool_name":"Bash","tool_input":{"command":"sed -i \"\" s/a/b/ db/migrations/001_create_tasks.sql"}}' | python3 .claude/hooks/protect-migrations.py; echo "Exit code: $?"
```

```text
BLOCKED: Shell commands must not modify files in db/migrations/. Create a new numbered migration instead.
Exit code: 2
```

A harmless `npm test` Bash payload returns exit code 0. All four direct hook tests passed.

## 5c. Live firing in a real session

After the `Bash` matcher was added, a real Claude Code Bash call that contained a `sed -i` against a file under
`db/migrations/` was blocked before it ran:

```text
PreToolUse:Bash hook error: [python3 "${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-migrations.py"]: BLOCKED: Shell commands must not modify files in db/migrations/. Create a new numbered migration instead.
```

Known limitation: the Bash check is a regex heuristic, so it can false-positive on commands that merely mention the path.

## 6. Connection to the team agreement

The hook enforces the L0 row of `docs/ai/team-agreement.md`: **editing existing applied migrations**. New migrations (L2) are allowed.
