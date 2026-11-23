# PreToolUse Hook — Test Evidence

<!-- owner: @oksanastrohetska-lab · why: Demonstrate that the blocking hook enforces database migration protection · review-by: 2027-04-23 -->

## 1. Purpose

Verify that the `PreToolUse` hook prevents Claude Code's direct file-editing tools from modifying existing database migration files while allowing new migrations to be created.

**Repository:** `2026-spd-ws1-homework-starter`

**Hook:** `.claude/hooks/protect-migrations.mjs`

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
- **Test method:** Direct Node hook execution with simulated Claude Code tool input
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
| node .claude/hooks/protect-migrations.mjs

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
| node .claude/hooks/protect-migrations.mjs

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
printf '%s\n' '{"tool_name":"Bash","tool_input":{"command":"sed -i \"\" s/a/b/ db/migrations/001_create_tasks.sql"}}' | node .claude/hooks/protect-migrations.mjs; echo "Exit code: $?"
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
PreToolUse:Bash hook error: [node "${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-migrations.mjs"]: BLOCKED: Shell commands must not modify files in db/migrations/. Create a new numbered migration instead.
```

Known limitation: the Bash check is a regex heuristic, so it can false-positive on commands that merely mention the path (it did so on a test command for this very hook).

## 6. Connection to the team agreement

The hook enforces the L0 row of `docs/ai/team-agreement.md`: **editing existing applied migrations**. New migrations (L2) are allowed.

## 7. Update: Node hook, wider Bash check, second layer

Review feedback: `python3` is missing or a Store stub on many Windows machines, and any failure other than exit 2 lets
the edit through. The hook is now `protect-migrations.mjs` (Node, already required by the repo) and **fails closed**
(uncaught errors and invalid input exit 2). The Bash check now matches the write verb and the migrations path anywhere in
the command and normalizes `\` to `/`. `permissions.deny` also lists `Edit/Write/MultiEdit(./db/migrations/**)` as a
second layer.

| Case | Expected | Actual |
|---|---|---|
| Edit existing `001_create_tasks.sql` | exit 2 | exit 2 |
| Write new `003_hook_test.sql` | exit 0 | exit 0 |
| Bash `sed -i` on a migration path | exit 2 | exit 2 |
| Bash `cd` into the migrations dir, then `sed -i` | exit 2 | exit 2 |
| Bash `mv` onto a backslash migrations path | exit 2 | exit 2 |
| Bash `npm test` | exit 0 | exit 0 |
| Bash `ls` of the migrations dir (read only) | exit 0 | exit 0 |
| Invalid JSON on stdin | exit 2 | exit 2 |
