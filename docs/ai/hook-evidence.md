# Hook evidence — `protect-migrations`

<!-- owner: @artem-tkachenko · why: the homework asks for the log or output of the blocking hook firing on a violation · review-by: 2027-05-23 -->

Hook: `.claude/hooks/protect-migrations.mjs`, registered as `PreToolUse` in `.claude/settings.json`.
It blocks (exit code 2, reason on stderr) direct edits/overwrites to existing `db/migrations/*.sql` and common shell write patterns, and allows creating new ones. The Bash guard is best-effort, not a sandbox. A local, unshipped runner matched expected codes for 25/25 payload scenarios; the checked-in examples below are directly reproducible.

## 1. Live block in a Claude Code session (2026-11-23)

While testing, the agent itself ran a Bash command that wrote files with `>` and mentioned `db/migrations/`.
The hook fired and Claude Code refused the call. This is the original live output from the first version of the hook; the current message says “this command may modify a migration file.”

```
PreToolUse:Bash hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-migrations.mjs"]: Blocked by protect-migrations hook: this command looks like it modifies files in db/migrations/.
Applied migrations in db/migrations/ must never be edited (see docs/ai/team-agreement.md, L0).
To change the schema, create a NEW numbered file, e.g. db/migrations/003_<what>.sql, after the developer approves.
```

## 2. Payload tests (method from `docs/ai/hook-test.md`)

```bash
node .claude/hooks/protect-migrations.mjs < docs/ai/sample-payload.json; echo "exit=$?"
node .claude/hooks/protect-secrets.mjs < docs/ai/sample-secret-payload.json; echo "exit=$?"
```

| Payload | Expected | Exit code |
|---|---|---|
| `Edit` on `db/migrations/001_create_tasks.sql` (`docs/ai/sample-payload.json`) | block | **2** |
| `Write` over existing `db/migrations/002_add_task_estimate.sql` | block | **2** |
| `Write` new `db/migrations/003_add_priority.sql` | allow | 0 |
| `Bash`: `sed -i s/text/varchar/ db/migrations/001_create_tasks.sql` | block | **2** |
| `Bash`: `cd db && echo x > migrations/001_create_tasks.sql` | block | **2** |
| `Bash`: `echo x > migrations/001_create_tasks.sql` when already in `db/` | block | **2** |
| `Bash`: Python write to an existing migration | block | **2** |
| `Bash`: `git apply` / `git restore` / `touch` an existing migration | block | **2** |
| `Bash`: `cat db/migrations/001_create_tasks.sql` (read only) | allow | 0 |
| `Edit` on `lib/tasks.ts` (unrelated file) | allow | 0 |
| `Edit` on `lib/../db/migrations/001_create_tasks.sql` (path traversal) | block | **2** |

stderr for a blocked call:

```
Blocked by protect-migrations hook: Edit on existing migration db/migrations/001_create_tasks.sql.
Applied migrations in db/migrations/ must never be edited (see docs/ai/team-agreement.md, L0).
To change the schema, create a NEW numbered file, e.g. db/migrations/003_<what>.sql, after the developer approves.
```

## 3. Log (`.claude/hooks/protect-migrations.log`, git-ignored)

```
2026-11-23T18:04:11.161Z BLOCK Bash "mkdir -p /tmp/hooktest && ... > overwrite.json ..."   ← the live block from section 1
2026-11-23T18:05:17.503Z BLOCK Edit db/migrations/001_create_tasks.sql
2026-11-23T18:05:17.538Z BLOCK Write db/migrations/002_add_task_estimate.sql
2026-11-23T18:05:17.567Z ALLOW Write db/migrations/003_add_task_priority.sql (new migration)
2026-11-23T18:05:17.602Z BLOCK Bash "sed -i s/text/varchar/ db/migrations/001_create_tasks.sql"
2026-11-23T18:05:17.696Z BLOCK Edit db/migrations/001_create_tasks.sql
```

After all tests `git status -- db` is empty: no migration was modified.

## 4. Second hook — `protect-secrets`

Hook: `.claude/hooks/protect-secrets.mjs`. `deny` on `Read(./.env)` does not stop `cat .env` in Bash, so this hook blocks
common direct accesses to `.env` files via Read/Grep/Edit/Write/Bash, except `.env.example`. This is best-effort string matching, not a sandbox.

| Payload | Expected | Exit code |
|---|---|---|
| `Read` `/repo/.env` | block | **2** |
| `Read` `.env.local` | block | **2** |
| `Read` `.env.example` | allow | 0 |
| `Bash`: `cat .env` | block | **2** |
| `Bash`: `source ./.env.production && npm start` | block | **2** |
| `Bash`: `cat .env.example` | allow | 0 |
| `Bash`: `cat .envrc` (different file) | allow | 0 |
| `Read` `.env.staging` | block | **2** |
| `Bash`: `cat .env*` / `cat .env.*` | block | **2** |
| `Grep` with `path: .env` or project root `.` | block | **2** |
| Recursive `grep -r SECRET .` / `find ... -exec cat` | block | **2** |
| `Read` `lib/db.ts` | allow | 0 |
| `Bash`: `grep -n DB_FILE lib/db.ts` | allow | 0 |

stderr for a blocked call:

```
Blocked by protect-secrets hook: Bash would read or change "cat .env".
.env files may hold real secrets and must never be read by the agent (see AGENTS.md, Hard rules).
Use .env.example to see which variables exist; ask the developer for anything else.
```

## 5. Retest after hardening hooks

Payloads were run with a local, unshipped Node runner against the hooks. Exit 2 means blocked; exit 0 means allowed. Reproduce the representative migration block with the command in section 2; the full 25-case runner was temporary and is not included.

| Scenario | Expected | Result |
|---|---:|---:|
| Edit existing migration | 2 | 2 |
| Write over existing migration | 2 | 2 |
| Write new migration | 0 | 0 |
| `sed -i` on a migration | 2 | 2 |
| `cd db && echo x > migrations/001_...sql` | 2 | 2 |
| Python write to a migration | 2 | 2 |
| Read migration with `cat` | 0 | 0 |
| Read `.env` / `.env.local` | 2 | 2 |
| Read `.env.example` | 0 | 0 |
| `cat .env` / `source .env.production` | 2 | 2 |
| `cat .env.example` / `cat .envrc` | 0 | 0 |
| Grep path `.env` / project-root `.` | 2 | 2 |
| Recursive `grep -r SECRET .` / `find ... -exec cat` | 2 | 2 |
| Search `lib/db.ts` | 0 | 0 |

**25/25 payload scenarios matched expected exit codes**, including tests for `.env.staging`, `.env*`/`.env.*` shell globs, and `git apply`, `git restore`, and `touch` against an existing migration. Migration files remained unchanged during tests. The temporary 25-case runner lived in `/tmp` and is not part of this repository; `docs/ai/sample-payload.json` and `docs/ai/sample-secret-payload.json` are the reproducible representative cases.

## Known limits

- These are `PreToolUse` hooks with string-matching heuristics, not an OS-level sandbox. Obfuscated shell commands, scripts that construct paths at runtime, symlinks, or another process may evade them. Never place real secrets in a repository accessible to an agent; use actual OS/container isolation for strong confidentiality guarantees.
- The secrets hook fails closed on malformed hook JSON and blocks recursive searches and root-wide Grep because they could include ignored secret files. This can reject some legitimate broad searches.
- `settings.json` Read-deny patterns are explicit. The hook adds broader `.env.*` detection, but new tooling or unusual access paths need new tests.
