// owner: @evgenyadev · why: lib/db.ts records applied migrations by file name, so editing an applied one silently diverges every existing DB from a fresh one · review-by: 2027-02-20
//
// PreToolUse hook. Blocks changes to migrations that are already committed (tracked in git) and lets new,
// untracked migration files through, so the add-migration skill keeps working.
// Exit 0 = allow, exit 2 = block (stderr is shown to the agent as the reason).
// Fails open on a malformed payload: a broken hook must not stop all work. The failure is logged.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const MIGRATIONS = "db/migrations/";
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
// Shell verbs that change or remove a file. Best effort: a determined shell command can always get around a regex;
// verify-migrations.mjs (PostToolUse) checks the result for whatever this misses.
const MUTATING = /\b(perl\s+-\w*i|rm|mv|truncate|tee|dd)\b/i;
// sed edits in place with -i anywhere among its flags (-i, -Ei, -n -i) or --in-place.
const SED_IN_PLACE = /\bsed\s(?:[^|;&]*\s)?(?:-[A-Za-z]*i[A-Za-z]*|--in-place)(?=[\s=]|$)/;
// cp changes only its destination, so copying an applied migration elsewhere is fine.
const copiesOnto = (segment, name) => /\bcp\b/.test(segment) && segment.trim().split(/\s+/).pop().toLowerCase().endsWith(name.toLowerCase());

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const logFile = process.env.PROTECT_MIGRATIONS_LOG ?? join(projectDir, ".claude", "hooks", "protect-migrations.log");

function log(entry) {
  try {
    appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    // Logging must never change the decision.
  }
}

// Always ask git from the repo root: `git ls-files -- db/migrations/` run from inside db/migrations lists nothing.
function repoRoot(cwd) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" }).trim();
}

function trackedMigrations(root) {
  const out = execFileSync("git", ["ls-files", "--", MIGRATIONS], { cwd: root, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function block(tool, target, reason) {
  log({ decision: "block", tool, target });
  process.stderr.write(
    `Blocked: ${target} is an applied migration and must not change.\n` +
      `${reason}\n` +
      `Add a new file instead: db/migrations/<next number>_<name>.sql (see .claude/rules/migrations.md, skill add-migration).\n`,
  );
  process.exit(2);
}

let payload;
try {
  // Windows PowerShell pipes prepend a byte-order mark; without stripping it the parse fails and the hook fails open.
  payload = JSON.parse(readFileSync(0, "utf8").replace(/^\uFEFF/, ""));
} catch (e) {
  log({ decision: "allow", error: `unreadable payload: ${e.message}` });
  process.exit(0);
}

const cwd = payload.cwd ?? projectDir;
const tool = payload.tool_name;
const input = payload.tool_input ?? {};
let root;
let tracked;
try {
  root = process.env.CLAUDE_PROJECT_DIR ?? repoRoot(cwd);
  tracked = trackedMigrations(root);
} catch (e) {
  // Not a git repo, or git missing: nothing is "applied", so allow, as on a bad payload. Without this catch the
  // hook crashed with exit 1, which also allows, but silently.
  log({ decision: "allow", error: `git failed: ${e.message.split("\n")[0]}` });
  process.exit(0);
}
// macOS and Windows file systems ignore case by default: DB/Migrations/001_X.SQL opens the same file. Compare folded.
const fold = (s) => s.toLowerCase();
const trackedByKey = new Map(tracked.map((f) => [fold(f), f]));

if (EDIT_TOOLS.has(tool)) {
  const raw = input.file_path ?? input.notebook_path ?? "";
  const rel = relative(root, resolve(cwd, raw)).split("\\").join("/");
  const hit = trackedByKey.get(fold(rel));
  if (hit) {
    block(tool, hit, "Existing databases already ran it; lib/db.ts will never re-apply the edited version.");
  }
} else if (tool === "Bash") {
  const command = String(input.command ?? "");
  // Judge each simple command on its own, so `cat 001.sql; rm tmp.txt` is not read as removing 001.sql.
  for (const segment of command.split(/&&|\|\||[;\n|]/)) {
    for (const file of tracked) {
      const name = basename(file);
      if (!fold(segment).includes(fold(name))) continue;
      const redirectInto = new RegExp(`>\\s*\\S*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      if (MUTATING.test(segment) || SED_IN_PLACE.test(segment) || copiesOnto(segment, name) || redirectInto.test(segment)) {
        block(tool, file, `The shell command would modify it: ${segment.trim()}`);
      }
    }
  }
}

process.exit(0);
