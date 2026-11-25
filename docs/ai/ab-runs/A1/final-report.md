Tasks now have a `priority` field: `low`, `medium` or `high`, defaulting to `medium`. The 13 unit tests and the typecheck pass. I didn't call the API itself over HTTP. All changes are uncommitted.

**What changed:**
- **Database:** a new migration, `db/migrations/003_add_task_priority.sql`, adds the column. It defaults to `'medium'` and the database refuses any other value. Existing rows get `medium` the next time the app opens the database.
- **Validation:** in `lib/tasks.ts`, `createTask` uses `medium` when `priority` is left out. Any other value is rejected with "priority must be low, medium or high" and nothing is saved. That includes `null`, `"HIGH"`, `"urgent"`, `""` and numbers.
- **API:** every task returned now includes `priority`. `POST /api/tasks` accepts it, and a bad value gets a 422 with the message above, the same as the other rules. I didn't need to change the route file, because it already passes the request body to `createTask`.
- **Tests:** in `lib/tasks.test.ts`, one test checks the default and one checks each valid value. Another rejects each bad value and confirms nothing was stored.

**Decisions for you:**
- **`null` is rejected:** only leaving the field out gives `medium`. If clients will send `"priority": null` to mean "use the default", it's a one-line change to accept it.
- **No way to change priority yet:** it can only be set when a task is created. `PATCH /api/tasks/[id]` still only handles status. I can add priority changes there if you want.
- **Not on the page:** the task list on the home page doesn't show priority yet.

This isn't the TASK-7 ticket, so I didn't follow its branch, spec and evidence steps. Tell me if this should go through that process.
