// owner: @TyshchenkoOleksandr · why: an edited applied migration never runs again on existing databases · review-by: 2027-02-25
// PreToolUse hook. Reads the tool call as JSON on stdin. Exit 2 blocks the call and stderr goes to the agent.
// It covers Edit, Write, MultiEdit and Bash. A bad payload blocks the call (fail closed).
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function block(reason, payload, what) {
  try {
    appendFileSync(join(root, ".claude", "hooks", "hook.log"), `${new Date().toISOString()} ${payload?.tool_name} ${what} exit=2\n`);
  } catch {
    // The log is evidence only. A write error must not stop the block.
  }
  console.error(reason);
  process.exit(2);
}

// Applied migrations are the files that git tracks. Compare in lower case, because macOS paths ignore case.
function trackedMigrations() {
  try {
    const out = execFileSync("git", ["ls-files", "--", "db/migrations"], { cwd: root, encoding: "utf8" });
    return new Set(out.split("\n").filter(Boolean).map((f) => f.toLowerCase()));
  } catch {
    return null; // git is not usable
  }
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  block("BLOCKED: the hook could not read the tool call. Try again.", undefined, "bad-payload");
}

const target = payload.tool_input?.file_path;
if (typeof target === "string") {
  const abs = resolve(root, target);
  const rel = relative(root, abs).split(sep).join("/");
  if (rel.toLowerCase().startsWith("db/migrations/")) {
    const tracked = trackedMigrations();
    // A new file that git does not track yet is allowed. If git fails, a file that exists counts as applied.
    const applied = tracked ? tracked.has(rel.toLowerCase()) : existsSync(abs);
    if (applied) {
      block(`BLOCKED: ${rel} is an applied migration. Do not edit it. Add a new numbered file in db/migrations/ instead.`, payload, rel);
    }
  }
}

// Bash: block a command that names the migrations folder and also writes, moves or deletes files.
const command = payload.tool_input?.command;
if (typeof command === "string" && /migrations/i.test(command)) {
  const plain = command.replace(/\d*>&\d+|&>\s*\/dev\/null|\d*>\s*\/dev\/null/g, "");
  const writes = /(>|\btee\b|\b(mv|cp|rm|truncate|dd|install|ed)\b|\bsed\b.*\s-\w*i|\bperl\b.*\s-\w*i)/.test(plain);
  if (writes) {
    block("BLOCKED: this command changes files in db/migrations/. Do not edit an applied migration. Add a new numbered file with the Write tool instead.", payload, "bash");
  }
}
process.exit(0);
