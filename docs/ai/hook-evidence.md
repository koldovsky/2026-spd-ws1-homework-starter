# Hook evidence — `.claude/hooks/protect-migrations.mjs`

<!-- owner: @JKord · why: homework requires proof the blocking hook actually fires · review-by: 2027-02-28 -->

Hook: `PreToolUse`, matcher `Edit|MultiEdit|Write`, registered in `.claude/settings.json` as
`node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-migrations.mjs"`. It blocks (exit 2, reason on stderr) an
Edit/Write of an **existing** file under `db/migrations/` or of any `.env` / `.env.*` file at any depth.

Environment: Windows 11, Node v25.2.1, Claude Code 2.1.227, 2026-11-19.

## 1. Direct hook tests (script run with sample payloads, per `docs/ai/hook-test.md`)

These test the script in isolation. They do **not** prove Claude Code invoked it — see section 3.

Quick manual run with the committed payload `docs/ai/sample-payload.json`:

```text
$ node .claude/hooks/protect-migrations.mjs < docs/ai/sample-payload.json
Blocked: "db/migrations/001_create_tasks.sql" is an applied DB migration and must not be edited. Create a new file db/migrations/00N_name.sql with the next free number instead — see .claude/rules/migrations.md.
$ echo $?
2
```

Full matrix: a throwaway Node runner (kept outside the repo, deleted afterwards) piped JSON payloads into the hook
with `CLAUDE_PROJECT_DIR` set to the repo root. Result: **24/24 PASS**. `<repo>` = the absolute repo path.

| # | Tool | `file_path` | Expected | Exit |
|---|---|---|---|---|
| 1 | Edit | `db/migrations/001_create_tasks.sql` | block | 2 |
| 2 | Edit | `./db/migrations/001_create_tasks.sql` | block | 2 |
| 3 | Edit | `db\migrations\002_add_task_estimate.sql` (Windows separators) | block | 2 |
| 4 | Edit | `<repo>\db\migrations\002_add_task_estimate.sql` (Windows absolute) | block | 2 |
| 5 | Edit | `C:/…/db/migrations/001_create_tasks.sql` (forward-slash absolute) | block | 2 |
| 6 | Edit | `app/../db/migrations/001_create_tasks.sql` (traversal) | block | 2 |
| 7 | Edit | `DB/Migrations/001_create_tasks.sql` (case variant, Windows) | block | 2 |
| 8 | MultiEdit | `db/migrations/001_create_tasks.sql` | block | 2 |
| 9 | Write | `db/migrations/001_create_tasks.sql` (overwrite) | block | 2 |
| 10 | Write | `db/migrations/003_add_task_priority.sql` (new) | allow | 0 |
| 11 | Write | `<repo>\db\migrations\003_add_task_priority.sql` (new, absolute) | allow | 0 |
| 12 | Edit | `.env` | block | 2 |
| 13 | Write | `.env.local` | block | 2 |
| 14 | Edit | `<repo>\.env` | block | 2 |
| 15 | Write | `app/.env.production` (nested) | block | 2 |
| 16 | Edit | `.ENV` (case variant, Windows) | block | 2 |
| 17 | Edit | `.env.example` (intentionally covered by `.env.*`) | block | 2 |
| 18 | Edit | `lib/tasks.ts` | allow | 0 |
| 19 | Edit | `docs/ai/ab-note.md` | allow | 0 |
| 20 | Edit | `<repo>\db\migrations\001_create_tasks.sql`, hook run with cwd = `app/` | block | 2 |
| 21 | Edit | BOM-prefixed payload (as Windows PowerShell pipes produce) | block | 2 |
| 22 | — | malformed payload `not json` | fail open | 0 |
| 23 | Bash | payload without `file_path` | allow | 0 |
| 24 | Edit → Write | temp file `db/migrations/999_tmp_probe.sql`: exists → after deletion | block → allow | 2 → 0 |

Representative stderr (identical wording for every migration block, path normalised to forward slashes):

```text
Blocked: "db/migrations/002_add_task_estimate.sql" is an applied DB migration and must not be edited. Create a new file db/migrations/00N_name.sql with the next free number instead — see .claude/rules/migrations.md.
Blocked: "app/.env.production" is an env file and may contain secrets. Agents never create or edit .env files — ask the repo owner (@JKord).
```

Bugs found and fixed during this validation (all re-tested above):
- PowerShell pipe adds a BOM → `JSON.parse` failed → hook failed open. Fixed by stripping the BOM (case 21).
- Case variants (`DB/Migrations/…`, `.ENV`) bypassed the check on Windows. Fixed with case-insensitive matching on `win32` (cases 7, 16).
- Relative hook command and cwd-relative paths could break after the agent `cd`s. Fixed with `$CLAUDE_PROJECT_DIR` (case 20).

The temp probe was deleted after the test; `db/migrations/` still contains only `001_` and `002_`, and
`git status db/` is clean. No `.env` file exists in the repo, so no secret was ever read.

## 2. Permission rules — what was and wasn't verified

| Rule in `.claude/settings.json` | Intended risk | Verified enforcement? |
|---|---|---|
| `deny` `Read(./.env)`, `Read(./.env.*)`, `Read(./**/.env)`, `Read(./**/.env.*)` | secrets leaking into context | **No** — see section 3 |
| `deny` `Bash(git push --force:*)`, `Bash(git push -f:*)` | rewriting shared history | not tested (destructive) |
| `deny` `Bash(rm -rf:*)` | mass deletion | not tested (destructive) |
| `ask` `Bash(npm run db:reset)` | wipes local DB | not tested |
| `ask` `Bash(git push:*)`, `Bash(npm install:*)` | outward-facing / supply chain | not tested |
| `ask` Edit/Write of `.claude/**`, `AGENTS.md`, `.github/CODEOWNERS` | agent changing its own guardrails | **No** — see section 3 |
| `allow` `Bash(npm test)`, `Bash(npm run typecheck)` | none — safe, read-only checks | not tested |

The file parses as valid JSON. Rule syntax follows the Claude Code permission format, but syntax alone is not
evidence of enforcement.

## 3. End-to-end Claude Code behaviour — NOT yet demonstrated

In the session used for this validation, `.claude/settings.json` was created **after** the session started.

- **Hook:** the agent wrote a new throwaway file `db/migrations/999_e2e_probe.sql` (allowed, correct), then
  edited it. The edit was **not blocked** — the hook did not run in this session. The file was deleted right away.
- **Deny:** `Read(.env)` returned "File does not exist" instead of a permission denial, so the deny rule was not
  applied in this session (no secret involved — the file doesn't exist).
- **Ask:** edits to `.claude/**` and `AGENTS.md` earlier in the same session did not prompt.

Most likely cause: project settings were not loaded by this already-running session. Not confirmed. Other
possibilities: Claude Code 2.1.227 is older than the required 2.1.281, or the project settings are not trusted
yet. HOMEWORK.md accepts the direct test in section 1 as evidence when project hooks don't fire.

The A/B note (`docs/ai/ab-note.md`) records that the hook never fired in the B runs. For the same reason, it is
not established that the hook and permissions were active during those runs; the skill, rule and `AGENTS.md`
influence is unaffected (the B agents read those files).

**To complete e2e evidence:** start a **new** session in the repo (after `claude update`), run `/hooks` to confirm
the hook is listed, ask the agent to edit `db/migrations/001_create_tasks.sql`, and paste the block message here.

## Known limits

- Covers file-edit tools only; a Bash command such as `sed -i` on a migration is not intercepted. CODEOWNERS
  review on `/db/migrations/` is the backstop.
- Fails open on a malformed payload (exit 0), so a broken payload never blocks unrelated work.
- `.env.example` is blocked too (it matches `.env.*`); changes to it go through a human, by design.
