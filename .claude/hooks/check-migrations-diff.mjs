#!/usr/bin/env node
// owner: @skindyk · why: protect-migrations.mjs parses command text and can be bypassed (scripts, xargs, stdin patches); this checks what actually changed on disk · review-by: 2027-03-01
//
// PostToolUse hook for Bash/PowerShell. After each command, asks git whether any migration committed in HEAD is
// now modified, deleted or type-changed (working tree or index). If so: exit 2, and stderr tells the agent to
// restore it. The tool already ran, so this cannot prevent the change, but the agent is told immediately and
// knows how to undo it. It reports each new state once per session, so a change a human made before the session
// is mentioned once and does not nag on every command.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}
const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
const session = String(payload.session_id ?? "nosession").replace(/[^\w-]/g, "_");

let out = "";
try {
  out = execFileSync("git", ["diff", "--name-status", "--no-renames", "HEAD", "--", "db/migrations"], {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  process.exit(0); // no git / no HEAD: nothing to compare against
}

const changed = out
  .split(/\r?\n/)
  .map((l) => l.split("\t"))
  .filter(([status, path]) => path && /^[MDT]/.test(status)) // A (new file) is fine
  .map(([status, path]) => `${status[0]} ${path}`)
  .sort();

const stateFile = join(tmpdir(), `claude-migrations-${session}.txt`);
let previous = "";
try {
  previous = readFileSync(stateFile, "utf8");
} catch {}
const signature = changed.join("\n");
try {
  writeFileSync(stateFile, signature);
} catch {}

if (!changed.length || signature === previous) process.exit(0);

try {
  const line = [new Date().toISOString(), "POST-DETECT", payload.tool_name ?? "-", changed.join(","), session, "applied migration changed on disk"].join("\t");
  appendFileSync(join(projectDir, ".claude", "hooks", "protect-migrations.log"), line + "\n");
} catch {}

const files = changed.map((c) => c.slice(2));
process.stderr.write(
  `MIGRATION CHANGED — detected by .claude/hooks/check-migrations-diff.mjs after the last command:\n` +
    changed.map((c) => `  ${c}`).join("\n") +
    `\nThese migrations are applied (committed). Editing, deleting or renaming them is not allowed (AGENTS.md rule 1).\n` +
    `Restore them now:  git restore --source=HEAD --staged --worktree -- ${files.join(" ")}\n` +
    `Then put the change in a NEW migration db/migrations/NNN_<what>.sql (see .claude/skills/add-task-field/SKILL.md).\n`,
);
process.exit(2);
