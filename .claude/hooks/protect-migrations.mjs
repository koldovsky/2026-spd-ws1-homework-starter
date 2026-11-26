#!/usr/bin/env node
// owner: @skindyk · why: lib/db.ts records applied migration names and never re-runs them, so editing a committed migration silently diverges every existing DB from a fresh one · review-by: 2027-03-01
//
// PreToolUse hook. Blocks (exit 2, reason on stderr) any attempt to modify, overwrite, move or delete a migration
// that is already committed (exists in HEAD). New, uncommitted migrations may be written and edited freely.
// Paths are compared case-insensitively (NTFS/APFS). Shell commands are parsed per segment, following `cd`; quoted
// text with spaces (commit messages, echo) is ignored. Restoring a migration from HEAD is always allowed.
// This is the early, explained block; check-migrations-diff.mjs (PostToolUse) catches whatever parsing misses.
// Every decision is appended to .claude/hooks/protect-migrations.log (git-ignored).
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

const DIR = "db/migrations";

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0); // not our business to break the session on a malformed payload
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
const cwd = payload.cwd || projectDir;
const tool = payload.tool_name ?? "";
const input = payload.tool_input ?? {};

// --- What counts as applied --------------------------------------------------------------------------------
let appliedCache;
/** Lower-cased project-relative paths of migrations committed in HEAD. */
function applied() {
  if (appliedCache) return appliedCache;
  try {
    const out = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--", `${DIR}/`], {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    appliedCache = new Set(out.split(/\r?\n/).filter(Boolean).map((s) => s.toLowerCase()));
  } catch {
    // No git or no HEAD: be conservative and treat every existing .sql file as applied.
    try {
      const files = readdirSync(join(projectDir, DIR)).filter((f) => f.toLowerCase().endsWith(".sql"));
      appliedCache = new Set(files.map((f) => `${DIR}/${f}`.toLowerCase()));
    } catch {
      appliedCache = new Set();
    }
  }
  return appliedCache;
}

/** Project-relative, forward-slash, lower-cased key for a path given relative to `base`. */
function keyOf(p, base = cwd) {
  const clean = String(p).replace(/^["']|["']$/g, "").replace(/\\/g, "/");
  const abs = isAbsolute(clean) ? clean : resolve(base, clean);
  return relative(projectDir, abs).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}
const inMigrations = (k) => k === DIR || k.startsWith(`${DIR}/`);
const isDirLevel = (k) => k === DIR || k.includes("*") || k.includes("?");

// --- Output ------------------------------------------------------------------------------------------------
function log(decision, target, extra = "") {
  const line = [new Date().toISOString(), decision, tool, target, payload.session_id ?? "-", extra].join("\t");
  try {
    appendFileSync(join(projectDir, ".claude", "hooks", "protect-migrations.log"), line + "\n");
  } catch {}
}

function block(target, why) {
  log("BLOCK", target, why);
  process.stderr.write(
    `BLOCKED by .claude/hooks/protect-migrations.mjs: ${why}\n` +
      `"${target}" is an applied migration (committed to git). lib/db.ts never re-runs applied migrations, ` +
      `so changing it would make fresh and existing databases differ.\n` +
      `Do this instead: add a NEW migration db/migrations/NNN_<what>.sql with the next number ` +
      `(see .claude/skills/add-task-field/SKILL.md). For a changed CHECK constraint, rebuild the table in the new migration.\n`,
  );
  process.exit(2);
}

/** Block if `k` is an applied migration or a folder/wildcard operation on the migrations folder. */
function guard(k, why) {
  if (!inMigrations(k)) return;
  if (isDirLevel(k)) {
    if (applied().size > 0) block(k, `${why} (whole migrations folder or wildcard)`);
    return;
  }
  if (applied().has(k)) block(k, why);
}

// --- File tools --------------------------------------------------------------------------------------------
if (["Edit", "MultiEdit", "Write", "NotebookEdit"].includes(tool)) {
  const p = input.file_path ?? input.notebook_path ?? "";
  if (p) {
    const k = keyOf(p);
    guard(k, `${tool} on an applied migration`);
    if (inMigrations(k)) log("ALLOW", k, "new migration");
  }
  process.exit(0);
}

if (tool !== "Bash" && tool !== "PowerShell") process.exit(0);

// --- Shell -------------------------------------------------------------------------------------------------
// Heredoc bodies are data (docs, SQL, scripts piped to stdin), not commands: drop them, keep the command line.
// A heredoc script that really writes a migration is caught afterwards by check-migrations-diff.mjs.
function stripHeredocs(cmd) {
  const lines = cmd.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const m = lines[i].match(/<<-?\s*['"]?([A-Za-z_]\w*)['"]?/);
    if (!m) continue;
    while (i + 1 < lines.length && lines[i + 1].trim() !== m[1]) i++;
    i++; // skip the terminator line
  }
  return out.join("\n");
}
const raw = stripHeredocs(String(input.command ?? ""));
const norm = raw.replace(/\\/g, "/");
if (!/db\/migrations|\bmigrations\b|\bcd\b|Set-Location|pushd|\bsl\b|git\s+(apply|am)\b|\bpatch\b/i.test(norm)) process.exit(0);

// 1. Inline scripts (node -e, python -c, …) that write files and name a migration.
const INLINE = /\b(node|python3?|perl|ruby|bun|deno|pwsh|powershell)(\.exe)?\s+([^|;&\n]*\s)?-(e|c|p|-eval|Command)\b/i;
const WRITE_API = /write|append|unlink|\brm\b|rmSync|rename|copy|truncate|open\s*\([^)]*['"][wa]|Set-Content|Out-File|Remove-Item/i;
if (INLINE.test(norm) && WRITE_API.test(norm)) {
  for (const m of norm.matchAll(/[\w./:~-]*db\/migrations(\/[\w.*?-]*)?/gi)) guard(keyOf(m[0]), "inline script writes an applied migration");
}

// 2. Per segment. Quoted strings containing whitespace are data (messages), not paths.
const blanked = raw
  .replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, (q) => (/\s/.test(q.slice(1, -1)) ? '""' : q))
  .replace(/\\/g, "/");

const PREFIX = /^(sudo|env|command|nohup|time|exec|&)$/i;
const SAFE = /^(echo|printf|Write-Host|Write-Output|cat|type|Get-Content|gc|ls|dir|Get-ChildItem|gci|head|tail|wc|grep|rg|Select-String|less|more|diff|gh)$/i;
// Verbs whose every path argument is modified (or removed).
const ALL_ARGS = /^(rm|rmdir|del|erase|rd|unlink|shred|truncate|mv|move|ren|rename|Remove-Item|ri|Move-Item|mi|Rename-Item|rni|New-Item|ni|Set-Content|sc|Add-Content|ac|Clear-Content|clc|Out-File)$/i;
// Verbs that only modify their destination (last positional argument or -Destination).
const DEST_ONLY = /^(cp|copy|Copy-Item|cpi|install|ln|xcopy|rsync|scp)$/i;

let vcwd = cwd;
for (const seg of blanked.split(/&&|\|\||;|\n|\|/)) {
  let words = seg.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/^[({]+|[)}]+$/g, ""));
  while (words.length && (PREFIX.test(words[0]) || /^\w+=/.test(words[0]))) words.shift();
  if (!words.length) continue;
  const [w0 = "", w1 = ""] = words;
  const args = words.slice(1);
  const positional = args.filter((w) => !w.startsWith("-"));

  // Track directory changes so `cd db/migrations && rm 001_x.sql` resolves correctly.
  if (/^(cd|pushd|chdir|Set-Location|sl)$/i.test(w0)) {
    if (positional[0]) vcwd = resolve(vcwd, positional[0].replace(/^["']|["']$/g, ""));
    continue;
  }

  // Redirection / tee INTO a migration, whatever the command (reading and redirecting elsewhere is fine).
  // Brackets are excluded from the target so `(cd db/migrations; echo x>>001_x.sql)` captures `001_x.sql`.
  for (const m of seg.matchAll(/(>{1,2}|\btee(\s+-a)?)\s*["']?([^\s"'|;&<>(){}]+)/gi)) {
    if (m[3] !== "&1" && m[3] !== "&2") guard(keyOf(m[3], vcwd), "shell redirect writes an applied migration");
  }

  if (SAFE.test(w0)) continue;

  // git: only subcommands that write the working tree matter; everything else (commit, log, show, add…) is fine.
  if (w0 === "git") {
    if (w1 === "restore") {
      let src = "HEAD";
      const eq = args.find((a) => a.startsWith("--source="));
      const at = args.findIndex((a) => a === "-s" || a === "--source");
      if (eq) src = eq.slice("--source=".length);
      else if (at !== -1) src = args[at + 1] ?? "";
      if (/^HEAD$/i.test(src)) continue; // restoring from HEAD is the repair path
      for (const a of positional.slice(1)) guard(keyOf(a, vcwd), `git restore --source=${src} overwrites an applied migration`);
      continue;
    }
    if (w1 === "checkout") {
      const dd = args.indexOf("--");
      const refs = (dd === -1 ? [] : args.slice(1, dd)).filter((a) => !a.startsWith("-"));
      if (dd !== -1 && (refs.length === 0 || (refs.length === 1 && /^HEAD$/i.test(refs[0])))) continue; // repair path
      for (const a of positional.slice(1)) guard(keyOf(a, vcwd), "git checkout overwrites an applied migration");
      continue;
    }
    if (w1 === "rm" || w1 === "mv") {
      for (const a of positional.slice(1)) guard(keyOf(a, vcwd), `git ${w1} on an applied migration`);
      continue;
    }
    if (w1 === "apply" || w1 === "am") {
      if (args.some((a) => /^--(check|stat|numstat|summary)$/.test(a))) continue;
      for (const f of positional.slice(1)) checkPatch(resolve(vcwd, f));
      continue;
    }
    continue;
  }

  if (/^patch$/i.test(w0)) {
    const i = args.indexOf("-i");
    const file = i !== -1 ? args[i + 1] : seg.match(/<\s*([^\s<>|;&]+)/)?.[1];
    if (file) checkPatch(resolve(vcwd, file));
    continue;
  }

  if (/^find$/i.test(w0) && args.some((a) => /^-(delete|exec|execdir|ok)$/.test(a))) {
    for (const a of positional) guard(keyOf(a, vcwd), "find -delete/-exec on the migrations folder");
    continue;
  }

  const inPlace = (/^sed$/i.test(w0) && args.some((a) => /^-\w*i/.test(a) || a === "--in-place")) || (/^perl$/i.test(w0) && args.some((a) => /^-\w*i/.test(a)));
  if (ALL_ARGS.test(w0) || inPlace) {
    for (const a of positional) guard(keyOf(a, vcwd), `${w0} modifies an applied migration`);
    continue;
  }

  if (DEST_ONLY.test(w0)) {
    const d = args.findIndex((a) => /^-Destination$/i.test(a));
    const dest = d !== -1 ? args[d + 1] : positional[positional.length - 1];
    if (dest && (positional.length >= 2 || d !== -1)) guard(keyOf(dest, vcwd), `${w0} overwrites an applied migration`);
    continue;
  }
}
process.exit(0);

/** Read a patch file and block if it touches an applied migration. Unreadable patches are left to PostToolUse. */
function checkPatch(file) {
  if (!existsSync(file)) return;
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const m of text.matchAll(/^(?:diff --git a\/(\S+) b\/(\S+)|(?:---|\+\+\+) (?:[ab]\/)?(\S+))/gm)) {
    for (const p of [m[1], m[2], m[3]]) if (p && p !== "/dev/null") guard(keyOf(p, projectDir), "patch modifies an applied migration");
  }
}
