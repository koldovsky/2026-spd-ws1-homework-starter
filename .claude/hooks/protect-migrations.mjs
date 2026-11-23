#!/usr/bin/env node
// owner: @oksanastrohetska-lab
// why: Prevent AI agents from modifying existing SQL migrations (Node, so it runs wherever the repo runs).
// review-by: 2027-04-23

import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const MIGRATION_DIR = "db/migrations";

function block(reason) {
  console.error(`BLOCKED: ${reason}`);
  process.exit(2);
}

// Fail closed: any unexpected error blocks the call instead of letting it through.
process.on("uncaughtException", (err) => block(`Hook error: ${err.message}`));

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

let event;
try {
  event = JSON.parse(readFileSync(0, "utf8"));
} catch {
  block("Invalid JSON hook input.");
}
if (!event || typeof event !== "object") block("Invalid hook event.");

const tool = event.tool_name;
const args = event.tool_input;

if (tool === "Bash") {
  const raw = args && typeof args === "object" ? args.command : "";
  if (typeof raw !== "string") block("Invalid Bash command.");
  // Normalise Windows separators so `db\migrations` and `.\db\migrations` match too.
  const cmd = raw.replace(/\\/g, "/");
  const mentionsDir = /(^|[^\w-])db\/+migrations\b/.test(cmd);
  const writes =
    /\bsed\b[^;&|\n]*\s-[a-zA-Z]*i|\bperl\b[^;&|\n]*\s-[a-zA-Z]*i|\btee\b|>|\brm\b|\bmv\b|\bcp\b|\btruncate\b|\bdd\b|\bgit\s+(checkout|restore|rm)\b|Set-Content|Out-File|Add-Content|Remove-Item/.test(
      cmd,
    );
  // Verb and path may be anywhere in the command: `cd db/migrations && sed -i ...` must be caught.
  if (mentionsDir && writes) {
    block(
      "Shell commands must not modify files in db/migrations/. Create a new numbered migration instead.",
    );
  }
  process.exit(0);
}

if (tool !== "Write" && tool !== "Edit" && tool !== "MultiEdit") process.exit(0);

if (!args || typeof args !== "object") block("Invalid tool arguments.");
const filename = args.file_path;
if (typeof filename !== "string" || !filename) block("Missing file_path.");

const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd());
const target = path.resolve(root, filename);
const rel = path.relative(path.resolve(root, MIGRATION_DIR), target);
const inside = rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));

if (inside && isFile(target)) {
  block(
    `Existing migration cannot be modified: ${path.relative(root, target)}. Create a new numbered migration instead.`,
  );
}