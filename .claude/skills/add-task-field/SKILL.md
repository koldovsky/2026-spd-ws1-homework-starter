---
name: add-task-field
description: Add a new field to tasks end to end (migration, type, validation, storage, API, tests). Use when a ticket asks for a new task attribute such as priority, due date or tags.
---

<!-- owner: @SayidJarrah · why: every new task attribute touches the same 6 places; missing one (usually toTask or the 422 path) ships a field that is stored but never returned, or a 500 instead of a validation error · review-by: 2027-05-25 -->

# Add a field to tasks

Input: field name (camelCase in TS, snake_case in SQL), type, allowed values, default, required or optional.
If any of these is unclear, ask before writing code.

## Steps

1. **Migration** — new file `db/migrations/NNN_add_task_<field>.sql`, next free number
   (follow `.claude/rules/migrations.md`):
   `alter table tasks add column <field> <type> [not null default <v>] check (...);`
   Never edit an existing migration.
2. **Type** — add the field to `Task` in `lib/tasks.ts`; add it as optional to `createTask`'s `input`.
   For a fixed set of values export `const <FIELD>S = [...] as const` and derive the type from it.
3. **Validation** — in `createTask`, before the insert: if the value is present and invalid, throw
   `new RuleViolation("<field> must be ...")`. Check the runtime value: API bodies are untyped JSON.
4. **Storage** — add the column to the `insert` statement and pass the value or its default.
5. **Read path** — map the column in `toTask` (`row.<snake>` → `<camel>`). Easy to miss: without it the field
   is stored but never returned.
6. **API** — `POST /api/tasks` passes the body to `createTask`, so usually nothing to change. If the field must
   be editable, extend `PATCH /api/tasks/[id]` and keep `RuleViolation` → 422.
7. **Tests** in `lib/tasks.test.ts`: the default when omitted; each allowed value (or both boundaries);
   at least two invalid values, each rejected with the message and nothing stored (`listTasks` length 0).

## Check (all must hold before you say done)

```bash
npm test
```

```bash
npm run typecheck
```

- Both exit 0; the new tests are in the output.
- `git status` shows exactly one new file in `db/migrations/` and no changed ones.
- The DB `check` and the `RuleViolation` accept the same values.
- Report: files changed, test count before → after, anything left open (UI, PATCH).
