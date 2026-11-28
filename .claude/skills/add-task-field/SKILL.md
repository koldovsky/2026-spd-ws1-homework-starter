---
name: add-task-field
description: Adds a new optional field to tasks end to end (migration, domain, API, test). Use when the team decides tasks need another attribute, e.g. priority, due date, tags.
---

<!-- owner: @JKord · why: the same four-step change was done by hand for estimateHours and every new field risked missing one of the layers · review-by: 2027-02-28 -->

# Add a field to tasks

Example: `priority` (`low | medium | high`, default `medium`).

1. **Migration** — create `db/migrations/00N_add_task_<field>.sql` (next free number; never edit existing files):
   `alter table tasks add column <field> <type> check (<constraint>);`
2. **Domain** — `lib/tasks.ts`: add the type, the field to `Task`, optional input on `createTask` with validation
   (`RuleViolation` for invalid values), an update function if the field is mutable, and map the column in `toTask`.
3. **API** — `app/api/tasks/**`: accept the field in POST/PATCH, validate it before the lib call
   (400/422 mirroring the existing title handling), pass it through.
4. **Test** — `lib/tasks.test.ts`: default value, explicit value, invalid value throws `RuleViolation`,
   update persists, missing task throws.

**Check:** `npm test && npm run typecheck` — all green. (`npm test` opens an in-memory DB and replays every
migration, including the new one; the local dev DB picks the new migration up on the next start.)
If the hook blocks a migration edit, you are editing an existing file — create a new one instead.
