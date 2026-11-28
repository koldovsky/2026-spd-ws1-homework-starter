---
name: add-migration
description: Add a database schema change (new column, table, index or constraint) to the Team Tasks app. Use whenever a task needs the tasks table or any other table to change.
---
<!-- owner: @evgenyadev · why: schema changes touch four places (SQL, type, mapping, validation) and the common miss is a DB check with no matching app check, which turns into a 500 · review-by: 2027-02-20 -->

# Add a migration

## Steps

1. **Find the next number.** `ls db/migrations` and take the highest `NNN` plus one. Never reuse or edit an existing file.
2. **Write the SQL** in `db/migrations/NNN_<what_it_does>.sql`. SQLite: `alter table ... add column` with an
   inline `check (...)` and a `default` if existing rows need a value. Read `.claude/rules/migrations.md` for limits.
3. **Mirror it in `lib/tasks.ts`:**
   - add the field to the `Task` interface;
   - map the snake_case column in `toTask`;
   - accept it in `createTask` input and insert it;
   - validate the same range or enum as the `check`, throwing `RuleViolation` (→ 422 in the API).
4. **Test the edges in `lib/tasks.test.ts`:** one valid value, one just outside each bound or one unknown enum value,
   and the default when the field is omitted.
5. **Check the API layer.** `app/api/tasks/route.ts` passes the body through; confirm a wrong type is a 4xx, not a 500.

## Check — all must hold

```bash
npm test && npm run typecheck
git status --porcelain db/migrations
```

- tests and typecheck are green (tests open a fresh in-memory DB, so every migration runs from scratch);
- `git status` lists only the new file, as `?? db/migrations/NNN_...sql` (or `A` if staged). An `M` or `D` line means an
  applied migration changed: revert it.

If you ran `npm run dev` before, `npm run db:reset` rebuilds the local DB (asks first: it deletes local data).

Report the new file name and the test names you added.
