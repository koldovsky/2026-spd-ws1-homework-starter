// owner: @vvfesik · why: the team agreement's L0 row forbids editing an applied migration — lib/db.ts skips
// files already recorded in schema_migrations, so an edit never re-runs and fresh checkouts diverge from
// existing DBs; this hook blocks that at the tool-call level · review-by: 2027-02-25
// PreToolUse hook: reads a JSON payload on stdin, exit 2 = block, stderr = reason shown to the agent.
import { readFileSync, existsSync } from "node:fs";

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // unparseable payload — don't block on our own bugs
}

const MIGRATIONS_RE = /(^|\/)db\/migrations\/[^/]+\.sql$/;
const file = payload?.tool_input?.file_path ?? "";
const tool = payload?.tool_name ?? "";

if (!["Edit", "Write", "NotebookEdit"].includes(tool) || !MIGRATIONS_RE.test(file)) {
  process.exit(0);
}

// Edit targets an existing file by definition. Write/NotebookEdit on a path that does not
// exist yet is creating a NEW migration — that is the legitimate L2 "fix forward" path, allow it.
if (tool !== "Edit" && !existsSync(file)) {
  process.exit(0);
}

console.error(
  `BLOCKED: ${tool} on ${file}. Applied migrations are immutable (team agreement L0): ` +
    `lib/db.ts records applied files in schema_migrations and skips them, so an edit never re-runs ` +
    `and fresh checkouts diverge from existing DBs. Fix forward: add a new migration ` +
    `(next number in db/migrations/, e.g. 003_<what>.sql) and run \`npm run db:reset && npm test\`.`
);
process.exit(2);
