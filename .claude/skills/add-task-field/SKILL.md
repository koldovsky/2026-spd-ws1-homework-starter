---
name: add-task-field
description: Add a new optional field to a task (database column, domain rule, API validation, tests). Use when a ticket asks to store or validate a new task property.
---
<!-- owner: @vovchik-manko · why: adding a task field touched four layers in different orders and tests were missing · review-by: 2027-03-31 -->

# Add a task field

Follow the steps in order. Stop and ask if a step does not fit the ticket.

1. **Read the ticket and the acceptance criteria.** Note the exact allowed values and the exact error message.
2. **Add the column.** If the field needs storage, add a new migration file in `db/migrations/` (see the migrations rule). Do not edit an applied migration.
3. **Change the domain.** In `lib/tasks.ts`, update the `Task` interface, the input type of `createTask`, the validation in `createTask`, and `toTask`. Throw `RuleViolation` for a rejected value.
4. **Keep the route thin.** In `app/api/tasks/route.ts`, `RuleViolation` must map to 422 and nothing else. Do not add validation there.
5. **Write one test per acceptance case** in `lib/tasks.test.ts`: each accepted value, each rejected value with its message, and the case where the field is omitted.
6. **Run the checks.** `npm test` and `npm run typecheck` must both pass.
7. **Report.** List the changed files, the test results, and any acceptance case that you could not cover.

**Check before you finish:** no applied migration changed, every acceptance case has a test, and both commands are green.
