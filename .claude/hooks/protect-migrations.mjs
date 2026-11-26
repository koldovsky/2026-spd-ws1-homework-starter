// owner: @flatdeh · why: editing an applied migration diverges existing databases from fresh ones · review-by: 2027-03-01
// PreToolUse hook (Edit|Write|MultiEdit): exit 2 blocks changes to EXISTING files in db/migrations/.
// Creating a new migration file is allowed.
import { existsSync, appendFileSync, readFileSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // unreadable payload: do not block
}

const target = payload.tool_input?.file_path;
if (!target) process.exit(0);

const abs = resolve(root, target);
const rel = relative(root, abs).split(sep).join("/");

if (rel.startsWith("db/migrations/") && existsSync(abs)) {
  const msg = `BLOCKED: ${rel} is an applied migration and is immutable. Add a new numbered file in db/migrations/ instead (see the add-migration skill).`;
  try {
    appendFileSync(resolve(root, ".claude/hooks/protect-migrations.log"), `${new Date().toISOString()} ${payload.tool_name} ${rel} -> exit 2\n`);
  } catch {}
  console.error(msg);
  process.exit(2);
}
process.exit(0);
