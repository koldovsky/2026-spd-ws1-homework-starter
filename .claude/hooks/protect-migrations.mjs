#!/usr/bin/env node
// owner: @AlexSylka · why: lib/db.ts skips migrations already recorded in schema_migrations, so editing an applied one silently diverges existing databases; schema changes must be a new numbered file · review-by: 2027-02-22
//
// PreToolUse hook. Reads the tool call as JSON on stdin.
// Exit 2 = block the call, stderr is shown to the agent as the reason. Exit 0 = allow.
// "Applied" = committed at HEAD. A migration created in this session stays editable until it is committed.
// Decisions about db/migrations/ are appended to .claude/hooks/protect-migrations.log (git-ignored).
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const logFile = join(root, ".claude", "hooks", "protect-migrations.log");
const MIGRATIONS = "db/migrations/";
const FILE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const MUTATING =
  /\b(rm|mv|cp|dd|truncate|tee|patch|git\s+(checkout|restore|apply))\b|\b(sed|perl)\b.*\s(-[a-zA-Z]*i\b|--in-place)|\bfind\b.*\s-(delete|exec)\b/;
const REDIRECT_TARGET = />>?\s*['"]?([^\s'"]+)/g;
const GLOB = /[*?[]/;

function log(decision, detail) {
  try {
    appendFileSync(logFile, `${new Date().toISOString()} ${decision} ${detail}\n`);
  } catch {
    // logging must never break the hook
  }
}

// Lower-cased: macOS file systems ignore case, so DB/Migrations/001_x.sql is the same file as db/migrations/001_x.sql.
function toKey(cwd, path) {
  return relative(root, resolve(cwd, path)).split("\\").join("/").toLowerCase();
}

// A file in db/migrations/, the folder itself, or `db/`. The repo root is left out: `git checkout .` is not about migrations.
const inMigrations = (key) => key !== "" && (key.startsWith(MIGRATIONS) || MIGRATIONS.startsWith(`${key}/`));

let applied;
function isApplied(key) {
  if (!key.startsWith(MIGRATIONS)) return false;
  if (!applied) {
    try {
      const out = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--", MIGRATIONS], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      applied = new Set(out.split("\n").filter(Boolean).map((p) => p.toLowerCase()));
    } catch {
      // No git or no commits yet: treat every existing migration as applied.
      applied = new Set(migrationFiles().map((f) => (MIGRATIONS + f).toLowerCase()));
    }
  }
  return applied.has(key);
}

function migrationFiles() {
  try {
    return readdirSync(join(root, MIGRATIONS)).filter((f) => f.endsWith(".sql"));
  } catch {
    return [];
  }
}

function nextMigrationNumber() {
  const highest = Math.max(0, ...migrationFiles().map((f) => Number.parseInt(f, 10) || 0));
  return String(highest + 1).padStart(3, "0");
}

/** Returns undefined when the call has nothing to do with migrations, else { detail, blocked }. */
function check(tool, input, cwd) {
  if (FILE_TOOLS.has(tool)) {
    const target = input.file_path ?? input.notebook_path;
    if (typeof target !== "string") return undefined;
    const key = toKey(cwd, target);
    if (!key.startsWith(MIGRATIONS)) return undefined;
    return { detail: `${tool} ${key}`, blocked: isApplied(key) };
  }
  if (tool === "Bash") {
    const cmd = String(input.command ?? "");
    // Best effort, errs on the side of blocking. Each part between &&, ||, ;, | or a newline is checked on its own,
    // following `cd`. A mutating part may only target concrete, uncommitted .sql files: a glob, the folder, `db/` or a
    // committed migration blocks. Not parsed: interpreters (node -e, python -c) and patch files whose contents name a migration
    // (`git apply fix.diff`); CODEOWNERS review is the backstop.
    let dir = cwd;
    let touchesMigrations = false;
    const blocked = cmd.split(/&&|\|\||[;|\n]/).some((part) => {
      // Pad every `>` / `>>` with spaces so `echo x>db/migrations/001.sql` has the file as its own word.
      const words = part.replace(/>+/g, " $& ").trim().split(/\s+/).map((w) => w.replace(/^['"]|['"]$/g, ""));
      if (words[0] === "cd") {
        if (words[1]) dir = resolve(dir, words[1]);
        return false;
      }
      const targets = words
        .slice(1)
        .map((w) => w.replace(/^\d*>+&?/, ""))
        .filter((w) => w && !w.startsWith("-"))
        .map((w) => toKey(dir, w))
        .filter(inMigrations);
      const redirectsIntoMigrations = [...words.join(" ").matchAll(REDIRECT_TARGET)].some((m) =>
        inMigrations(toKey(dir, m[1])),
      );
      if (!targets.length) return false;
      touchesMigrations = true;
      if (!(redirectsIntoMigrations || MUTATING.test(part))) return false;
      return !targets.every((key) => key.endsWith(".sql") && !GLOB.test(key) && !isApplied(key));
    });
    if (!touchesMigrations) return undefined;
    return { detail: `Bash ${cmd.replace(/\s+/g, " ").slice(0, 120)}`, blocked };
  }
  return undefined;
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // Unreadable payload: fail open, but leave a trace.
  log("ALLOW", "unparseable payload");
}

const result = payload && check(payload.tool_name ?? "", payload.tool_input ?? {}, payload.cwd ?? root);
if (result?.blocked) {
  log("BLOCK", result.detail);
  process.stderr.write(
    `BLOCKED: ${result.detail} would modify or delete an applied (committed) migration.\n` +
      `Applied migrations are immutable: lib/db.ts skips files already recorded in schema_migrations.\n` +
      `Add a NEW file instead: db/migrations/${nextMigrationNumber()}_<description>.sql. See .claude/skills/add-db-migration/SKILL.md.\n`,
  );
  // exitCode instead of exit(): stderr to a pipe is async on macOS and must flush before the process ends.
  process.exitCode = 2;
} else if (result) {
  log("ALLOW", result.detail);
}
