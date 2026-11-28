// Tests for the PreToolUse hook: each case pipes a JSON payload into the script
// (as Claude Code does) and asserts the exit code. See docs/ai/hook-evidence.md.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const hook = fileURLToPath(new URL("./protect-migrations.mjs", import.meta.url));

function runHook(payload: string) {
  return spawnSync(process.execPath, [hook], {
    input: payload,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: "utf8",
  });
}

const payload = (file_path: string) =>
  JSON.stringify({ tool_name: "Edit", tool_input: { file_path } });

// On a case-sensitive FS (Linux CI) "DB/Migrations/…" is a genuinely different,
// non-existent path, so allowing it is correct — the case-variant test only
// applies where the FS resolves it to the applied migration.
const caseVariant = join(root, "DB", "Migrations", "001_create_tasks.sql");

it.runIf(existsSync(caseVariant))(
  "blocks an applied migration referenced with the wrong case",
  () => {
    const r = runHook(payload("DB/Migrations/001_create_tasks.sql"));
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/applied DB migration/);
  },
);

it("blocks a payload prefixed with a BOM (PowerShell pipes)", () => {
  const r = runHook(String.fromCodePoint(0xfeff) + payload("db/migrations/001_create_tasks.sql"));
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/applied DB migration/);
});

it("blocks .env files regardless of name case", () => {
  const r = runHook(payload(".ENV"));
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/env file/);
});

it("allows writing a new migration", () => {
  const r = runHook(payload("db/migrations/003_add_task_priority.sql"));
  expect(r.status).toBe(0);
});

it("allows editing a migration that exists but is not tracked by git yet", () => {
  // A migration the agent just created is untracked, so it stays editable until committed.
  const probe = join(root, "db", "migrations", "999_untracked_probe.sql");
  writeFileSync(probe, "-- probe: deleted by the test\n");
  try {
    const r = runHook(payload("db/migrations/999_untracked_probe.sql"));
    expect(r.status).toBe(0);
  } finally {
    rmSync(probe, { force: true });
  }
});

const bash = (command: string) => JSON.stringify({ tool_name: "Bash", tool_input: { command } });

it("blocks Bash commands that name an env file", () => {
  for (const cmd of ["cat .env", "cp .env.local /tmp/x", "type app\\.ENV", "grep SECRET ./.env.production"]) {
    const r = runHook(bash(cmd));
    expect(r.status, cmd).toBe(2);
    expect(r.stderr).toMatch(/\.env file/);
  }
});

it("allows Bash commands that only look similar to an env file name", () => {
  for (const cmd of ["npm test", 'node -e "console.log(process.env.HOME)"', "ls config.envrc", "git status"]) {
    expect(runHook(bash(cmd)).status, cmd).toBe(0);
  }
});

// PostToolUse backstop: runs against a throwaway git repo so the real migrations are never touched.
const postHook = fileURLToPath(new URL("./check-migrations-unchanged.mjs", import.meta.url));

it("PostToolUse: reports a committed migration changed by any tool, ignores new ones", () => {
  const repo = mkdtempSync(join(tmpdir(), "mig-hook-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: repo });
  const run = () =>
    spawnSync(process.execPath, [postHook], {
      input: bash("sed -i s/120/200/ db/migrations/001_a.sql"),
      env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
      encoding: "utf8",
    });
  try {
    mkdirSync(join(repo, "db", "migrations"), { recursive: true });
    const applied = join(repo, "db", "migrations", "001_a.sql");
    writeFileSync(applied, "create table t (x int);\n");
    git("init", "-q");
    git("add", ".");
    git("commit", "-qm", "init");

    writeFileSync(join(repo, "db", "migrations", "002_new.sql"), "alter table t add column y int;\n");
    expect(run().status).toBe(0); // a brand-new migration is fine

    writeFileSync(applied, "create table t (x bigint);\n"); // what `sed -i` / `echo >` would do
    const r = run();
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/db\/migrations\/001_a\.sql/);

    rmSync(applied); // deletion is a violation too
    expect(run().status).toBe(2);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
