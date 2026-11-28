#!/usr/bin/env node
// owner: @artem-tkachenko · why: Read deny rules do not cover shell commands or broad searches; prevent ordinary .env access paths · review-by: 2027-05-23
//
// PreToolUse hook. Blocks access to `.env` / `.env.*`, except `.env.example`, via Read/Grep/Edit/Write/Bash.
// This is a best-effort guard, NOT a security sandbox: arbitrary scripts, symlinks, aliases, or obfuscated shell
// commands may evade string matching. Never put real secrets in a repository accessible to an agent.

import { appendFileSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LOG_FILE = join(dirname(fileURLToPath(import.meta.url)), "protect-secrets.log");
const ALLOWED = ".env.example";
const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const BASH_ENV = /(?:^|[\s"'=:/<>|;&(])(\.env(?:\.[\w.-]+)?(?:\.\*|\*)?)(?=$|[\s"'|;&)<>])/g;
const ENV_GLOB = /(?:^|[\s"'=:/<>|;&(])\.env\*(?=$|[\s"'|;&)<>])/;
const RECURSIVE_SEARCH = /\b(?:grep|rg)\b[^;\n]*(?:\s-r(?:\s|$)|\s-R(?:\s|$)|--recursive)\b/i;
const FIND_AND_READ = /\bfind\b[^;\n]*(?:-exec\b|\|\s*xargs\b)[^;\n]*\b(?:cat|head|tail|grep|rg|sed|awk)\b/i;

function isEnvFile(path) {
  const name = basename(path);
  // A shell glob such as `.env*` may expand to real secret files; conservatively block it.
  if ((name.includes("*") || name.includes("?")) && name.startsWith(".env")) return true;
  return (name === ".env" || name.startsWith(".env.")) && name !== ALLOWED;
}

function isProjectRoot(path) {
  if (typeof path !== "string" || path === "") return true;
  const abs = isAbsolute(path) ? resolve(path) : resolve(ROOT, path);
  return abs === resolve(ROOT);
}

function block(tool, target) {
  try {
    appendFileSync(LOG_FILE, `${new Date().toISOString()} BLOCK ${tool} ${target}\n`);
  } catch {
    // logging must never break the hook
  }
  process.stderr.write(
    `Blocked by protect-secrets hook: ${tool} would read or change ${target}.\n` +
      `.env files may hold real secrets and must never be read by the agent (see AGENTS.md, Hard rules).\n` +
      `Use .env.example to see which variables exist; ask the developer for anything else.\n`,
  );
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.stderr.write("Blocked by protect-secrets hook: could not parse PreToolUse payload.\n");
  process.exit(2);
}

const tool = payload.tool_name ?? "";
const input = payload.tool_input ?? {};
const filePath = input.file_path ?? (tool === "Grep" ? input.path : undefined);

if (typeof filePath === "string" && isEnvFile(filePath)) block(tool, filePath);
// A repository-wide Grep (implicit path, '.', or the root path) can include an ignored .env file.
if (tool === "Grep" && isProjectRoot(filePath)) block(tool, filePath || "project-wide search");

if (tool === "Bash" && typeof input.command === "string") {
  const command = input.command;
  for (const match of command.matchAll(BASH_ENV)) {
    if (isEnvFile(match[1])) block(tool, JSON.stringify(command));
  }
  // Globs and recursive searches can read ignored files without naming them explicitly.
  if (ENV_GLOB.test(command) || RECURSIVE_SEARCH.test(command) || FIND_AND_READ.test(command)) block(tool, JSON.stringify(command));
}

process.exit(0);
