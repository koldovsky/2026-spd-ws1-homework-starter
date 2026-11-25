// owner: @oshamoiev · why: applied migrations are history; editing one makes existing and fresh databases diverge · review-by: 2027-02-25
// PreToolUse hook for Edit|Write|MultiEdit. Blocks (exit 2) a change to a file in db/migrations/ that already exists.
// Creating a new migration file is allowed. Limit: this sees Claude's file tools only, not shell commands such as `sed -i`.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // not a payload we understand: do not block
}

const file = payload?.tool_input?.file_path;
if (typeof file !== "string") process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const target = resolve(root, file);
const rel = relative(resolve(root, "db", "migrations"), target);
const insideMigrations = rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);

if (!insideMigrations || !existsSync(target)) process.exit(0);

const logDir = resolve(root, ".claude", "hooks");
mkdirSync(logDir, { recursive: true });
appendFileSync(
  resolve(logDir, "block.log"),
  `${new Date().toISOString()} BLOCKED ${payload.tool_name ?? "?"} ${relative(root, target)}\n`,
);

process.stderr.write(
  `Blocked: ${relative(root, target)} is an existing migration. Applied migrations are append-only. ` +
    `Add the next numbered file instead (e.g. db/migrations/003_<what>.sql); see .claude/rules/migrations.md.\n`,
);
process.exit(2);
