// owner: @edvardino · why: lib/db.ts tracks migrations by name only, so editing an applied file never re-runs it and DBs drift silently · review-by: 2027-03-01
// PreToolUse hook: blocks edits to EXISTING files in db/migrations/ (exit 2). New files are allowed.
import { existsSync, appendFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? join(here, "..", ".."));

let payload = {};
try {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  payload = JSON.parse(raw || "{}");
} catch {
  process.exit(0); // unparseable input: do not block unrelated work
}

const target = payload.tool_input?.file_path;
const log = (decision) =>
  appendFileSync(join(here, "hook.log"), `${new Date().toISOString()} ${payload.tool_name ?? "?"} ${target ?? "-"} ${decision}\n`);

if (typeof target !== "string") process.exit(0);

const abs = resolve(root, target);
const rel = relative(root, abs).split("\\").join("/");

if (rel.startsWith("db/migrations/") && existsSync(abs)) {
  log("BLOCKED");
  console.error(
    `BLOCKED: ${rel} is an applied migration and is immutable. ` +
      `Add a new db/migrations/NNN_<name>.sql instead (see the add-migration skill).`,
  );
  process.exit(2);
}

log("allowed");
process.exit(0);
