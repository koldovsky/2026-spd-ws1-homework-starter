#!/usr/bin/env node
// owner: @JKord · why: an applied migration was edited once, silently changing schema history for everyone who had already run it; .env files must never be created or edited by agents · review-by: 2027-02-28
// PreToolUse hook for Edit|MultiEdit|Write|Bash: reads the JSON payload from stdin, exits 2 (blocking) when
// tool_input.file_path is a git-tracked file in db/migrations/ or any .env / .env.* file (at any depth), or when
// a Bash tool_input.command names a .env / .env.* file (cat .env, cp .env.local …). Bash writes to migrations
// are caught right after the tool runs by the PostToolUse hook check-migrations-unchanged.mjs.
// Paths resolve against $CLAUDE_PROJECT_DIR (falls back to cwd), so the hook works after the agent `cd`s.
// Works on Windows and POSIX: path handling via node:path, no shell builtins.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // Windows PowerShell pipes may prepend a BOM
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0); // not our payload — fail open
}

// Bash: block any command that names an env file. Best effort — a recursive "grep -r SECRET ." that never names
// the file is not caught (see docs/ai/hook-evidence.md, Known limits).
const command = payload?.tool_input?.command;
if (payload?.tool_name === "Bash" && typeof command === "string") {
  if (/(?:^|[^\w.-])\.env(?:\.[\w.-]*)?(?![\w-])/i.test(command)) {
    console.error(
      "Blocked: this command names a .env file, which may contain secrets. Agents never read or write .env files — ask the repo owner (@JKord).",
    );
    process.exit(2);
  }
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (typeof filePath !== "string" || filePath.length === 0) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const abs = resolve(root, filePath);
const rel = relative(root, abs).replaceAll("\\", "/");
const name = basename(abs);
// Windows and macOS (APFS by default) are case-insensitive: "DB/Migrations/001.sql" is the
// same file. Lowercase the keys unconditionally — this cannot over-block migrations, since
// blocking still requires existsSync(abs) with the original casing.
const relKey = rel.toLowerCase();

// True if git tracks the file, false if not, null if git failed (binary missing, not a repo, …).
// The pathspec uses icase magic: on case-insensitive filesystems (Windows, macOS) a wrong-case
// path like "DB/Migrations/…" resolves to the real tracked file, but fs.realpathSync does not
// normalise the casing, so the lookup must ignore case. Blocking still requires existsSync(abs)
// with the given casing, so on a case-sensitive FS this can never match a different file.
function isGitTracked(absPath) {
  const relReal = relative(root, absPath).replaceAll("\\", "/");
  try {
    const out = execFileSync("git", ["ls-files", "--", `:(icase)${relReal}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim().length > 0;
  } catch {
    return null;
  }
}

// .env / .env.* anywhere in the repo — block creation and edits alike.
const nameKey = name.toLowerCase();
if (nameKey === ".env" || nameKey.startsWith(".env.")) {
  console.error(
    `Blocked: "${rel}" is an env file and may contain secrets. Agents never create or edit .env files — ask the repo owner (@JKord).`,
  );
  process.exit(2);
}

// Applied migrations are immutable; brand-new ones are not: a migration the agent created a
// minute ago is still untracked, so it stays editable until it is committed. Block only files
// git already tracks (existsSync on the original casing still guards against case games).
// If git itself fails (not a repo, no git binary), fall back to the previous behaviour: block
// any existing file under db/migrations/.
function isAppliedMigration() {
  if (!relKey.startsWith("db/migrations/") || !existsSync(abs)) return false;
  const tracked = isGitTracked(abs);
  return tracked === null ? true : tracked;
}

if (isAppliedMigration()) {
  console.error(
    `Blocked: "${rel}" is an applied DB migration and must not be edited. ` +
      `Create a new file db/migrations/00N_name.sql with the next free number instead — see .claude/rules/migrations.md.`,
  );
  process.exit(2);
}

process.exit(0);
