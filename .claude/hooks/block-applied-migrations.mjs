// owner: @AlexGLT · why: applied migrations are tracked in schema_migrations; editing one makes fresh and existing databases differ, so a new migration must be added instead · review-by: 2027-04-24
//
// PreToolUse hook. Blocks changes to a migration file that already exists in db/migrations/.
// A new file (for example 003_*.sql) is allowed.
//   - Edit, Write, MultiEdit: checks tool_input.file_path.
//   - Bash, PowerShell: checks tool_input.command. It blocks when the command names an existing
//     migration file (or a wildcard in db/migrations) AND contains a write word (>, sed -i, tee,
//     Set-Content, rm, mv, writeFileSync, ...).
// Known limit: shell checks read the command text only. A command that builds the path from pieces
// can pass. Copying FROM a migration (cp 002_x.sql 003_x.sql) is allowed on purpose.
// Exit 2 blocks the call and sends stderr to the agent. Exit 0 allows the call.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const FILE_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

// Words that change a file. Read-only commands (cat, ls, git diff, Get-Content) are not listed.
const WRITE_WORDS = [
  /\bsed\b[^|;&\n]*\s-[a-z]*i/i, // sed -i
  /\bperl\b[^|;&\n]*\s-[a-z]*i/i, // perl -pi
  /\b(tee|rm|del|erase|mv|move|ren|rename|truncate|dd|ed|ex)\b/i,
  /\b(Set-Content|Add-Content|Out-File|Clear-Content|Remove-Item|Move-Item|Rename-Item|New-Item)\b/i,
  /\b(writeFile|writeFileSync|appendFile|appendFileSync|truncateSync|unlinkSync|rmSync|renameSync)\b/,
  /\bopen\([^)]*,\s*['"][wa]/, // python open(..., "w")
];

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // Unreadable payload: do not block work because of a hook problem.
  process.exit(0);
}

const toolName = payload?.tool_name;
const toolInput = payload?.tool_input ?? {};
const projectDir = process.env.CLAUDE_PROJECT_DIR || payload?.cwd || process.cwd();
const migrationsDir = path.resolve(projectDir, "db", "migrations");

function block(name) {
  console.error(
    `BLOCKED: ${name} is an applied migration. ` +
      `Do not edit it. Create a new numbered file in db/migrations/ instead (for example 003_<name>.sql). ` +
      `Rule: docs/ai/team-agreement.md, "Editing an applied migration" is L0.`
  );
  process.exit(2);
}

function existingMigrations() {
  try {
    return readdirSync(migrationsDir);
  } catch {
    return [];
  }
}

if (FILE_TOOLS.has(toolName) && typeof toolInput.file_path === "string") {
  const target = path.resolve(projectDir, toolInput.file_path);
  const relative = path.relative(migrationsDir, target);
  const insideMigrations =
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  if (insideMigrations && existsSync(target)) {
    block(path.basename(target));
  }
}

if (SHELL_TOOLS.has(toolName) && typeof toolInput.command === "string") {
  // Remove harmless redirects (2>&1, > /dev/null, > $null) so reading a file does not look like writing.
  const command = toolInput.command
    .replace(/\d*>&\d+/g, " ")
    .replace(/\d*>>?\s*(\/dev\/null|\$null|NUL)\b/gi, " ");
  const lower = command.toLowerCase();

  const namedFile = existingMigrations().find((name) => lower.includes(name.toLowerCase()));
  const wildcardOnDir = /migrations[\\/]+[^\s'"]*[*?]/i.test(command);
  const writes = WRITE_WORDS.some((word) => word.test(command)) || /(^|[^-=])>/.test(command);

  if ((namedFile || wildcardOnDir) && writes) {
    block(namedFile ?? "a file matched by a wildcard in db/migrations/");
  }
}

process.exit(0);
