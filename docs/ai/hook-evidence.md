# Hook evidence — `guard-migrations` and `guard-env`

<!-- owner: @Kurkov1990 · why: proof that the hooks block violations with exit 2 and a readable reason, and where they stop · review-by: 2027-03-23 -->

Hooks, wired in `.claude/settings.json`:

| Hook | Event | Matcher | Blocks |
|---|---|---|---|
| `.claude/hooks/guard-migrations.mjs` | `PreToolUse` | `Edit\|Write\|MultiEdit\|NotebookEdit\|Bash` | changes to an applied (committed at `HEAD`) migration; a new migration not named with the next `NNN_` |
| `.claude/hooks/guard-migrations.mjs post` | `PostToolUse` | same | backstop: `git diff --name-status HEAD -- db/migrations` shows `M`/`D`/`T` on an applied file → exit 2 with the `git restore --source=HEAD …` command |
| `.claude/hooks/guard-env.mjs` | `PreToolUse` | `Read\|Edit\|Write\|MultiEdit\|NotebookEdit\|Grep\|Bash` | any `.env` / `.env.*` except `.env.example`: file tools, Grep `path`/`glob`, Bash commands that name the file, recursive `grep` / `rg -u` while a secret file exists |

Every `guard-migrations` decision is appended to `.claude/hooks/guard-migrations.log` (git-ignored).

## 1. Live sessions

**2026-11-23, Claude Code 2.1.330, first hook version (commit `4de2115`).** The agent tried to edit an applied
migration with the Edit tool. The message text is from that version (it did not yet say "(committed)"):

```text
Edit db/migrations/002_add_task_estimate.sql  ("between 1 and 40" → "between 1 and 80")

PreToolUse:Edit hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-migrations.mjs"]:
guard-migrations: db/migrations/002_add_task_estimate.sql is an applied migration and must not change.
Create db/migrations/003_<what>.sql instead.
```

`git status` afterwards: no change under `db/migrations/`.

**2026-11-25, Claude Code 2.1.332, current Bash parser.** While testing the hook, the agent ran a shell function whose
arguments contained a redirect into an applied migration. The live hook blocked the whole command before it ran:

```text
PreToolUse:Bash hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-migrations.mjs"]:
guard-migrations: shell command would modify db/migrations/ ("t 'echo x>db/migrations/001_create_tasks.sql'").
Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
```

That is a false positive (the text was test data for a function), accepted for the same reason as the heredoc case in
`ab-note.md`: on a write-shaped segment into the folder the hook prefers blocking. The agent moved the test cases into a file.

**A false positive found live on 2026-11-23, and the fix.** The first version matched `rm|mv|cp|…` anywhere in a Bash
command that mentioned `db/migrations`. It blocked a harmless `cat > next.config.ts <<'EOF' … EOF` whose heredoc *text*
mentioned the folder. The hook ignores heredoc bodies since then; the heredoc case below covers this.

## 2. Manual run (`bash docs/ai/hook-samples.sh`, 2026-11-26, the hook in this PR)

The `clone:` cases run in a throwaway `git clone` in a temp dir, so real files can change there: the uncommitted `003`,
the known-limit commands run for real, and a fake `.env` for the recursive-grep cases.

```text
$ [Edit an applied migration]
guard-migrations: db/migrations/001_create_tasks.sql is an applied migration (committed) and must not change. Create db/migrations/003_<what>.sql instead.
exit code: 2

$ [Write over an applied migration (absolute path)]
guard-migrations: db/migrations/002_add_task_estimate.sql is an applied migration (committed) and must not change. Create db/migrations/003_<what>.sql instead.
exit code: 2

$ [Bash: sed -i on a migration]
guard-migrations: shell command would modify db/migrations/ ("sed -i '' s/120/200/ db/migrations/001_create_tasks.sql"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Bash: rm a migration]
guard-migrations: shell command would modify db/migrations/ ("rm db/migrations/002_add_task_estimate.sql"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Bash: append via redirect]
guard-migrations: shell command would modify db/migrations/ ("echo 'alter table tasks add x' >> db/migrations/002_add_task_estimate.sql"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Write a new migration with a skipped number]
guard-migrations: new migration must be named 003_snake_case.sql (got 005_add_description.sql).
exit code: 2

$ [Write the next migration (allowed)]
exit code: 0

$ [Bash: read-only ls + cat (allowed)]
exit code: 0

$ [Bash: heredoc that only mentions the folder (allowed)]
exit code: 0

$ [Edit a lib file (allowed)]
exit code: 0

$ [Bash: cd into the folder, then sed -i]
guard-migrations: shell command would modify db/migrations/ ("sed -i '' s/40/80/ 002_add_task_estimate.sql"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Bash: session cwd is the folder]
guard-migrations: shell command would modify db/migrations/ ("rm 001_create_tasks.sql"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Bash: 1> redirect]
guard-migrations: shell command would modify db/migrations/ ("echo x 1>db/migrations/001_create_tasks.sql"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Bash: &> redirect]
guard-migrations: shell command would modify db/migrations/ ("echo x &>db/migrations/001_create_tasks.sql"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Edit with different case (same file on APFS)]
guard-migrations: DB/Migrations/001_create_tasks.sql is an applied migration (committed) and must not change. Create db/migrations/003_<what>.sql instead.
exit code: 2

$ [Bash: 2>&1 and a read (allowed)]
exit code: 0

$ [Bash: repair from HEAD (allowed)]
exit code: 0

$ [Bash: restore from an older commit]
guard-migrations: shell command would modify db/migrations/ ("git restore --source=HEAD~1 -- db/migrations/001_create_tasks.sql"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Edit an applied migration, payload starts with a BOM]
guard-migrations: db/migrations/001_create_tasks.sql is an applied migration (committed) and must not change. Create db/migrations/003_<what>.sql instead.
exit code: 2

$ [Malformed JSON payload (fail closed)]
guard-migrations: could not parse the hook payload, so the call is blocked to be safe (fail closed).
exit code: 2

$ [Bash: replay of A/B run B1: shell heredoc creating 003 (blocked; use Write)]
  command: cat > db/migrations/003_raise_estimate_limit.sql <<EOF
create table x (id int);
EOF
guard-migrations: shell command would modify db/migrations/ ("cat > db/migrations/003_raise_estimate_limit.sql <<EOF"). Applied migrations are immutable; add db/migrations/003_<what>.sql with the Write tool instead.
exit code: 2

$ [Bash: known limit: ls | xargs (pre exits 0)]
  command: ls db/migrations/001* | xargs perl -pi -e s/120/200/
exit code: 0

$ [Bash: known limit: find -exec (pre exits 0)]
  command: find db/migrations -name '001*' -exec perl -pi -e s/120/200/ {} +
exit code: 0

$ [Bash: known limit: node -e (pre exits 0)]
  command: node -e "require('fs').appendFileSync('db/migrations/001_create_tasks.sql', '-- x')"
exit code: 0

$ [Bash: known limit: python -c (pre exits 0)]
  command: python3 -c "open('db/migrations/002_add_task_estimate.sql', 'a').write('-- x')"
exit code: 0

$ [guard-env: Read .env.example (allowed)]
exit code: 0

$ [guard-env: Read .env.staging]
guard-env: .env.staging may hold secrets. Agents read and write only .env.example (AGENTS.md rule 4).
exit code: 2

$ [guard-env: Grep with path .env]
guard-env: Grep on .env, which may hold secrets. Agents read and write only .env.example (AGENTS.md rule 4).
exit code: 2

$ [guard-env: Grep with glob .env*]
guard-env: Grep glob ".env*" targets .env files. Agents read and write only .env.example (AGENTS.md rule 4).
exit code: 2

$ [guard-env: Grep over the project (allowed: the Grep tool skips gitignored .env files)]
exit code: 0

$ [guard-env: Bash: cat .env ]
guard-env: the command names .env, which may hold secrets. Agents read and write only .env.example (AGENTS.md rule 4).
exit code: 2

$ [guard-env: Bash: source ./.env.local && npm test ]
guard-env: the command names ./.env.local, which may hold secrets. Agents read and write only .env.example (AGENTS.md rule 4).
exit code: 2

$ [guard-env: Bash: cat .env.example (allowed)]
exit code: 0

$ [guard-env: Bash: rg SECRET . (allowed: rg skips gitignored files)]
exit code: 0

-- 003 written but not committed --
$ [clone: Edit the uncommitted 003 (allowed)]
exit code: 0

$ [clone: Write the next one, 004 (allowed)]
exit code: 0

$ [clone: post check after: only a new 003 exists (allowed)]
exit code: 0

-- the known-limit commands, run for real --
ran: ls db/migrations/001* | xargs perl -pi -e s/120/200/
$ [clone: post check after: ls db/migrations/001* | xargs perl -pi -e s/120/200/]
guard-migrations: Bash changed applied migration(s): M 001_create_tasks.sql. Applied migrations are immutable. Undo it now: git restore --source=HEAD --staged --worktree -- db/migrations/001_create_tasks.sql — then put the schema change into db/migrations/004_<what>.sql.
exit code: 2

ran: find db/migrations -name '001*' -exec perl -pi -e s/120/200/ {} +
$ [clone: post check after: find db/migrations -name '001*' -exec perl -pi -e s/120/200/ {} +]
guard-migrations: Bash changed applied migration(s): M 001_create_tasks.sql. Applied migrations are immutable. Undo it now: git restore --source=HEAD --staged --worktree -- db/migrations/001_create_tasks.sql — then put the schema change into db/migrations/004_<what>.sql.
exit code: 2

ran: node -e "require('fs').appendFileSync('db/migrations/001_create_tasks.sql', '-- x')"
$ [clone: post check after: node -e "require('fs').appendFileSync('db/migrations/001_create_tasks.sql', '-- x')"]
guard-migrations: Bash changed applied migration(s): M 001_create_tasks.sql. Applied migrations are immutable. Undo it now: git restore --source=HEAD --staged --worktree -- db/migrations/001_create_tasks.sql — then put the schema change into db/migrations/004_<what>.sql.
exit code: 2

ran: python3 -c "open('db/migrations/002_add_task_estimate.sql', 'a').write('-- x')"
$ [clone: post check after: python3 -c "open('db/migrations/002_add_task_estimate.sql', 'a').write('-- x')"]
guard-migrations: Bash changed applied migration(s): M 002_add_task_estimate.sql. Applied migrations are immutable. Undo it now: git restore --source=HEAD --staged --worktree -- db/migrations/002_add_task_estimate.sql — then put the schema change into db/migrations/004_<what>.sql.
exit code: 2

$ [clone: post check after: rm of 001]
guard-migrations: Bash changed applied migration(s): D 001_create_tasks.sql. Applied migrations are immutable. Undo it now: git restore --source=HEAD --staged --worktree -- db/migrations/001_create_tasks.sql — then put the schema change into db/migrations/004_<what>.sql.
exit code: 2

$ [clone: post check with a malformed payload still runs (git, not the payload)]
guard-migrations: unknown tool changed applied migration(s): D 001_create_tasks.sql. Applied migrations are immutable. Undo it now: git restore --source=HEAD --staged --worktree -- db/migrations/001_create_tasks.sql — then put the schema change into db/migrations/004_<what>.sql.
exit code: 2

$ [clone: post check after: restore --source=HEAD (clean again)]
exit code: 0

-- a secret .env exists (clone only, fake value) --
$ [guard-env: Bash: grep -rn SECRET . ]
guard-env: "grep -rn SECRET ." would also search the project's .env files. Use the Grep tool or plain rg (both skip .env via .gitignore), or add --exclude='.env*'. Agents read and write only .env.example (AGENTS.md rule 4).
exit code: 2

$ [guard-env: Bash: grep -rn SECRET . --exclude=.env* (allowed)]
exit code: 0

$ [guard-env: Bash: rg -uu SECRET . ]
guard-env: "rg -uu SECRET ." would also search the project's .env files. Use the Grep tool or plain rg (both skip .env via .gitignore), or add --exclude='.env*'. Agents read and write only .env.example (AGENTS.md rule 4).
exit code: 2
```

## 3. Log (`.claude/hooks/guard-migrations.log`, same run, main checkout only)

```text
2026-11-26T01:33:07.644Z pre BLOCK Edit db/migrations/001_create_tasks.sql
2026-11-26T01:33:07.676Z pre BLOCK Write db/migrations/002_add_task_estimate.sql
2026-11-26T01:33:07.707Z pre BLOCK Bash "sed -i '' s/120/200/ db/migrations/001_create_tasks.sql"
2026-11-26T01:33:07.737Z pre BLOCK Bash "rm db/migrations/002_add_task_estimate.sql"
2026-11-26T01:33:07.767Z pre BLOCK Bash "echo 'alter table tasks add x' >> db/migrations/002_add_task_estimate.sql"
2026-11-26T01:33:07.797Z pre BLOCK Write db/migrations/005_add_description.sql
2026-11-26T01:33:07.828Z pre ALLOW Write db/migrations/003_add_task_description.sql
2026-11-26T01:33:07.944Z pre BLOCK Bash "sed -i '' s/40/80/ 002_add_task_estimate.sql"
2026-11-26T01:33:07.974Z pre BLOCK Bash "rm 001_create_tasks.sql"
2026-11-26T01:33:08.004Z pre BLOCK Bash "echo x 1>db/migrations/001_create_tasks.sql"
2026-11-26T01:33:08.034Z pre BLOCK Bash "echo x &>db/migrations/001_create_tasks.sql"
2026-11-26T01:33:08.064Z pre BLOCK Edit DB/Migrations/001_create_tasks.sql
2026-11-26T01:33:08.151Z pre BLOCK Bash "git restore --source=HEAD~1 -- db/migrations/001_create_tasks.sql"
2026-11-26T01:33:08.182Z pre BLOCK Edit db/migrations/001_create_tasks.sql
2026-11-26T01:33:08.206Z pre BLOCK unparsable payload
2026-11-26T01:33:08.238Z pre BLOCK Bash "cat > db/migrations/003_raise_estimate_limit.sql <<EOF"
```

## 4. Known limits

The pre check parses shell text; it is best effort. These exit 0 **before** the call (see section 2,
`known limit: …`), and the post check catches the result **after** it, with exit 2 and the restore command:

| Command shape | Why the pre check misses it |
|---|---|
| `ls db/migrations/001* \| xargs sed -i …` | file names arrive on stdin, not as arguments |
| `find db/migrations -name '001*' -exec sed -i … {} +` | the writer is an argument of `find` |
| `node -e "fs.appendFileSync('db/migrations/…')"` | the write is inside another language |
| `python -c "open('db/migrations/…', 'a').write(…)"` | same |

So for these the file **does** change, and the agent has to run the `git restore --source=HEAD …` it is given.
The post check covers only applied files; it does not see a wrongly named new migration created this way.

`guard-env` has the same kind of limit with no backstop: `node -e "…readFileSync('.e'+'nv')"`, `find . -exec cat {} +`,
`git grep --untracked` and similar indirect reads are not caught. The Grep tool over a folder is safe only because
`.env` / `.env.*` are in `.gitignore`: checked on 2026-11-26 with Claude Code 2.1.332 in a scratch folder, Grep returned
a hidden `.env` when it was not git-ignored and skipped it when it was. Keep those lines in `.gitignore`.

## 5. Payload handling: fail closed

Both hooks strip a leading BOM. A payload that is still not valid JSON **blocks** the call (exit 2, "could not parse
the hook payload … fail closed"): a hook that can't read the call can't say it is safe. In `post` mode
`guard-migrations` runs its git check anyway, because that check doesn't need the payload. The cost: if Claude Code ever
changes the payload format, every matched tool call is blocked until the hooks are fixed. That is loud and quick to see,
which is what we want from a guard.
