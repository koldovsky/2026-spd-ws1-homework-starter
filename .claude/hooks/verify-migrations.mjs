// owner: @evgenyadev · why: protect-migrations.mjs parses commands and can be fooled (xargs, find -exec, node -e, git checkout <rev> --); this checks the result instead · review-by: 2027-02-26
//
// PostToolUse hook. After a tool call, reports applied migrations (tracked in git) that now differ from HEAD:
// modified, deleted or renamed. New files are fine.
// Exit 2 = tell the agent; the tool already ran, so this cannot block, only report. Exit 0 = clean.
// It does not revert on its own: a human may have changed the file on purpose, and a revert would destroy that work.
// Fails open on a malformed payload or a git error, and logs it.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = "db/migrations/";
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const logFile = process.env.PROTECT_MIGRATIONS_LOG ?? join(projectDir, ".claude", "hooks", "protect-migrations.log");

function log(entry) {
  try {
    appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), hook: "verify", ...entry }) + "\n");
  } catch {
    // Logging must never change the decision.
  }
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, ""));
} catch (e) {
  log({ decision: "allow", error: `unreadable payload: ${e.message}` });
  process.exit(0);
}

let changed;
try {
  const cwd = payload.cwd ?? projectDir;
  const root =
    process.env.CLAUDE_PROJECT_DIR ??
    execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" }).trim();
  // Compared with HEAD: catches staged and unstaged changes alike. "A" lines are new files, which are allowed.
  const out = execFileSync("git", ["diff", "--name-status", "HEAD", "--", MIGRATIONS], { cwd: root, encoding: "utf8" });
  changed = out
    .split("\n")
    .filter(Boolean)
    .filter((line) => !line.startsWith("A"));
} catch (e) {
  log({ decision: "allow", error: `git failed: ${e.message.split("\n")[0]}` });
  process.exit(0);
}

if (changed.length) {
  const files = changed.map((line) => line.split("\t").pop());
  log({ decision: "detected", tool: payload.tool_name, targets: files });
  process.stderr.write(
    `Applied migration changed after ${payload.tool_name}:\n` +
      changed.map((line) => `  ${line.replace("\t", " ")}\n`).join("") +
      `Committed migrations must not change (see .claude/rules/migrations.md). If you changed it, restore it:\n` +
      `  git restore --source=HEAD --staged --worktree -- ${files.join(" ")}\n` +
      `and add a new db/migrations/<next number>_<name>.sql instead. If a human changed it on purpose, leave it and say so.\n`,
  );
  process.exit(2);
}

process.exit(0);
