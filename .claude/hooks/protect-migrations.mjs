#!/usr/bin/env node
// owner: @artem-tkachenko · why: lib/db.ts skips applied migrations by file name, so editing one silently makes schemas diverge between databases · review-by: 2027-05-23
//
// PreToolUse hook. Blocks Edit/MultiEdit and overwrites of existing db/migrations/*.sql files.
// New migration files are allowed. Bash detection is best-effort, not a sandbox; see docs/ai/hook-evidence.md.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(HOOK_DIR, "protect-migrations.log");
const MIGRATIONS = "db/migrations/";
const WRITE_OPERATOR = /(?:^|\s)(?:>|>>|tee|mv|rm|cp|truncate|install|dd|rsync|awk|sed|perl|python\w*|node|patch|touch)(?:\s|$)|\bgit\s+(?:apply|checkout|restore|reset|mv)\b/i;

function log(decision, tool, target) {
  try {
    appendFileSync(LOG_FILE, `${new Date().toISOString()} ${decision} ${tool} ${target}\n`);
  } catch {
    // logging must never break the hook
  }
}

function block(tool, target, reason) {
  log("BLOCK", tool, target);
  process.stderr.write(
    `Blocked by protect-migrations hook: ${reason}\n` +
      `Applied migrations in ${MIGRATIONS} must never be edited (see docs/ai/team-agreement.md, L0).\n` +
      `To change the schema, create a NEW numbered file, e.g. ${MIGRATIONS}003_<what>.sql, after the developer approves.\n`,
  );
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.stderr.write("Blocked by protect-migrations hook: could not parse PreToolUse payload.\n");
  process.exit(2);
}

const tool = payload.tool_name ?? "";
const input = payload.tool_input ?? {};
const root = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();

function repoPath(filePath) {
  const abs = isAbsolute(filePath) ? filePath : resolve(payload.cwd || root, filePath);
  return relative(root, abs).split(sep).join("/");
}

if (["Edit", "MultiEdit", "Write"].includes(tool) && typeof input.file_path === "string") {
  const rel = repoPath(input.file_path);
  if (rel.startsWith(MIGRATIONS) && rel.endsWith(".sql")) {
    const exists = existsSync(join(root, rel));
    if (tool !== "Write" || exists) block(tool, rel, `${tool} on existing migration ${rel}.`);
    log("ALLOW", tool, `${rel} (new migration)`);
  }
} else if (tool === "Bash" && typeof input.command === "string") {
  const cmd = input.command;
  // If command might write through shell, interpreter, copy, rename or deletion, fail closed whenever it mentions
  // the migrations directory or a path under db/ that might be relative to a preceding `cd db`.
  const mentionsDb = /(?:^|[\s"'=:/<>|;&(])(?:\.\/)?db(?:\/|\b)/i.test(cmd);
  const mentionsMigration = /(?:migrations|migr\*|migrations\*)/i.test(cmd);
  const writesMigrationPath = /(?:^|[\s"'=:/<>|;&(])(?:\.\/)?migrations(?:\/|\b)/i.test(cmd);
  const couldWrite = WRITE_OPERATOR.test(cmd) || /\b(?:find|xargs)\b/i.test(cmd);
  if (couldWrite && (cmd.includes(MIGRATIONS) || (mentionsDb && mentionsMigration) || writesMigrationPath)) {
    block(tool, JSON.stringify(cmd), "this command may modify a migration file.");
  }
}

process.exit(0);
