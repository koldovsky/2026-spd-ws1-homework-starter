#!/usr/bin/env node
// owner: @RudyRoom1 · why: lib/db.ts applies each db/migrations/*.sql once by file name, so editing an applied migration silently diverges every existing DB · review-by: 2027-03-01
//
// PreToolUse hook. Blocks (exit 2) edits to migrations that are already tracked in git ("applied").
// New, untracked migration files stay editable. Every block is appended to .claude/hooks/protect-migrations.log.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const logFile = join(projectDir, ".claude", "hooks", "protect-migrations.log");

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0); // not our business to break the session on bad input
}

const tool = payload.tool_name ?? "";
const input = payload.tool_input ?? {};

function toRepoPath(p) {
  const rel = isAbsolute(p) ? relative(projectDir, p) : p;
  return rel.split("\\").join("/").replace(/^\.\//, "");
}

function isTracked(repoPath) {
  try {
    const out = execFileSync("git", ["ls-files", "--", repoPath], { cwd: projectDir, encoding: "utf8" });
    return out.trim().length > 0;
  } catch {
    return true; // no git available: fail closed for existing migration paths
  }
}

function block(target) {
  const reason =
    `BLOCKED by protect-migrations hook: ${target} is an applied migration and is immutable. ` +
    `lib/db.ts runs each migration once by file name, so edits never reach existing databases. ` +
    `Add a new file db/migrations/NNN_<what>.sql instead (see .claude/skills/add-migration/SKILL.md).`;
  try {
    mkdirSync(dirname(logFile), { recursive: true });
    appendFileSync(logFile, `${new Date().toISOString()} BLOCK tool=${tool} target=${target}\n`);
  } catch {}
  process.stderr.write(reason + "\n");
  process.exit(2);
}

const MIGRATION = /^db\/migrations\/[^/]+\.sql$/;

if (["Edit", "Write", "MultiEdit"].includes(tool) && typeof input.file_path === "string") {
  const p = toRepoPath(input.file_path);
  if (MIGRATION.test(p) && isTracked(p)) block(p);
}

if (tool === "Bash" && typeof input.command === "string") {
  // Best effort: catches in-place edits, overwrites, deletes and renames of migration files via the shell.
  const cmd = input.command;
  const files = cmd.match(/db\/migrations\/[\w.-]+\.sql/g) ?? [];
  const mutating = /(\bsed\s+[^|;&]*-i|\bperl\s+[^|;&]*-i|>{1,2}\s*\S*db\/migrations\/|\brm\b|\bmv\b|\btruncate\b|\bgit\s+(checkout|restore)\b)/;
  if (mutating.test(cmd)) {
    for (const f of files) if (isTracked(f)) block(f);
  }
}

process.exit(0);
