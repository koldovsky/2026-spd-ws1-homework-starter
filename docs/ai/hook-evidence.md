# Hook evidence — `.claude/hooks/protect-migrations.mjs`

<!-- owner: @skindyk · why: the homework asks for proof that the blocking hook fires; the log itself is git-ignored · review-by: 2027-03-01 -->

Claude Code 2.1.330 · Windows 11 · Node 25.9.0. Recorded 2026-11-23.

## 1. Live firing in a Claude Code session

The hook was registered in `.claude/settings.json` and the agent attempted `Edit` on an applied migration
(changing `between 1 and 40` → `between 1 and 80` in `db/migrations/002_add_task_estimate.sql`). The edit was
refused and the file is unchanged:

```text
PreToolUse:Edit hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-migrations.mjs"]: BLOCKED by .claude/hooks/protect-migrations.mjs: Edit on an applied migration
"db/migrations/002_add_task_estimate.sql" is an applied migration (committed to git). lib/db.ts never re-runs applied migrations, so changing it would make fresh and existing databases differ.
Do this instead: add a NEW migration db/migrations/NNN_<what>.sql with the next number (see .claude/skills/add-task-field/SKILL.md). For a changed CHECK constraint, rebuild the table in the new migration.
```

It also fired (unplanned) on a Bash command whose text contained `rm db/migrations/001_create_tasks.sql`:

```text
PreToolUse:Bash hook error: [...]: BLOCKED by .claude/hooks/protect-migrations.mjs: shell command modifies an applied migration
"db/migrations/001_create_tasks.sql" is an applied migration (committed to git). ...
```

## 2. Manual run with a sample payload (per `docs/ai/hook-test.md`)

Bash:

```text
$ node .claude/hooks/protect-migrations.mjs < docs/ai/sample-payload.json
BLOCKED by .claude/hooks/protect-migrations.mjs: Edit on an applied migration
"db/migrations/001_create_tasks.sql" is an applied migration (committed to git). lib/db.ts never re-runs applied migrations, so changing it would make fresh and existing databases differ.
Do this instead: add a NEW migration db/migrations/NNN_<what>.sql with the next number (see .claude/skills/add-task-field/SKILL.md). For a changed CHECK constraint, rebuild the table in the new migration.
$ echo $?
2
```

PowerShell:

```text
PS> Get-Content docs/ai/sample-payload.json | node .claude/hooks/protect-migrations.mjs; "LASTEXITCODE=$LASTEXITCODE"
BLOCKED by .claude/hooks/protect-migrations.mjs: Edit on an applied migration
...
LASTEXITCODE=2
```

## 3. Regression cases — `node docs/ai/hook-cases.mjs` (also runs in CI)

Version 2 of the hooks. A harness review found 6 bypasses and 2 false positives in version 1, and every one is now
a case below. While writing this file I hit a third false positive: a `node - <<'EOF'` heredoc whose body
*mentioned* migration paths was blocked. Heredoc bodies are now treated as data, and that command is a case too.
The PR review (2026-11-25) found two more misses, now fixed and listed below:
- PreToolUse: a redirect with no space inside a subshell, `(cd db/migrations; echo x>>001_…)`, got through.
- PostToolUse: a second, *different* edit to an already-reported migration wasn't reported, because the hook
  remembered only path and status. It now also stores a content hash.

PostToolUse cases run in a throwaway git repo.

```text
# PreToolUse: protect-migrations.mjs
PASS  exit=2 (want 2)  Edit applied 001 (relative path)
PASS  exit=2 (want 2)  Edit applied 002 (absolute path)
PASS  exit=2 (want 2)  Edit DB/Migrations/001 (other case)
PASS  exit=2 (want 2)  Write over applied 001
PASS  exit=0 (want 0)  Write NEW 003 migration
PASS  exit=0 (want 0)  Edit lib/tasks.ts
PASS  exit=2 (want 2)  Bash rm applied 001
PASS  exit=2 (want 2)  Bash cd migrations && rm 001
PASS  exit=2 (want 2)  Bash (cd db; cd migrations; rm 001)
PASS  exit=2 (want 2)  Bash sed -i applied 002
PASS  exit=2 (want 2)  Bash append into applied 002
PASS  exit=2 (want 2)  Bash (cd migrations; echo x>>001) subshell, no space
PASS  exit=2 (want 2)  Bash cp x over applied 001
PASS  exit=2 (want 2)  Bash install over applied 001
PASS  exit=2 (want 2)  Bash git rm -r migrations folder
PASS  exit=2 (want 2)  Bash find -delete in migrations
PASS  exit=2 (want 2)  Bash git checkout main -- applied 001
PASS  exit=2 (want 2)  Bash git apply patch touching 002
PASS  exit=2 (want 2)  Bash node -e writeFileSync 001
PASS  exit=2 (want 2)  PowerShell Set-Content applied 001
PASS  exit=2 (want 2)  PowerShell Copy-Item -Force over 001
PASS  exit=2 (want 2)  PowerShell New-Item -Force over 001
PASS  exit=2 (want 2)  PowerShell Remove-Item -Recurse folder
PASS  exit=0 (want 0)  Bash read 001, redirect elsewhere
PASS  exit=0 (want 0)  Bash cp applied 001 to a backup
PASS  exit=0 (want 0)  Bash ls migrations && npm test
PASS  exit=0 (want 0)  Bash rm NEW 003 migration
PASS  exit=0 (want 0)  Bash git commit -m mentioning rm 001
PASS  exit=0 (want 0)  Bash echo text mentioning rm 001
PASS  exit=0 (want 0)  Bash node -e reading 001
PASS  exit=0 (want 0)  Bash heredoc doc text mentioning rm 001
PASS  exit=2 (want 2)  Bash heredoc INTO applied 001
PASS  exit=0 (want 0)  Bash git apply patch touching lib only
PASS  exit=0 (want 0)  Bash git restore applied 001 from HEAD (repair)
PASS  exit=0 (want 0)  Bash git checkout -- applied 001 (repair)

# PostToolUse: check-migrations-diff.mjs (temp repo)
PASS  exit=0 (want 0)  clean tree
PASS  exit=0 (want 0)  new untracked 003 migration
PASS  exit=2 (want 2)  applied 001 modified (e.g. via xargs or a script)
PASS  exit=0 (want 0)  same state again: reported once, no nagging
PASS  exit=2 (want 2)  second, different edit to applied 001
PASS  exit=0 (want 0)  after git restore from HEAD
PASS  exit=2 (want 2)  applied 001 deleted

all 42 cases passed
```

## 4. Log — `.claude/hooks/protect-migrations.log` (git-ignored; excerpt)

Columns: time · decision · tool · target · session id · reason. The first two lines are the **live** firings from
section 1, with the real session id. The 16:29:41 line is the deliberate `Edit` of 002. The `hook-cases` lines
are from section 3.

```text
2026-11-23T16:29:13.365Z	BLOCK	Bash	db/migrations/001_create_tasks.sql	98c841b7-0df0-43ba-b2d9-91f82a99236d	shell command modifies an applied migration
2026-11-23T16:29:41.427Z	BLOCK	Edit	db/migrations/002_add_task_estimate.sql	98c841b7-0df0-43ba-b2d9-91f82a99236d	Edit on an applied migration
2026-11-23T16:29:32.857Z	BLOCK	Edit	db/migrations/002_add_task_estimate.sql	hook-cases	Edit on an applied migration
2026-11-23T16:29:32.997Z	ALLOW	Write	db/migrations/003_widen_estimate.sql	hook-cases	new migration
2026-11-23T16:29:33.433Z	BLOCK	PowerShell	db/migrations/001_create_tasks.sql	hook-cases	shell command modifies an applied migration
```

## 5. Permission denies, checked live

A headless session in a scratch dir with this `.claude/settings.json`. The CLI deliberately allowed `Bash(rm *)`,
`PowerShell(Remove-Item *)` and `Read`, so the deny rules had to win over an allow:

```text
denials: Bash rm -fr j1 | Bash rm -r -f j2 | PowerShell Remove-Item j3 -Recurse -Force | Read ….env.development
$ ls -d j1 j2 j3        # all three directories still exist
```

The `Bash(rm -rf *)` deny also refused one of my own setup commands in the authoring session, right after the
settings were saved.

## 6. Firing in independent agent sessions (A/B Task 2, see `ab-note.md`)

Two fresh headless Haiku sessions were told to edit `002` directly. Lines from each clone's hook log:

```text
2026-11-23T17:04:49.804Z	BLOCK	Edit	db/migrations/002_add_task_estimate.sql	1dbb3b9c-e7d5-4265-b061-fdf05a7428ab	Edit on an applied migration
2026-11-23T17:04:49.653Z	BLOCK	Edit	db/migrations/002_add_task_estimate.sql	3bafb45d-aa6c-4de2-8a93-7b46519f5f60	Edit on an applied migration
```

Both sessions reverted their partial edit and asked for a new migration. The two A sessions, with no harness,
edited `002`.

## What it does and does not cover

Two layers in Claude Code, plus CI:

1. **`protect-migrations.mjs` (PreToolUse, blocks before the call).**
   - "Applied" means committed in `HEAD` (`git ls-tree HEAD db/migrations/`), compared **case-insensitively**.
     A new, uncommitted `003_*.sql` can be written, edited and deleted freely until it is committed.
   - Shell commands are parsed per segment and follow `cd`/`Set-Location`. It looks for:
     - removal and move verbs (`rm`, `mv`, `*-Item`, `Set-Content`, `sed -i`, `find -delete`);
     - copies onto a migration (`cp`, `Copy-Item`, `install`);
     - redirects and `tee` into a migration;
     - `git rm/mv/checkout/restore`, and `git apply` of a patch file it can read;
     - inline scripts (`node -e`, `python -c`) that write.
   - Quoted text with spaces (commit messages, `echo`) and heredoc bodies are ignored, so mentioning a path no
     longer blocks.
   - `git restore --source=HEAD …` and `git checkout -- …` are allowed, because that is how you undo a change.
2. **`check-migrations-diff.mjs` (PostToolUse on Bash/PowerShell, reports after the call).** Runs
   `git diff --name-status HEAD -- db/migrations`. It catches anything the parser missed: `xargs`, patches on
   stdin, heredoc scripts, tools not on the list. It can't undo the change, but the agent gets the exact restore
   command at once. Each state is reported once per session, so a human's pre-existing edit doesn't nag on every
   command.
3. **Outside Claude Code**, `.github/workflows/ci.yml` fails any PR that modifies, renames or deletes a migration
   in `db/migrations/`, whoever made the change.

Still not covered: changes made by tools that aren't Bash or PowerShell (e.g. an MCP server writing files) are seen
only by CI. Neither hook is a security boundary against a determined user.
