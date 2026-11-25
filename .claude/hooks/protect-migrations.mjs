// owner: @vajs · why: lib/db.ts never re-runs an applied migration, so editing one makes databases silently diverge; fix forward with a new file · review-by: 2027-02-24
// PreToolUse hook: exit 2 blocks the call, stderr goes back to the agent as the reason.
// Fails closed: exit 1 is a non-blocking error in Claude Code and lets the call through, so an unreadable
// payload exits 2 instead. "Applied" means committed in HEAD; if git cannot answer, any existing file counts.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const log = (line) => {
  try {
    appendFileSync(join(root, ".claude/hooks/block.log"), `${new Date().toISOString()} ${line}\n`);
  } catch {}
};
let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new Error("payload is not an object");
} catch (e) {
  log(`unreadable payload: ${e.message}`);
  console.error("BLOCKED: protect-migrations hook could not read its input, so it refuses the call (fail closed).");
  process.exit(2);
}
const isApplied = (rel, abs) => {
  if (!existsSync(abs)) return false;
  try {
    return execFileSync("git", ["ls-tree", "--name-only", "HEAD", "--", rel], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() !== "";
  } catch {
    return true;
  }
};
const target = payload.tool_input?.file_path ?? payload.tool_input?.notebook_path;

if (typeof target === "string") {
  const abs = resolve(root, target);
  const rel = relative(root, abs).split(sep).join("/");
  const inMigrations = /^db\/migrations\/[^/]+\.sql$/.test(rel);
  if (inMigrations && isApplied(rel, abs)) {
    const reason = `BLOCKED: ${rel} is a committed migration and is frozen. Add a new numbered file in db/migrations/ instead (see .claude/rules/migrations.md).`;
    log(`${payload.tool_name} ${rel}`);
    console.error(reason);
    process.exit(2);
  }
}

// Bash. Layer 1 (PreToolUse): refuse a command that names db/migrations and writes. A string check is
// bypassable (cd db/migrations && sed -i ...), so layer 2 (PostToolUse) inspects git instead.
const command = payload.tool_input?.command;
if (payload.tool_name === "Bash" && typeof command === "string") {
  if (payload.hook_event_name === "PostToolUse") {
    let changed = "";
    try {
      changed = execFileSync("git", ["diff", "--name-status", "HEAD", "--", "db/migrations"], { cwd: root, encoding: "utf8" });
    } catch {}
    const bad = changed.split("\n").filter((l) => /^[MDRT]/.test(l));
    if (bad.length) {
      log(`Bash(post) ${bad.join("; ")}`);
      console.error(`BLOCKED: that command changed applied migrations (${bad.join(", ")}). Restore them with git checkout HEAD -- db/migrations and add a new numbered file instead (see .claude/rules/migrations.md).`);
      process.exit(2);
    }
  } else {
    const c = command.replace(/\d?>&\d|\d?>\s*\/dev\/null/g, "");
    const writes = /\bsed\b[^|;&]*(\s-[a-zA-Z]*i|--in-place)|\bperl\b[^|;&]*\s-[a-zA-Z]*i|\b(tee|mv|cp|rm|truncate|dd|install|ln)\b|>/.test(c);
    if (/db\/migrations/.test(c) && writes) {
      log(`Bash ${command.slice(0, 120)}`);
      console.error("BLOCKED: this command writes under db/migrations/, where applied migrations are frozen. Create a new numbered file with the Write tool instead (see .claude/rules/migrations.md).");
      process.exit(2);
    }
  }
}
process.exit(0);
