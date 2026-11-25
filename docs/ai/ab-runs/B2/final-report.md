Tasks now have a `priority` field: `low`, `medium` or `high`, defaulting to `medium`. `npm test` passed (tests went from 4 to 13) and `npm run typecheck` passed. Nothing is committed.

**Files changed**
- **`db/migrations/003_add_task_priority.sql`** (new): adds the `priority` column, required, default `'medium'`, and the database only accepts the three allowed values. No existing migration was touched; `git status` shows this as the only new migration file.
- **`lib/tasks.ts`**: adds the field to `Task` and as an optional input to `createTask`. A bad value throws `RuleViolation("priority must be low, medium or high")` before anything is saved, and the value is saved and returned on every read. The code check and the database check allow the same three values.
- **`lib/tasks.test.ts`**: tests that an omitted priority becomes `medium`, that each of the three values is accepted, and that five bad values are rejected with that message and nothing saved: `"urgent"`, `"HIGH"`, `""`, `1`, `null`.

**API:** `POST /api/tasks` already passes the request body to `createTask`, so the route didn't change. A bad priority gets a 422 with the message above, and every task in `GET` and `POST` responses now includes `priority`.

**Decision for you:** only a missing priority gets the default. An explicit `null` is rejected with a 422 rather than quietly turned into `medium`. If clients should be able to send `null` to mean "use the default", it's a one-line change.

**Still open**
- **Changing priority later:** `PATCH /api/tasks/[id]` only changes status, so priority can't be updated after a task is created. Say if you want that.
- **UI:** no UI changes.
- **Not run against the live app:** I didn't check the 422/201 responses with real HTTP requests. The team agreement expects a `curl` run for each status code in the PR.
- **Rollback note for the PR:** an undo would rebuild the `tasks` table without the `priority` column.
- **Review:** new migrations are level L2 in `docs/ai/team-agreement.md`, so the harness owner reviews every line.
