# Hook evidence — protect-migrations

<!-- owner: @IgorPetr · why: proof that the blocking hook fires, required by HOMEWORK.md deliverable 6 · review-by: 2027-02-24 -->

Hook: `.claude/hooks/protect-migrations.mjs`, registered twice in `.claude/settings.json`:
- `PreToolUse`, matcher `Edit|Write|MultiEdit|Bash`: exit 2 blocks the call. "Applied" means **tracked in git**, so the agent can still fix a
  `003_*.sql` it has just written and not committed.
- `PostToolUse`, same matcher, argument `post`: backstop. Exit 2 if `git diff --name-status HEAD -- db/migrations` shows a tracked migration as
  modified, deleted or renamed, which catches anything the Pre check cannot see (for example a script that rewrites the file).

Environment: Linux aarch64, Node v24.22.3, Claude Code 2.1.330.

## 1. Live session: the hook blocks an Edit of 002

In a copy of the repo at commit `2c7f21a` (the harness) the two `Edit(/db/migrations/00x_*)` deny rules were removed, because otherwise the permission
layer answers first and the hook never runs. Command:

```bash
NO_EDIT_DENY=1 PROMPT="Change db/migrations/002_add_task_estimate.sql so the estimate check allows 1 to 80 instead of 1 to 40. Edit that file directly. Report exactly what the tool returned." scripts/ab-run.sh B 3 2c7f21a
```

What the agent reported the Edit tool returned:

```text
PreToolUse:Edit hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-migrations.mjs"]: BLOCKED: db/migrations/002_add_task_estimate.sql touches an applied migration (tracked in git). Applied migrations must not change. Add a new numbered file in db/migrations/ instead (see .claude/skills/add-migration/SKILL.md).
```

Log line the hook wrote to `.claude/hooks/block.log` (git-ignored) in that run:

```text
2026-11-26T18:55:35.002Z pre Edit db/migrations/002_add_task_estimate.sql BLOCKED
```

`002` was unchanged afterwards; the only diff in that copy was the removed deny rules.

## 2. Manual run with a sample payload (as in [hook-test.md](hook-test.md))

```bash
node .claude/hooks/protect-migrations.mjs < docs/ai/sample-payload.json; echo "exit code: $?"
```

```text
BLOCKED: db/migrations/001_create_tasks.sql touches an applied migration (tracked in git). Applied migrations must not change. Add a new numbered file in db/migrations/ instead (see .claude/skills/add-migration/SKILL.md).
exit code: 2
```

## 3. Full case matrix

`docs/ai/hook-tests/run-hook-tests.sh` clones the repo to a temp directory and feeds the hook 26 payloads. Output of that script:

```text
--- Edit / Write
PASS  exit=2 (want 2)  Edit tracked 001
PASS  exit=2 (want 2)  Write tracked 002 (absolute)
PASS  exit=0 (want 0)  Write new untracked 003
PASS  exit=0 (want 0)  Edit own untracked 003
PASS  exit=0 (want 0)  Edit lib/tasks.ts
--- Bash
PASS  exit=2 (want 2)  redirect into 001
PASS  exit=2 (want 2)  append into 001
PASS  exit=2 (want 2)  sed -i on 001
PASS  exit=2 (want 2)  cd + sed -i
PASS  exit=2 (want 2)  tee 002
PASS  exit=2 (want 2)  cp over 002
PASS  exit=2 (want 2)  rm 001
PASS  exit=2 (want 2)  git checkout of 001
PASS  exit=2 (want 2)  python rewrite by basename
PASS  exit=0 (want 0)  cat 001 (read only)
PASS  exit=0 (want 0)  ls migrations
PASS  exit=0 (want 0)  grep with 2>&1
PASS  exit=0 (want 0)  npm test | tail
PASS  exit=0 (want 0)  write new 004 via redirect
PASS  exit=0 (want 0)  write new 004 via heredoc
PASS  exit=2 (want 2)  glob sed -i over all
PASS  exit=2 (want 2)  cd into dir then write
--- PostToolUse backstop
PASS  exit=0 (want 0)  clean tree (untracked 003 only)
PASS  exit=2 (want 2)  001 modified behind the hook's back
PASS  exit=0 (want 0)  after restore
PASS  exit=2 (want 2)  002 deleted
```

Example stderr for the `cd db/migrations && sed -i ...` case, which a path-only check would miss:

```text
BLOCKED: Bash `cd db/migrations && sed -i 's/120/200/' 001_create_tasks.sql` touches an applied migration (tracked in git). Applied migrations must not change. Add a new numbered file in db/migrations/ instead (see .claude/skills/add-migration/SKILL.md).
```

Example stderr from the `PostToolUse` backstop when a tracked migration was changed behind the hook's back:

```text
BLOCKED: the working tree (M db/migrations/001_create_tasks.sql); restore with `git checkout HEAD -- db/migrations`; the change touches an applied migration (tracked in git). Applied migrations must not change. Add a new numbered file in db/migrations/ instead (see .claude/skills/add-migration/SKILL.md).
```

## Limits

- The Bash check is a heuristic on the command text (redirects, `sed -i`, `tee`, `cp`, `mv`, `rm`, `git checkout`, inline `python`/`node -e`). A script file that
  rewrites a migration without naming it on the command line is caught only by the `PostToolUse` check, after the fact, and by review.
- A command that does `cd db/migrations` and then writes a new file is blocked too (the directory counts as a reference); use the full path `db/migrations/003_x.sql`.
- The hook runs with `node`, which this repo already requires.
