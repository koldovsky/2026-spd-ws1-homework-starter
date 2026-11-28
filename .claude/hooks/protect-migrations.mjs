#!/usr/bin/env node
// owner: @vovchik-manko · why: applied migrations must never be edited; a rule is advice, this hook blocks the edit · review-by: 2027-03-31
// PreToolUse hook. Reads the tool call as JSON on stdin. Exit 2 blocks the call; stderr is shown as the reason.
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let payload;
try {
  payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  process.exit(0); // not a tool payload we understand: do not block
}

const filePath = payload?.tool_input?.file_path;
if (typeof filePath !== "string") process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const absolute = resolve(projectDir, filePath);
const relativePath = relative(projectDir, absolute).split("\\").join("/");

// A new migration file (does not exist yet) is allowed. An existing one is applied history.
const isMigration = relativePath.startsWith("db/migrations/") && relativePath.endsWith(".sql");
if (isMigration && existsSync(absolute)) {
  process.stderr.write(
    `Blocked: ${relativePath} is an existing migration. Applied migrations are immutable. ` +
      "Add a new file in db/migrations/ with the next number instead.\n",
  );
  process.exit(2);
}

process.exit(0);
