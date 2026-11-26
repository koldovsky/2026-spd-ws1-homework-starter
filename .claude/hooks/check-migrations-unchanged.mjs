#!/usr/bin/env node
// owner: @JKord · why: the PreToolUse hook only sees file-edit tools; Bash (sed -i, echo >, cd … && sed) or MCP tools can still rewrite an applied migration · review-by: 2027-02-28
// PostToolUse hook for every tool: after the tool ran, asks git whether any committed file under db/migrations/
// was modified or deleted (staged or not, compared to HEAD). If so, exits 2 with the file list on stderr, so the
// agent is told immediately and must restore the file. New (untracked or newly added) migrations are not reported.
// PostToolUse cannot undo the change — it is a detector; the PreToolUse hook protect-migrations.mjs is the blocker
// for Edit/Write. Fails open if git is unavailable or HEAD does not exist.
import { execFileSync } from "node:child_process";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let changed;
try {
  changed = execFileSync(
    "git",
    ["diff", "--name-only", "--no-renames", "--diff-filter=MD", "HEAD", "--", "db/migrations/"],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
} catch {
  process.exit(0);
}

if (changed.length > 0) {
  console.error(
    `Blocked: applied DB migration(s) were modified or deleted: ${changed.join(", ")}. ` +
      `Restore them with \`git restore --source=HEAD --staged --worktree -- ${changed.join(" ")}\` ` +
      `and put the change into a new file db/migrations/00N_name.sql instead — see .claude/rules/migrations.md.`,
  );
  process.exit(2);
}

process.exit(0);
