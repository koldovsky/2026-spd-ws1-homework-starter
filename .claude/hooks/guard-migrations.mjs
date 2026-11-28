#!/usr/bin/env node
// owner: @Kurkov1990 · why: an applied migration was edited, so existing DBs silently diverged from fresh ones · review-by: 2027-03-23
// Two modes, both fed the hook payload on stdin:
//   (default) PreToolUse  — blocks (exit 2) Edit/Write/MultiEdit/NotebookEdit on an applied migration, a new migration
//                           with a wrong name, or a Bash segment that writes, moves or deletes an applied migration.
//   post      PostToolUse — backstop for whatever the Bash parsing misses: `git diff --name-status HEAD -- db/migrations`
//                           must show no M/D/T on applied files; otherwise exit 2 tells the agent how to restore them.
// "Applied" = committed at HEAD. An uncommitted new migration (e.g. the 003 the agent just wrote) may still be fixed.
// Paths are compared case-insensitively: on default APFS/NTFS, DB/Migrations/x.sql is the same file.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const root = realpathOr(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const migrationsDir = join(root, "db", "migrations");
const MIG = migrationsDir.toLowerCase();
const logFile = join(root, ".claude", "hooks", "guard-migrations.log");
const mode = process.argv[2] === "post" ? "post" : "pre";
// Absolute git path, not PATH lookup (Sonar S4036). If none works, applied = every file on disk (fail closed).
const GIT = [
  "/opt/homebrew/bin/git",
  "/usr/local/bin/git",
  "/opt/local/bin/git",
  "/usr/bin/git", // last: on macOS it is an Xcode shim that fails until the license is accepted
  String.raw`C:\Program Files\Git\cmd\git.exe`,
].find((p) => existsSync(p));

function log(decision, detail) {
  try {
    appendFileSync(logFile, `${new Date().toISOString()} ${mode} ${decision} ${detail}\n`);
  } catch {}
}

function block(reason, detail) {
  log("BLOCK", detail);
  process.stderr.write(`guard-migrations: ${reason}\n`);
  process.exit(2);
}

function realpathOr(p) {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

// Payload: a BOM is stripped. Malformed JSON fails closed in pre mode (we can't tell what the call would do);
// post mode runs anyway, because its check reads git, not the payload.
let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8").replace(/^\uFEFF/, ""));
} catch {
  if (mode === "pre") block("could not parse the hook payload, so the call is blocked to be safe (fail closed).", "unparsable payload");
}
const tool = payload.tool_name ?? "unknown tool";
const input = payload.tool_input ?? {};

const onDisk = existsSync(migrationsDir) ? readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")) : [];
const applied = appliedMigrations(); // lower-cased basenames
const nextNumber = String(Math.max(0, ...onDisk.map((f) => Number.parseInt(f, 10) || 0)) + 1).padStart(3, "0");
const restoreHint = (f) => `git restore --source=HEAD --staged --worktree -- db/migrations/${f}`;

/** Runs git in the project; throws when git is missing or the command fails. */
function git(args) {
  if (!GIT) throw new Error("git not found in a fixed location");
  return execFileSync(GIT, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/** Basenames of migrations committed at HEAD. Without git, every file on disk counts as applied (fail closed). */
function appliedMigrations() {
  try {
    const out = git(["ls-tree", "--name-only", "HEAD", "--", "db/migrations/"]);
    return new Set(out.split("\n").filter((l) => l.endsWith(".sql")).map((l) => basename(l).toLowerCase()));
  } catch {
    return new Set(onDisk.map((f) => f.toLowerCase()));
  }
}

function postCheck() {
  let out;
  try {
    out = git(["diff", "--name-status", "--no-renames", "HEAD", "--", "db/migrations/"]);
  } catch {
    return; // not a git repo / no HEAD: nothing to compare against
  }
  const changed = out
    .split("\n")
    .map((l) => l.split("\t"))
    .filter(([status, path]) => path && /^[MDT]/.test(status) && applied.has(basename(path).toLowerCase()))
    .map(([status, path]) => `${status} ${basename(path)}`);
  if (changed.length) {
    block(
      `${tool} changed applied migration(s): ${changed.join(", ")}. Applied migrations are immutable. ` +
        `Undo it now: ${changed.map((c) => restoreHint(c.slice(2))).join(" && ")} — ` +
        `then put the schema change into db/migrations/${nextNumber}_<what>.sql.`,
      `${tool} ${changed.join(",")}`,
    );
  }
}

function preCheck() {
  if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
    const raw = resolve(root, input.file_path ?? input.notebook_path ?? "");
    const target = join(realpathOr(dirname(raw)), basename(raw)); // follow a symlinked folder
    if (dirname(target).toLowerCase() !== MIG) return;
    const rel = relative(root, target);
    const name = basename(target);
    if (applied.has(name.toLowerCase())) {
      block(
        `${rel} is an applied migration (committed) and must not change. Create db/migrations/${nextNumber}_<what>.sql instead.`,
        `${tool} ${rel}`,
      );
    }
    const isOwnUncommitted = onDisk.some((f) => f.toLowerCase() === name.toLowerCase());
    if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(name) || (!isOwnUncommitted && !name.startsWith(`${nextNumber}_`))) {
      block(`new migration must be named ${nextNumber}_snake_case.sql (got ${name}).`, `${tool} ${rel}`);
    }
    log("ALLOW", `${tool} ${rel}`);
    return;
  }

  if (tool === "Bash") {
    const cmd = String(input.command ?? "");
    const cwd = payload.cwd && isAbsolute(payload.cwd) ? realpathOr(payload.cwd) : root;
    const bad = writingSegment(cmd, cwd);
    if (bad) {
      block(
        `shell command would modify db/migrations/ ("${bad.slice(0, 120)}"). Applied migrations are immutable; ` +
          `add db/migrations/${nextNumber}_<what>.sql with the Write tool instead.`,
        `Bash ${JSON.stringify(bad.slice(0, 200))}`,
      );
    }
  }
}

/**
 * Returns the first shell segment that writes into db/migrations/, or undefined.
 * Tracks `cd`/`pushd` across segments so `cd db/migrations && sed -i … 002_x.sql` is seen. Heredoc bodies are data.
 * This is best effort; the PostToolUse check is the backstop.
 */
function writingSegment(cmd, startCwd) {
  let cwd = startCwd;
  for (const seg of segments(stripHeredocs(cmd))) {
    const { words, redirects } = tokenize(seg);
    const at = (p) => resolve(cwd, unquote(p).replace(/^~(?=\/|$)/, homedir()));
    if (redirects.some((r) => insideMigrations(at(r)))) return seg;

    const bin = basename(unquote(words[0] ?? ""));
    const args = words.slice(1);
    if (bin === "cd" || bin === "pushd") {
      const dest = args.find((w) => !w.startsWith("-"));
      cwd = dest ? at(dest) : homedir();
      continue;
    }
    const paths = args.filter((w) => !w.startsWith("-") && unquote(w) !== "").map(at);
    const ctx = { bin, args, paths, cwd, at, anyApplied: paths.some(touchesApplied) };
    if (SEGMENT_CHECKS.some((check) => check(ctx))) return seg;
  }
  return undefined;
}

const DELETE_BINS = new Set(["rm", "rmdir", "truncate", "unlink", "shred"]);
const COPY_BINS = new Set(["cp", "ln", "install", "rsync", "tee", "dd", "patch"]);
const IN_PLACE_BINS = new Set(["sed", "perl", "ruby"]);
const WRAPPERS = new Set(["sudo", "command", "builtin", "exec", "env", "nice"]);

const SEGMENT_CHECKS = [
  ({ bin, anyApplied }) => DELETE_BINS.has(bin) && anyApplied,
  copiesInto,
  ({ bin, paths, anyApplied }) => bin === "mv" && (anyApplied || (paths.length > 0 && insideMigrations(paths.at(-1)))),
  ({ bin, args, anyApplied }) =>
    IN_PLACE_BINS.has(bin) && anyApplied && args.some((w) => /^-[a-zA-Z]*i/.test(w) || w.startsWith("--in-place")),
  gitWrites,
];

function copiesInto({ bin, args, paths, cwd, at, anyApplied }) {
  if (!COPY_BINS.has(bin)) return false;
  const ddOut = args.find((w) => w.startsWith("of="));
  if (ddOut) return insideMigrations(at(ddOut.slice(3)));
  if (bin === "tee") return paths.some(insideMigrations);
  if (bin === "patch") return anyApplied || insideMigrations(cwd);
  return paths.length > 0 && insideMigrations(paths.at(-1));
}

function gitWrites({ args, cwd, anyApplied }) {
  const sub = args.find((w) => !w.startsWith("-"));
  if (["apply", "am"].includes(sub)) return anyApplied || insideMigrations(cwd);
  if (!["checkout", "restore", "rm", "mv"].includes(sub)) return false;
  return anyApplied && !restoresFromHead(sub, args);
}

/** `git restore --source=HEAD …` / `git checkout HEAD -- …` put applied migrations back; that is the repair path. */
function restoresFromHead(sub, args) {
  if (sub === "checkout") return args[args.indexOf("checkout") + 1] === "HEAD";
  return args.some((w, i) => w === "--source=HEAD" || ((w === "-s" || w === "--source") && args[i + 1] === "HEAD"));
}

/** Drops heredoc bodies line by line (no backtracking regex over the whole command). */
function stripHeredocs(cmd) {
  const kept = [];
  let tag;
  for (const line of cmd.split("\n")) {
    if (tag) {
      if (line.trim() === tag) tag = undefined;
      continue;
    }
    kept.push(line);
    tag = /(?<!<)<<-?\s*['"]?(\w+)/.exec(line)?.[1];
  }
  return kept.join("\n");
}

/** Splits on newline, ;, &&, ||, | and a background &, then drops ( { ) } around subshells and groups. */
function segments(cmd) {
  return cmd
    .split(/\n|;|&&|\|\||\||(?<![>&])&(?![>&])/)
    .map(stripGrouping)
    .filter(Boolean);
}

function stripGrouping(raw) {
  let s = raw.trim();
  while (s.startsWith("(") || s.startsWith("{")) s = s.slice(1).trimStart();
  while (s.endsWith(")") || s.endsWith("}")) s = s.slice(0, -1).trimEnd();
  return s;
}

/**
 * Splits a segment into words and redirect targets: `>f`, `> f`, `>>f`, `>|f`, `1>f`, `&>f`, `x>f`.
 * fd duplication (`2>&1`) and input redirects (`<f`) are dropped. VAR=x prefixes and wrappers like sudo are skipped.
 */
function tokenize(seg) {
  const words = [];
  const redirects = [];
  const parts = seg.split(/\s+/).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const w = parts[i];
    const gt = w.indexOf(">");
    if (gt === -1) {
      if (w === "<") i++;
      else if (!w.startsWith("<")) words.push(w);
      continue;
    }
    const before = w.slice(0, gt);
    if (before && before !== "&" && !/^\d$/.test(before)) words.push(before);
    let target = w.slice(gt).replace(/^>>?\|?/, "");
    if (target === "") target = parts[++i] ?? "";
    if (!target.startsWith("&")) redirects.push(target);
  }
  return { words: words.filter((w) => !/^\w+=/.test(w) && !WRAPPERS.has(w)), redirects };
}

function unquote(w) {
  const q = w[0];
  return w.length >= 2 && (q === "'" || q === '"') && w.endsWith(q) ? w.slice(1, -1) : w;
}

/** Is `p` the migrations folder or something inside it? */
function insideMigrations(p) {
  const l = p.toLowerCase();
  return l === MIG || l.startsWith(MIG + sep);
}

/** Does acting on `p` touch an applied migration: the file itself, a glob over it, the folder, or a parent folder? */
function touchesApplied(p) {
  const l = p.toLowerCase();
  if (MIG === l || MIG.startsWith(l + sep)) return true; // the folder itself or an ancestor (rm -r db)
  const glob = l.search(/[*?[{]/);
  if (glob !== -1) {
    // db/migrations/*.sql, db/m*/0*.sql, … — the folder part reaches the migrations folder. Wider globs: post check.
    const prefix = l.slice(0, glob);
    return dirname(l) === MIG || (/[*?[{]/.test(dirname(l)) && (MIG + sep).startsWith(prefix));
  }
  return dirname(l) === MIG && applied.has(basename(l));
}

// Entry point last, so every const above is initialised before the checks run.
if (mode === "post") postCheck();
else preCheck();
process.exit(0);
