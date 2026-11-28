// owner: @garnaga · why: an agent edited the applied 002 migration instead of adding 003, silently rewriting history for every existing DB · review-by: 2027-02-25
// PreToolUse hook for files under db/migrations/:
//   - Edit/MultiEdit/NotebookEdit on any db/migrations/ path: block (they always modify existing files).
//   - Write to an existing db/migrations/ file: block (applied migrations are immutable).
//   - Write to a NEW db/migrations/NNN_snake_case_name.sql: allow (the correct way to change schema).
//   - Write to any other new db/migrations/ path: block.
// Exit 0 = allow, exit 2 = block (stderr is shown to the model as the reason).
// Fail open: malformed stdin must never block a tool call.

import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'NotebookEdit']);
const PROTECTED_PREFIX = 'db/migrations/';
const NEW_MIGRATION_NAME = /^\d{3}_[a-z0-9_]+\.sql$/;

let raw = '';
for await (const chunk of createInterface({ input: process.stdin })) {
  raw += chunk;
}

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0); // fail open
}

const toolName = typeof payload?.tool_name === 'string' ? payload.tool_name : '';
const toolInput = payload?.tool_input ?? {};
const filePath =
  typeof toolInput.file_path === 'string'
    ? toolInput.file_path
    : typeof toolInput.notebook_path === 'string'
      ? toolInput.notebook_path
      : '';

if (!filePath) {
  process.exit(0);
}

// Normalize: strip backslashes, a leading repo-root prefix (Claude Code often
// passes absolute paths), and leading ./ or / so every spelling of a
// db/migrations/ path is caught.
let normalized = filePath.replace(/\\/g, '/');
const cwdPrefix = process.cwd() + '/';
if (normalized.startsWith(cwdPrefix)) {
  normalized = normalized.slice(cwdPrefix.length);
}
normalized = normalized.replace(/^\.{1,2}\//, '').replace(/^\//, '');

if (!normalized.startsWith(PROTECTED_PREFIX)) {
  process.exit(0);
}

const isEditTool = EDIT_TOOLS.has(toolName);
const isWriteTool = toolName === 'Write';
if (!isEditTool && !isWriteTool) {
  process.exit(0); // non-modifying tools (Read, Glob, ...) are fine
}

// Edit/MultiEdit/NotebookEdit always target an existing file: block outright.
if (isEditTool) {
  block(filePath);
}

// Write: allow only creating a new, correctly named migration.
const exists = existsSync(normalized);
if (exists) {
  block(filePath); // overwriting an applied migration
}

const basename = normalized.slice(normalized.lastIndexOf('/') + 1);
if (!NEW_MIGRATION_NAME.test(basename)) {
  block(filePath); // new file under db/migrations/ but not a numbered migration
}

process.exit(0);

function block(path) {
  process.stderr.write(
    `BLOCKED: ${path} is under db/migrations/. Applied migrations are immutable — ` +
      'never edit or overwrite them; schema changes are new forward-only files ' +
      'named NNN_snake_case_name.sql (see .claude/skills/add-migration/SKILL.md).\n'
  );
  process.exit(2);
}
