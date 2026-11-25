Tasks now have a `priority` field (`low`, `medium` or `high`, default `medium`), and the API accepts and returns it. All 13 tests pass and typecheck is clean. I didn't start the server to try the endpoints over HTTP, and nothing is committed.

**Changes:**
- **`db/migrations/003_add_task_priority.sql`**: adds the `priority` column, which can't be empty, defaults to `'medium'`, and has a database check limiting it to the three values. Rows that already exist get `medium`. Migrations run automatically on startup.
- **`lib/tasks.ts`**: `Task` now has a `priority` field. `createTask` rejects any value other than the three allowed ones with `priority must be low, medium or high`. Leaving `priority` out gives `medium`, but sending `null` is rejected as invalid.
- **API**: no route changes were needed. `POST /api/tasks` already passes the request body to `createTask`, so a bad priority gets a **422**, like the other validation errors. `GET /api/tasks` and `PATCH /api/tasks/:id` now include `priority` in their responses.
- **`lib/tasks.test.ts`**: new tests check the default, that each valid value is accepted and stored, and that bad values (`"urgent"`, `"HIGH"`, `""`, `null`, `1`) are rejected with nothing saved.

**Not included:** there's no way to change a task's priority after it's created, because `PATCH` still only handles `status`. I can add that if you want it.

**Process note:** `docs/tickets/TASK-7.md` describes a workflow for ticketed work: a `TASK-N-<slug>` branch, a spec, `Refs:` commit trailers and an evidence file. This request has no ticket, so I didn't set any of that up. Tell me if you want it.
