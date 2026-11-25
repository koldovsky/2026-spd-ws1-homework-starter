Tasks now have a `priority` field (`low` / `medium` / `high`, defaulting to `medium`). It is validated when a task is created and comes back in the API responses. `npm test` passes (13 tests, up from 4) and `npm run typecheck` exits 0.

**What changed**
- **`db/migrations/003_add_task_priority.sql`** (new file; no existing migration was touched): adds a `priority` column that can't be empty, defaults to `'medium'`, and has a database check allowing only `'low'`, `'medium'` and `'high'`.
- **`lib/tasks.ts`**:
  - The list of allowed values (`PRIORITIES`) and a `Priority` type are defined once, and `Task` gains `priority`.
  - `createTask` takes an optional `priority`. Any value outside the three throws `RuleViolation("priority must be low, medium or high")`, which the route turns into a 422.
  - The value is saved, or `"medium"` if none was given, and it is included whenever a task is read back.
- **`lib/tasks.test.ts`**: 9 new tests:
  - Leaving `priority` out gives `medium`.
  - Each of the three values is stored and returned.
  - Five bad values (`"urgent"`, `"HIGH"`, `""`, `null`, `2`) are each rejected with the message above, and nothing is saved.
- **API**: no route changes were needed. `POST /api/tasks` already passes the request body to `createTask`, so it accepts `priority`, and `GET` returns it.

The code check and the database check accept the same three values.

**Still open**
- **Editing priority:** you can't change it after creation. `PATCH /api/tasks/[id]` only changes status, and you didn't ask for priority to be editable.
- **UI:** nothing shows or sets priority in the interface yet.
- **Database checks:** the new database check is mirrored by the code check, so I didn't write a test that bypasses the code to hit it directly.
- **HTTP check:** I didn't run `curl` against the routes. The team agreement asks for proof of each status code in the PR for route changes, and there were no route changes here.
- **For the PR:**
  - New migrations need line-by-line sign-off from the harness owner.
  - Rollback note: to undo, rebuild the `tasks` table without the `priority` column.

Nothing is committed yet.
