# Hook and permission evidence

Captured on 2026-11-24 (Windows 11, Node, Claude Code 2.1.330), from the repo root, with `CLAUDE_PROJECT_DIR` set to the repo.
The live-session log is git-ignored, so the lines below are pasted here for the PR. The procedure is in [hook-test.md](hook-test.md).

## 1. Blocking hook fires on an applied migration (exit 2)

Command: `node .claude/hooks/block-applied-migration.mjs < docs/ai/sample-payload.json`

```
BLOCKED: db/migrations/001_create_tasks.sql is an applied migration. Never edit or rename it. Add a new, next-numbered file in db/migrations/ instead (see .claude/rules/migrations.md).
exit=2
```

Log line written by the same run:

```
2026-11-24T08:52:32.476Z BLOCK Edit existing migration db/migrations/001_create_tasks.sql
```

## 2. Other cases

| Input | Exit | Why |
|---|---|---|
| `Write` to a new file `db/migrations/099_probe.sql` | 0 | new migration is allowed; logged as `ALLOW` |
| stdin is not JSON | 0 | by design: a payload the hook cannot read is not blocked |
| `Bash` `sed -i … db/migrations/002_…` | 0 | the hook matches only Edit/Write/MultiEdit; this case is covered by the `deny` rule below |

## 3. `deny` rule `Bash(sed -i:*)` blocks the Bash bypass

Check made with `claude -p` in the repo, `--allowedTools "Bash(sed:*)"` (so the CLI allows every `sed`), and two commands:

- `sed -n 1p AGENTS.md`: ran, printed `# Team Tasks`. Control: the allow rule works.
- `sed -i 's/x/y/' docs/ai/hw-probe-missing.txt`: not run, listed in `permission_denials`. The file does not exist, so nothing could change even if it had run.

Since `sed:*` is allowed, the refusal comes from the `deny` rule for `sed -i`.

## 4. Tests and typecheck

- `npm test`: 4 passed.
- `npm run typecheck`: exit 0.
