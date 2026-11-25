// owner: @mmelnyk-spd · why: applied migrations are immutable; editing them corrupts databases · review-by: 2027-05-25

import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

// Read tool input from stdin (Claude Code sends JSON payload)
const input = JSON.parse(readFileSync("/dev/stdin", "utf8"));
const filePath = input.tool_input?.file_path ?? input.tool_input?.command ?? "";

// Get list of existing migration files
let existingMigrations = [];
try {
  existingMigrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => `db/migrations/${f}`);
} catch {
  // migrations dir might not exist yet — nothing to protect
  process.exit(0);
}

// Check if the tool is trying to edit/write an existing migration
const normalizedPath = filePath.replace(/^\.\//, "");
if (existingMigrations.some((m) => normalizedPath.endsWith(m) || normalizedPath === m)) {
  process.stderr.write(
    `BLOCKED: Cannot edit existing migration "${normalizedPath}". ` +
    `Applied migrations are immutable. Create a new migration file instead.\n`
  );
  process.exit(2);
}
