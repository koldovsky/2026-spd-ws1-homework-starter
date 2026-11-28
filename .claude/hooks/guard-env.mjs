#!/usr/bin/env node
// owner: @Kurkov1990 · why: AGENTS.md rule 4 — no .env* access except .env.example; a `Read(./.env.*)` deny also blocked .env.example · review-by: 2027-03-23
// PreToolUse for Read/Edit/Write/MultiEdit/NotebookEdit/Grep/Bash. Blocks (exit 2):
//   - a file tool on .env or .env.<anything> except .env.example (any folder, any case);
//   - Grep whose `path` is such a file or whose `glob` targets .env files;
//   - a Bash command that names such a file (cat .env, source .env, < .env, grep X .env.local, …);
//   - a recursive grep (grep -r/-R) or an ignore-disabling rg (-u, --no-ignore) while a secret .env file exists in the
//     project, unless it passes --exclude='.env*' (rg/the Grep tool skip .env by default via .gitignore).
// Not covered (known limit): indirect reads such as `node -e "fs.readFileSync('.e'+'nv')"` or `find . -exec cat {} +`.
// Payload: a BOM is stripped; malformed JSON blocks the call (fail closed) — see docs/ai/hook-evidence.md.
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const FILE_TOOLS = new Set(["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next"]);

function block(reason) {
  process.stderr.write(`guard-env: ${reason} Agents read and write only .env.example (AGENTS.md rule 4).\n`);
  process.exit(2);
}

function isSecretName(p) {
  const name = basename(String(p)).toLowerCase();
  return (name === ".env" || name.startsWith(".env.")) && name !== ".env.example";
}

/** Secret .env files in the project, up to 3 folders deep. */
function secretFilesExist(dir = root, depth = 0) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((e) =>
    e.isDirectory()
      ? depth < 3 && !SKIP_DIRS.has(e.name) && secretFilesExist(join(dir, e.name), depth + 1)
      : isSecretName(e.name),
  );
}

function stripHeredocs(cmd) {
  const kept = [];
  let tag;
  for (const line of cmd.split("\n")) {
    if (tag) {
      if (line.trim() === tag) tag = undefined;
      continue;
    }
    kept.push(line);
    tag = /(?<!<)<<-?\s*['"]?(\w+)/.exec(line)?.[1];
  }
  return kept.join("\n");
}

function checkBash(command) {
  const cmd = stripHeredocs(command).replaceAll(/['"\\]/g, "");
  const named = cmd.split(/[\s;|&()<>`$=]+/).find(isSecretName);
  if (named) block(`the command names ${named}, which may hold secrets.`);

  if (!secretFilesExist()) return;
  for (const seg of cmd.split(/\n|;|&&|\|\||\|/)) {
    const words = seg.trim().split(/\s+/);
    const bin = basename(words[0] ?? "");
    const excludesEnv = words.some((w) => w.startsWith("--exclude") && w.includes(".env"));
    const recursiveGrep =
      ["grep", "egrep", "fgrep"].includes(bin) &&
      words.some((w) => /^-[a-zA-Z]*[rR]/.test(w) || w === "--recursive" || w === "--dereference-recursive");
    const unignoredRg = bin === "rg" && words.some((w) => /^-[a-zA-Z]*u/.test(w) || w === "--no-ignore");
    if ((recursiveGrep || unignoredRg) && !excludesEnv) {
      block(
        `"${seg.trim().slice(0, 80)}" would also search the project's .env files. ` +
          `Use the Grep tool or plain rg (both skip .env via .gitignore), or add --exclude='.env*'.`,
      );
    }
  }
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8").replace(/^\uFEFF/, ""));
} catch {
  block("could not parse the hook payload, so the call is blocked to be safe (fail closed).");
}
const tool = payload?.tool_name ?? "";
const input = payload?.tool_input ?? {};

if (FILE_TOOLS.has(tool)) {
  const file = input.file_path ?? input.notebook_path ?? "";
  if (isSecretName(file)) block(`${basename(String(file))} may hold secrets.`);
} else if (tool === "Grep") {
  if (isSecretName(input.path ?? "")) block(`Grep on ${basename(String(input.path))}, which may hold secrets.`);
  if (/(^|[/{,])\.env/i.test(String(input.glob ?? "")) && !/^\.env\.example$/i.test(String(input.glob)))
    block(`Grep glob "${input.glob}" targets .env files.`);
} else if (tool === "Bash") {
  checkBash(String(input.command ?? ""));
}
process.exit(0);
