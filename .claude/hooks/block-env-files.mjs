// owner: @AlexGLT · why: .env* files hold secrets; the agent must not read or change them, and secrets must not enter the chat context · review-by: 2027-05-25
//
// PreToolUse hook. Blocks Read, Edit, Write and MultiEdit on any file whose name starts with ".env".
// Blocks Bash when a command names a file that starts with ".env" (for example "cat .env").
// Exit 2 blocks the call and sends stderr to the agent. Exit 0 allows the call.

import { readFileSync } from "node:fs";
import path from "node:path";

const FILE_TOOLS = new Set(["Read", "Edit", "Write", "MultiEdit"]);

// A path token that starts with ".env": at the start, or after a space, quote, slash, backslash, "=" or ">" / "<".
// "process.env.DB_FILE" does not match, because "." follows "process".
const ENV_IN_COMMAND = /(^|[\s"'`/\\=<>])\.env[^\s"'`]*/;

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // Unreadable payload: do not block work because of a hook problem.
  process.exit(0);
}

function block(what) {
  console.error(
    `BLOCKED: ${what} is a .env* file. ` +
      `Do not read or change .env* files. They can hold secrets. ` +
      `Ask the user to read or change the file themselves.`
  );
  process.exit(2);
}

const tool = payload?.tool_name;

if (FILE_TOOLS.has(tool)) {
  const filePath = payload?.tool_input?.file_path;
  if (typeof filePath === "string" && path.basename(filePath).startsWith(".env")) {
    block(path.basename(filePath));
  }
}

if (tool === "Bash") {
  const command = payload?.tool_input?.command;
  if (typeof command === "string") {
    const match = ENV_IN_COMMAND.exec(command);
    if (match) block(match[0].trim());
  }
}

process.exit(0);
