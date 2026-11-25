#!/usr/bin/env node
// owner: @SayidJarrah · why: lib/db.ts applies each migration once; an edit to an applied (git-tracked) file never reaches existing DBs and schemas drift silently · review-by: 2027-05-25
//
// PreToolUse hook. Blocks Edit/Write/MultiEdit/NotebookEdit on a migration that is already tracked by git, and
// Bash commands that write to one. New, untracked migration files stay editable.
// Exit 0 = allow, exit 2 = block (stderr is shown to the agent). Every block is appended to protect-migrations.log.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOG = join(ROOT, ".claude", "hooks", "protect-migrations.log");
const MIGRATION = /^db\/migrations\/[^/]+\.sql$/;

function tracked(rel) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", rel], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function toRel(p) {
  const abs = isAbsolute(p) ? p : join(ROOT, p);
  return relative(ROOT, abs).split("\\").join("/");
}

function block(tool, target, why) {
  const msg =
    `BLOCKED by .claude/hooks/protect-migrations.mjs: ${target} is an applied migration (tracked in git). ` +
    `lib/db.ts runs each migration once, so editing it never reaches existing databases. ` +
    `Create a new file db/migrations/NNN_<what>.sql with the next number instead (see .claude/rules/migrations.md).`;
  appendFileSync(LOG, `${new Date().toISOString()} BLOCK tool=${tool} target=${target} via=${why}\n`);
  process.stderr.write(msg + "\n");
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // not our business; never break the session on a bad payload
}
const tool = payload.tool_name ?? "";
const input = payload.tool_input ?? {};

if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
  const rel = toRel(input.file_path ?? input.notebook_path ?? "");
  if (MIGRATION.test(rel) && tracked(rel)) block(tool, rel, "file tool");
}

if (tool === "Bash") {
  const cmd = String(input.command ?? "");
  const writes = /(\bsed\s+-i|\bperl\s+-[a-z]*i|>>?|\btee\b|\bmv\b|\bcp\b|\brm\b|\btruncate\b|\bgit\s+(checkout|restore)\b)/;
  if (writes.test(cmd)) {
    for (const m of cmd.matchAll(/db\/migrations\/[\w.-]+\.sql/g)) {
      if (tracked(m[0])) block(tool, m[0], `bash: ${cmd.slice(0, 120)}`);
    }
  }
}

process.exit(0);
