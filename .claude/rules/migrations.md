---
paths:
  - "db/migrations/**"
---
<!-- owner: @IgorPetr · why: applied migrations already ran on other machines; editing them makes databases diverge silently, because lib/db.ts skips a file once its name is in schema_migrations · review-by: 2027-02-24 -->

# Migrations

- Applied migrations are immutable. `001_create_tasks.sql` and `002_add_task_estimate.sql` never change. Fix a mistake with a new file.
- File name: `NNN_short_description.sql`, next free three-digit number. `lib/db.ts` applies files in name order.
- One change per file. SQLite only: use `alter table ... add column`, with a `check` where the rule is in `lib/tasks.ts`.
- If a migration adds a constraint, mirror it in `lib/tasks.ts` (the app rule) and in `lib/tasks.test.ts`.
- Applied = tracked in git. A migration you just created and have not committed can still be fixed; a committed one cannot. A hook enforces this for Edit, Write and Bash.
- Check: `npm test` (it applies every migration to a fresh in-memory DB), `npm run typecheck`, `git diff --stat -- db/migrations` (only new files). Use the `add-migration` skill for the full procedure.
