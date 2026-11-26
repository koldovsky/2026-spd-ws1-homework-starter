# Hook evidence — `.claude/hooks/protect-migrations.mjs`

<!-- owner: @JKord · why: homework requires proof the blocking hook actually fires · review-by: 2027-02-28 -->

**Update 2026-11-26 — Bash coverage.** The PreToolUse matcher is now `Edit|MultiEdit|Write|Bash`: a Bash command
that names a `.env` / `.env.*` file (`cat .env`, `cp .env.local …`) is blocked with exit 2. A second hook,
`PostToolUse` with matcher `*` → `.claude/hooks/check-migrations-unchanged.mjs`, runs
`git diff --name-only --no-renames --diff-filter=MD HEAD -- db/migrations/` after every tool. If a committed
migration was modified or deleted by any tool (`echo x>…`, `sed -i …`, `cd db/migrations && sed -i …`, MCP tools),
it exits 2 and tells the agent to restore the file. PostToolUse cannot undo the write. It is a detector that fires
on the very next tool result, not a pre-blocker. Covered by `.claude/hooks/protect-migrations.test.ts` (12/12 pass
with `npm test`, 2026-11-26): Bash `.env` commands → 2, look-alikes (`process.env.HOME`, `config.envrc`) → 0, and
in a throwaway git repo a new migration → 0, a modified or deleted committed migration → 2.

Hook: `PreToolUse`, matcher `Edit|MultiEdit|Write` (original scope, see the update above), registered in `.claude/settings.json` as
`node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-migrations.mjs"`. It blocks (exit 2, reason on stderr) an
Edit/Write of a **git-tracked** file under `db/migrations/` or of any `.env` / `.env.*` file at any depth.
"Git-tracked" (not merely existing): a migration the agent created a minute ago is still untracked, so it stays
editable until committed — blocking it made the hook unusable for legitimate new-migration work. If git itself
fails (no binary, not a repo), the hook falls back to blocking any existing file under `db/migrations/`.

Environment: Windows 11, Node v25.2.1, Claude Code 2.1.227 → 2.1.331 (`claude update` run 2026-11-24), hook
evidence dated 2026-11-19 (direct tests) and 2026-11-24 (live session block, section 3).

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
with `CLAUDE_PROJECT_DIR` set to the repo root. Result: **24/24 PASS** on 2026-11-19 against the "existing file"
semantics. Cases 10, 11 and 24 involve *new* migrations; under the git-tracked semantics (2026-11-24) their
expected results change as marked in the table, and they were re-verified with the updated runner. `<repo>` =
the absolute repo path.

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
| 24 | Edit → Write | temp file `db/migrations/999_tmp_probe.sql`: exists (untracked) → after deletion | ~~block~~ → allow (git-tracked semantics) | ~~2~~ → 0 → 0 |

Representative stderr (identical wording for every migration block, path normalised to forward slashes):

```text
Blocked: "db/migrations/002_add_task_estimate.sql" is an applied DB migration and must not be edited. Create a new file db/migrations/00N_name.sql with the next free number instead — see .claude/rules/migrations.md.
Blocked: "app/.env.production" is an env file and may contain secrets. Agents never create or edit .env files — ask the repo owner (@JKord).
```

Bugs found and fixed during this validation (all re-tested above):
- PowerShell pipe adds a BOM → `JSON.parse` failed → hook failed open. Fixed by stripping the BOM before parsing (case 21).
- Case variants (`DB/Migrations/…`, `.ENV`) bypassed the check on Windows. Initially fixed with case-insensitive matching on `win32` only; that still failed open on macOS (APFS is case-insensitive by default too). Fixed by lowercasing the match keys unconditionally — safe on case-sensitive FS as well, since blocking still requires `existsSync()` with the original casing (cases 7, 16).
- Relative hook command and cwd-relative paths could break after the agent `cd`s. Fixed with `$CLAUDE_PROJECT_DIR` (case 20).
- Blocking "existing" files also blocked a migration the agent had created a minute earlier (it exists as soon as
  it is written, but is not committed yet). Fixed by blocking only git-tracked files: the lookup asks
  `git ls-files -- ":(icase)<path>"` — icase because `fs.realpathSync` does not normalise casing on Windows/macOS,
  so a wrong-case path must still match the tracked file (case 7 re-verified).

The regressions above are also covered by automated tests: `.claude/hooks/protect-migrations.test.ts`
(`npx vitest run`, included in `npm test`) pipes payloads into the hook and asserts exit codes: wrong-case
migration path → 2 (skipped on case-sensitive FS, where that path genuinely does not exist), BOM-prefixed
payload → 2, `.ENV` → 2, new migration → 0, existing-but-untracked migration → 0 (a temp file created and
deleted by the test). 9/9 pass as of 2026-11-24.

The temp probe was deleted after the test; `db/migrations/` still contains only `001_` and `002_`, and
`git status db/` is clean. No `.env` file exists in the repo, so no secret was ever read.

## 2. Permission rules — what was and wasn't verified

| Rule in `.claude/settings.json` | Intended risk | Verified enforcement? |
|---|---|---|
| `deny` `Read(./.env)`, `Read(./.env.*)`, `Read(./**/.env)`, `Read(./**/.env.*)` | secrets leaking into context | **No** — see section 3 |
| `deny` `Bash(git push *--force*)`, `Bash(git push -f:*)`, `Bash(git push * -f)`, `Bash(git push * -f *)` | rewriting shared history | not tested (destructive) |
| `deny` `Bash(rm *-rf*)`, `Bash(rm *-fr*)` | mass deletion | not tested (destructive) |
| `ask` `Bash(npm run db:reset)` | wipes local DB | not tested (A/B runs were headless — see the A/B note) |
| `ask` `Bash(git push:*)`, `Bash(npm install:*)` | outward-facing / supply chain | not tested |
| `ask` `Edit(./.claude/**)`, `Edit(./AGENTS.md)`, `Edit(./.github/CODEOWNERS)` (Edit rules cover Write/MultiEdit, so no separate `Write` rules) | agent changing its own guardrails | **No** — see section 3 |
| `ask` `Edit(./db/migrations/**)` | permission-layer backstop to the hook, matches the matrix's L2 "ask before acting" for migrations | **No** — see section 3 |
| `allow` `Bash(npm test)`, `Bash(npm run typecheck)` | none — safe, read-only checks | not tested |

The file parses as valid JSON. Rule syntax follows the Claude Code permission format, but syntax alone is not
evidence of enforcement.

## 3. End-to-end Claude Code behaviour

**Hook — demonstrated live (2026-11-24).** In a session started *after* `.claude/settings.json` existed, the
agent was asked to edit an applied migration. The edit was blocked by the hook before the tool ran, with the
message pasted verbatim from the session:

```text
PreToolUse:Edit hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-migrations.mjs"]: Blocked: "db/migrations/001_create_tasks.sql" is an applied DB migration and must not be edited. Create a new file db/migrations/00N_name.sql with the next free number instead — see .claude/rules/migrations.md.
```

The file was not modified (`git status db/` stayed clean). Caveat: that session's binary was 2.1.227 at start;
`claude update` to 2.1.331 was run the same day. The earlier session (2026-11-19), in which settings were created
mid-session, showed none of the below — the hook did not run, `Read(.env)` returned "File does not exist" instead
of a permission denial, and edits to `.claude/**`/`AGENTS.md` did not prompt. Most likely cause: project settings
are only loaded at session start.

**Deny / ask — still not demonstrated.** `Read(.env)` cannot be tested without a real `.env` (intentionally
absent), and `ask` prompts are not observable from headless runs (the A/B runs were launched with `claude -p`,
see the A/B note).

**To complete e2e evidence:** in a fresh interactive session on 2.1.331+, run `/hooks` (hook listed) and `/memory`
(`AGENTS.md` listed), and trigger an `ask` rule (e.g. ask the agent to edit `AGENTS.md`).

## Known limits

- Migrations: Edit/Write is blocked *before* the write. A Bash or MCP write (`sed -i`, `echo >`) is only
  *detected after* it runs, by the PostToolUse hook, which tells the agent to restore. CODEOWNERS review on
  `/db/migrations/` stays the final backstop.
- `.env`: the `Read(...)` deny rules apply to the Read tool (Claude Code applies them best-effort to Grep/Glob as
  well). Bash is covered only when the command names the file. A recursive `grep -rn SECRET .` that never mentions
  `.env` is not caught. No `.env` exists in this repo, which limits the exposure.
- Fails open on a malformed payload (exit 0), so a broken payload never blocks unrelated work.
- `.env.example` is blocked too (it matches `.env.*`); changes to it go through a human, by design.
