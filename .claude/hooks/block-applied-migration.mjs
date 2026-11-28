#!/usr/bin/env node
// owner: @vitalii-liashenko · why: editing an applied migration silently diverges from databases that already ran it (lib/db.ts skips files by name) · review-by: 2027-02-23
//
// PreToolUse hook. Blocks Edit/Write/MultiEdit on an EXISTING file in db/migrations/.
// Creating a new migration file is allowed. Exit 2 blocks the tool call and shows stderr to the agent.
// Every decision is appended to .claude/hooks/block-applied-migration.log (git-ignored).

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const logFile = join(root, ".claude", "hooks", "block-applied-migration.log");

function log(line) {
  try {
    mkdirSync(dirname(logFile), { recursive: true });
    appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);
  } catch {
    // logging must never change the decision
  }
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // not a tool payload we can read: do not block
}

const tool = input.tool_name ?? "";
if (!["Edit", "Write", "MultiEdit"].includes(tool)) process.exit(0);

const rawPath = input.tool_input?.file_path;
if (!rawPath) process.exit(0);

const abs = isAbsolute(rawPath) ? rawPath : resolve(root, rawPath);
const rel = relative(root, abs).split(/[\\/]/).join("/");
if (!/^db\/migrations\/[^/]+\.sql$/.test(rel)) process.exit(0);

if (!existsSync(abs)) {
  log(`ALLOW ${tool} new migration ${rel}`);
  process.exit(0);
}

log(`BLOCK ${tool} existing migration ${rel}`);
process.stderr.write(
  `BLOCKED: ${rel} is an applied migration. Never edit or rename it. ` +
    `Add a new, next-numbered file in db/migrations/ instead (see .claude/rules/migrations.md).\n`,
);
process.exit(2);
