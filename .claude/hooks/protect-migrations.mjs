// owner: @vajs · why: lib/db.ts never re-runs an applied migration, so editing one makes databases silently diverge; fix forward with a new file · review-by: 2027-02-24
// PreToolUse hook: exit 2 blocks the call, stderr goes back to the agent as the reason.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const payload = JSON.parse(readFileSync(0, "utf8") || "{}");
const target = payload.tool_input?.file_path ?? payload.tool_input?.notebook_path;

if (typeof target === "string") {
  const abs = resolve(root, target);
  const rel = relative(root, abs).split(sep).join("/");
  const inMigrations = /^db\/migrations\/[^/]+\.sql$/.test(rel);
  if (inMigrations && existsSync(abs)) {
    const reason = `BLOCKED: ${rel} is an applied migration and is frozen. Add a new numbered file in db/migrations/ instead (see .claude/rules/migrations.md).`;
    try {
      appendFileSync(join(root, ".claude/hooks/block.log"), `${new Date().toISOString()} ${payload.tool_name} ${rel}\n`);
    } catch {}
    console.error(reason);
    process.exit(2);
  }
}
process.exit(0);
