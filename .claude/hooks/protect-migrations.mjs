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
const GLOB = /[*?[]/;
const WRAPPERS = new Set(["sudo", "command", "nohup", "time", "env", "exec"]);
const WRITES_ALL_OPERANDS = new Set(["rm", "rmdir", "unlink", "shred", "mv", "truncate", "tee", "patch"]);
const IN_PLACE = /^-[A-Za-z]*i|^--in-place/; // sed/perl: -i, -Ei, -pi, -i.bak, --in-place

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

// Shell-ish tokens: `>` and `>>` are their own tokens (so `x>file` works), quotes group words and are removed.
function tokenize(part) {
  return (part.match(/>>?|(?:[^\s"'>]|"[^"]*"|'[^']*')+/g) ?? []).map((raw) => ({
    redirect: raw === ">" || raw === ">>",
    text: raw.replace(/"([^"]*)"|'([^']*)'/g, (_, a, b) => a ?? b),
  }));
}

/** The paths a command part writes to or deletes; paths it only reads or merely names are left out. */
function writtenPaths(tokens) {
  const written = [];
  const args = [];
  tokens.forEach((t, i) => {
    if (t.redirect) {
      if (tokens[i + 1]) written.push(tokens[i + 1].text);
    } else if (i === 0 || !tokens[i - 1].redirect) {
      args.push(t.text);
    }
  });
  let i = 0;
  while (i < args.length && (/^\w+=/.test(args[i]) || WRAPPERS.has(args[i]))) i++;
  const verb = args[i];
  const rest = args.slice(i + 1);
  const operands = rest.filter((a) => a && !a.startsWith("-"));

  if (WRITES_ALL_OPERANDS.has(verb)) written.push(...operands);
  else if (["cp", "install", "ln"].includes(verb)) written.push(...operands.slice(-1)); // only the destination
  else if (verb === "dd") written.push(...rest.filter((a) => a.startsWith("of=")).map((a) => a.slice(3)));
  else if ((verb === "sed" || verb === "perl") && rest.some((a) => IN_PLACE.test(a))) written.push(...operands);
  else if (verb === "find" && rest.some((a) => ["-delete", "-exec", "-execdir"].includes(a))) written.push(...operands);
  else if (verb === "git") {
    const sub = operands[0];
    const gitOperands = operands.slice(1);
    if (["rm", "mv", "clean", "apply"].includes(sub)) written.push(...gitOperands);
    else if (sub === "checkout" || sub === "restore") {
      // Restoring from HEAD only brings back what is already committed; any other source overwrites it.
      const s = rest.findIndex((a) => a === "--source" || a === "-s");
      const fromHead =
        rest.includes("--source=HEAD") || (s >= 0 && rest[s + 1] === "HEAD") || (sub === "checkout" && gitOperands[0] === "HEAD");
      if (!fromHead) written.push(...gitOperands);
    }
  }
  return written;
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
    // Best effort, errs on the side of blocking. Each part between &&, ||, ;, | or a newline (not inside quotes) is checked
    // on its own, following `cd`. Only paths the command writes to or deletes count, and they may only be concrete,
    // uncommitted .sql files: a glob, the folder, `db/` or a committed migration blocks. Not parsed: interpreters
    // (node -e, python -c) and patch files whose contents name a migration (`git apply fix.diff`); CODEOWNERS review is the backstop.
    const masked = cmd.replace(/"[^"]*"|'[^']*'/g, (q) => q.replace(/[;|&\n]/g, "\u0001"));
    let dir = cwd;
    let touchesMigrations = false;
    const blocked = masked.split(/&&|\|\||[;|\n]/).some((part) => {
      const tokens = tokenize(part);
      if (tokens[0]?.text === "cd") {
        if (tokens[1]) dir = resolve(dir, tokens[1].text);
        return false;
      }
      const writes = writtenPaths(tokens)
        .map((w) => toKey(dir, w))
        .filter(inMigrations);
      const mentions = tokens.some((t) => t.text && !t.text.startsWith("-") && inMigrations(toKey(dir, t.text)));
      if (writes.length || mentions) touchesMigrations = true;
      return writes.some((key) => !(key.endsWith(".sql") && !GLOB.test(key) && !isApplied(key)));
    });
    if (!touchesMigrations) return undefined;
    return { detail: `Bash ${cmd.replace(/\s+/g, " ").slice(0, 120)}`, blocked };
  }
  return undefined;
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8").replace(/^\uFEFF/, ""));
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
