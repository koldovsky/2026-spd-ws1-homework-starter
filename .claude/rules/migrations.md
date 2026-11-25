---
paths:
  - "db/migrations/**"
---
<!-- owner: @RudyRoom1 · why: lib/db.ts applies each migration once by file name; an edited applied migration never reaches existing DBs · review-by: 2027-03-01 -->

# Migrations

- A migration tracked in git is **applied and immutable**. Never edit, rename or delete it (a hook blocks this).
- Every schema change is a **new file** `db/migrations/NNN_<snake_case_what>.sql`, where NNN = highest existing number + 1, zero-padded to 3.
- Plain SQLite SQL only, no transaction wrappers (`lib/db.ts` runs `db.exec` on the whole file).
- SQLite cannot alter or drop a `CHECK` constraint. To change one, rebuild the table in the new migration:
  `create table tasks_new (...)` → `insert into tasks_new select ... from tasks` → `drop table tasks` → `alter table tasks_new rename to tasks`. Keep every existing column.
- Keep the DB constraints and the validation in `lib/tasks.ts` in sync, and cover the new limits in `lib/tasks.test.ts`.
- Follow the procedure in `.claude/skills/add-migration/SKILL.md`.
