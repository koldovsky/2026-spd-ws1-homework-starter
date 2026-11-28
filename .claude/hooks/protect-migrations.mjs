// owner: @e5d3e1 · why: applied migrations are immutable; editing one silently diverges existing DBs from fresh ones · review-by: 2027-02-24
// PreToolUse hook: blocks Edit/Write/MultiEdit on an APPLIED db/migrations/*.sql file (exit 2),
// and Bash commands that look like writes to db/migrations/.
// "Applied" = committed in HEAD. A new migration (not yet committed) can be created and fixed.
// Paths are canonicalized (realpath), so a symlink alias cannot bypass the check.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WATCHED_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0); // not our payload; never block on parse errors
}

// Log (best-effort), explain on stderr, exit 2 = block the tool call.
function block(what, message) {
  try {
    const logRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    fs.appendFileSync(path.join(logRoot, ".claude/hooks/block.log"), `${new Date().toISOString()} ${payload.tool_name} ${what}\n`);
  } catch {
    // logging is best-effort
  }
  console.error(message);
  process.exit(2);
}

// The one shell write we allow: `git checkout HEAD -- <paths in db/migrations>` as the whole command.
// It restores committed content (the revert that check-migrations-diff.mjs asks for), so it cannot change a migration.
// No shell metacharacters, no newlines (a second command), no other revision than HEAD,
// no `..`, and no name starting with `.` (bash expands `db/migrations/.*` to `db/migrations/..`).
function isRevertToHead(cmd) {
  const m = /^[ \t]*git[ \t]+checkout[ \t]+HEAD[ \t]+--((?:[ \t]+(?:'[^'\n]*'|"[^"$`\\\n]*"|[^\s'"]+))+)\s*$/.exec(cmd);
  if (!m) return false;
  const args = m[1].match(/'[^']*'|"[^"]*"|[^\s'"]+/g);
  return args.every((a) => {
    const p = a.replace(/^(['"])(.*)\1$/, "$2");
    if (a === p && /[;&|<>$`\\(){}]/.test(p)) return false; // unquoted shell syntax
    return /^(\.\/)?db\/migrations\/[^/.][^/]*$/.test(p) && !p.includes("..");
  });
}

// Bash: heuristic on the command text. Blocks a command that mentions db/migrations AND looks like a write
// (redirect, in-place edit, tee, mv/cp/rm, ...). Reads (ls, cat, grep, git diff) pass.
// Parsing cannot be complete; the PostToolUse check (git diff against HEAD) catches what this misses.
if (payload?.tool_name === "Bash") {
  const cmd = payload?.tool_input?.command;
  if (typeof cmd !== "string" || !/migrations/i.test(cmd)) process.exit(0);
  if (isRevertToHead(cmd)) process.exit(0);
  // Quoted text is usually data (grep '->'), not shell syntax, so drop it -- unless the shell will run it:
  // a nested shell outside quotes (bash -c "...", eval) or a command substitution ($(...), `...`).
  const unescaped = cmd.replace(/\\['"]/g, "_"); // \' and \" are literal characters, not quotes
  const unquoted = unescaped.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
  const runsQuoted = /\b(sh|bash|zsh|eval)\b/.test(unquoted) || /\$\(|`/.test(cmd);
  const stripped = (runsQuoted ? cmd : unquoted)
    .replace(/\d*>>?\s*\/dev\/null/g, "") // harmless redirects
    .replace(/\d*>&\d/g, "");
  const WRITE = [
    />/, // > and >> redirects
    /\b(sed|perl|ruby)\b[^|;&]*\s(-[a-zA-Z]*i|--in-place)/, // in-place edit: sed -i, perl -pi, sed --in-place
    /\bfind\b[^|;&]*\s-(delete|exec|execdir|ok)\b/,
    /\b(tee|sponge|mv|cp|rm|truncate|dd|ln|install|touch|chmod)\b/i, // /i: a case-insensitive FS may resolve `Rm` to rm
    /\bgit\b[^|;&]*\s(apply|mv|rm|restore|checkout|stash|clean|reset)\b/, // also after git -C/-c options
  ];
  if (WRITE.some((re) => re.test(stripped))) {
    block(
      JSON.stringify(cmd.slice(0, 200)),
      "BLOCKED: this shell command looks like it writes to db/migrations/. Applied migrations are immutable " +
        "and shell writes there are not allowed. To add a migration, create db/migrations/NNN_<name>.sql with the " +
        "Write tool (see the add-migration skill); to inspect files, use Read or a read-only command.",
    );
  }
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (!WATCHED_TOOLS.has(payload?.tool_name) || typeof filePath !== "string") process.exit(0);

// Resolve symlinks; for a file that does not exist yet, resolve its parent directory.
// .native returns the on-disk letter case, so on a case-insensitive FS (macOS default)
// `DB/Migrations/001_CREATE_TASKS.SQL` resolves to `db/migrations/001_create_tasks.sql`.
function canonical(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    try {
      return path.join(fs.realpathSync.native(path.dirname(p)), path.basename(p));
    } catch {
      return p;
    }
  }
}

// True if the file is committed in HEAD. If git cannot answer, treat it as applied (fail closed).
function isCommitted(rel) {
  try {
    const out = execFileSync("git", ["ls-tree", "--name-only", "HEAD", "--", rel], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim() !== "";
  } catch {
    return true;
  }
}

const root = canonical(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const migDir = canonical(path.join(root, "db/migrations"));
const requested = path.resolve(root, filePath);
const abs = canonical(requested);
// Real location relative to root; differs from rel when db/migrations is a symlink inside the repo.
const realRel = path.relative(root, abs).split(path.sep).join("/");
const realInRepo = !realRel.startsWith("../") && !path.isAbsolute(realRel);

// A migration can be reached two ways; check both:
// - the requested entry sits in db/migrations (it may be a symlink to a file elsewhere);
// - the real file sits in db/migrations (the requested path may be an alias of it).
const names = [];
if (canonical(path.dirname(requested)) === migDir) names.push(path.basename(requested));
if (path.dirname(abs) === migDir) names.push(path.basename(abs));

// lstat: a committed symlink entry counts as existing even if its target is missing.
const entryExists = (() => {
  try {
    fs.lstatSync(requested);
    return true;
  } catch {
    return false;
  }
})();

const rel = names
  .filter((n) => n.endsWith(".sql"))
  .map((n) => `db/migrations/${n}`) // repo path used for git and messages
  .find((r) => (entryExists || fs.existsSync(abs)) && (isCommitted(r) || (realInRepo && isCommitted(realRel))));

if (rel) {
  block(
    rel,
    `BLOCKED: ${rel} is an applied migration and must not be edited. ` +
      `Add a new migration instead, e.g. db/migrations/NNN_<name>.sql (see AGENTS.md hard rules).`,
  );
}

// A committed migration entry may be a symlink to a file anywhere (lib/db.ts follows it). Block an edit
// addressed directly to that target: compare the real target with the real path of every committed entry.
// Only files that exist can be a target, so a new file never reaches git here.
if (fs.existsSync(abs)) {
  let committed = [];
  try {
    committed = execFileSync("git", ["ls-tree", "-z", "--name-only", "HEAD", "--", "db/migrations/"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\0")
      .filter((r) => r.endsWith(".sql"));
  } catch {
    // no git / no HEAD: the checks above already decided
  }
  const target = committed.find((r) => {
    const entry = path.join(root, r);
    try {
      return fs.lstatSync(entry).isSymbolicLink() && canonical(entry) === abs;
    } catch {
      return false;
    }
  });
  if (target) {
    block(
      `${realRel} (target of ${target})`,
      `BLOCKED: ${realRel} is the target of the applied migration ${target} (a symlink) and must not be edited. ` +
        `Add a new migration instead, e.g. db/migrations/NNN_<name>.sql (see AGENTS.md hard rules).`,
    );
  }
}

process.exit(0);
