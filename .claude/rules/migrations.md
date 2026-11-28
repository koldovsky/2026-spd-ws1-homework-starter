---
paths:
  - "db/migrations/**"
---

<!-- owner: @Bondarenko199 · why: an applied migration was edited once and a teammate's DB silently diverged; migrations are now immutable by rule and by hook · review-by: 2027-02-22 -->

# Migration files rule

Loads only when working in `db/migrations/**`.

- **Never edit a committed `db/migrations/*.sql` file** (one tracked in git — it may already be applied to someone's
  database; editing it makes applied schemas diverge from the repo). Always add a new numbered migration
  (`003_*.sql`, `004_*.sql`, …). A brand-new, **uncommitted** migration can be fixed in place while you are authoring it.
- The `protect-migrations` PreToolUse hook (`.claude/hooks/protect-migrations.mjs`) blocks edits to git-tracked
  migration files with exit code 2 (fail-closed: if the git check errors, it blocks). Creating or fixing an
  **untracked** migration file is allowed and is the intended path. Do **not** `git add` a migration before
  `npm test` is green — once tracked, it is immutable.
- Follow the add-migration skill: `.claude/skills/add-migration/SKILL.md` (numbering, fresh-DB check, rollback note).
- One concern per migration; the filename says what it does (`003_add_task_priority.sql`, not `003_fixes.sql`).
- Destructive SQL (`drop`, `delete` without `where`) needs a rollback note in the PR description.
