// owner: @e5d3e1 · why: the Bash heuristic in protect-migrations.mjs cannot parse every shell write; this checks the result instead · review-by: 2027-02-24
// PostToolUse hook (Bash): after the command ran, compare db/migrations with HEAD.
// A committed migration that is now modified, deleted, renamed or retyped -> exit 2 with a revert instruction.
// New files (added or untracked) are allowed. The tool already ran: this detects, it cannot prevent.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let out;
try {
  // Index and working tree vs HEAD; --no-renames so a rename shows as D (+ A).
  // -z: NUL-separated "status\0path\0", paths unquoted (spaces, non-ASCII names stay as they are).
  out = execFileSync("git", ["diff", "--name-status", "--no-renames", "-z", "HEAD", "--", "db/migrations"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  process.exit(0); // no git / no HEAD: nothing to compare against
}

const parts = out.split("\0").filter(Boolean);
const changed = [];
for (let i = 0; i + 1 < parts.length; i += 2) {
  if (parts[i] !== "A") changed.push([parts[i], parts[i + 1]]); // A = new migration, allowed
}

if (changed.length === 0) process.exit(0);

const shellQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
const files = changed.map(([status, file]) => `${status} ${file}`).join(", ");
try {
  fs.appendFileSync(path.join(root, ".claude/hooks/block.log"), `${new Date().toISOString()} PostToolUse:Bash ${files}\n`);
} catch {
  // logging is best-effort
}
console.error(
  `BLOCKED: applied migrations were changed by a shell command (${files}). Applied migrations are immutable. ` +
    `Revert now by running exactly this as a separate command, with nothing chained (&&, ;, |): ` +
    `git checkout HEAD -- ${changed.map(([, f]) => shellQuote(f)).join(" ")} — then put the schema change in a new db/migrations/NNN_<name>.sql (see the add-migration skill).`,
);
process.exit(2);
