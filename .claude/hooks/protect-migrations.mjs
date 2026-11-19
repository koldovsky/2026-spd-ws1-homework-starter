#!/usr/bin/env node
// owner: @JKord · why: an applied migration was edited once, silently changing schema history for everyone who had already run it; .env files must never be created or edited by agents · review-by: 2027-02-28
// PreToolUse hook for Edit|MultiEdit|Write: reads the JSON payload from stdin, exits 2 (blocking) when
// tool_input.file_path is an existing file in db/migrations/ or any .env / .env.* file (at any depth).
// Paths resolve against $CLAUDE_PROJECT_DIR (falls back to cwd), so the hook works after the agent `cd`s.
// Works on Windows and POSIX: path handling via node:path, no shell builtins.
import { existsSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

let payload;
try {
  payload = JSON.parse(raw.replace(/^﻿/, "")); // Windows PowerShell pipes may prepend a BOM
} catch {
  process.exit(0); // not our payload — fail open
}

const filePath = payload?.tool_input?.file_path;
if (typeof filePath !== "string" || filePath.length === 0) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const abs = resolve(root, filePath);
const rel = relative(root, abs).replaceAll("\\", "/");
const name = basename(abs);
// Windows file systems are case-insensitive: "DB/Migrations/001.sql" is the same file.
const relKey = process.platform === "win32" ? rel.toLowerCase() : rel;

// .env / .env.* anywhere in the repo — block creation and edits alike.
const nameKey = process.platform === "win32" ? name.toLowerCase() : name;
if (nameKey === ".env" || nameKey.startsWith(".env.")) {
  console.error(
    `Blocked: "${rel}" is an env file and may contain secrets. Agents never create or edit .env files — ask the repo owner (@JKord).`,
  );
  process.exit(2);
}

// Existing migrations are immutable; new ones (Write of a not-yet-existing file) are allowed.
if (relKey.startsWith("db/migrations/") && existsSync(abs)) {
  console.error(
    `Blocked: "${rel}" is an applied DB migration and must not be edited. ` +
      `Create a new file db/migrations/00N_name.sql with the next free number instead — see .claude/rules/migrations.md.`,
  );
  process.exit(2);
}

process.exit(0);
