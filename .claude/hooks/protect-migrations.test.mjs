// owner: @evgenyadev · why: the hook is a gate; a gate without its own test silently rots (false blocks or no blocks) · review-by: 2027-02-20
// Run: npm run hook:test

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = join(import.meta.dirname, "..", "..");
const hook = join(import.meta.dirname, "protect-migrations.mjs");
const logFile = join(import.meta.dirname, "test-run.log");

// env: extra variables; a variable set to undefined is removed (e.g. CLAUDE_PROJECT_DIR, to test the git fallback).
function run(tool_name, tool_input, cwd = root, env = {}) {
  const merged = { ...process.env, CLAUDE_PROJECT_DIR: root, PROTECT_MIGRATIONS_LOG: logFile, ...env };
  for (const [k, v] of Object.entries(merged)) if (v === undefined) delete merged[k];
  const r = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_name, tool_input, cwd }),
    env: merged,
    encoding: "utf8",
  });
  return { code: r.status, stderr: r.stderr };
}

const applied = "db/migrations/001_create_tasks.sql";

test.after(() => rmSync(logFile, { force: true }));

test("blocks Edit of an applied migration, relative path", () => {
  const r = run("Edit", { file_path: applied });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /applied migration/);
});

test("blocks Write of an applied migration, absolute path", () => {
  assert.equal(run("Write", { file_path: join(root, "db/migrations/002_add_task_estimate.sql") }).code, 2);
});

test("blocks a case variant of an applied migration (case-insensitive file systems)", () => {
  assert.equal(run("Edit", { file_path: "DB/Migrations/001_CREATE_TASKS.sql" }).code, 2);
});

test("blocks a path that reaches the migration through ..", () => {
  assert.equal(run("Edit", { file_path: "app/../db/migrations/001_create_tasks.sql" }).code, 2);
});

test("blocks a BOM-prefixed payload (Windows PowerShell pipe)", () => {
  const payload = JSON.stringify({ tool_name: "Edit", tool_input: { file_path: applied }, cwd: root });
  const r = spawnSync("node", [hook], {
    input: "﻿" + payload,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, PROTECT_MIGRATIONS_LOG: logFile },
  });
  assert.equal(r.status, 2);
});

// Review of PR #9: after `cd db/migrations`, git ls-files from that cwd listed nothing and everything passed.
const migrationsDir = join(root, "db", "migrations");

test("blocks Edit by absolute path when the session cwd is db/migrations", () => {
  assert.equal(run("Edit", { file_path: join(root, applied) }, migrationsDir).code, 2);
});

test("blocks Edit by bare file name when the session cwd is db/migrations", () => {
  assert.equal(run("Edit", { file_path: "001_create_tasks.sql" }, migrationsDir).code, 2);
});

test("blocks Bash sed on a bare file name when the session cwd is db/migrations", () => {
  assert.equal(run("Bash", { command: "sed -i 's/120/200/' 001_create_tasks.sql" }, migrationsDir).code, 2);
});

test("blocks MultiEdit of an applied migration", () => {
  assert.equal(run("MultiEdit", { file_path: applied, edits: [] }).code, 2);
});

test("blocks NotebookEdit addressed by notebook_path", () => {
  assert.equal(run("NotebookEdit", { notebook_path: applied }).code, 2);
});

test("finds the repo root with git when CLAUDE_PROJECT_DIR is unset", () => {
  const r = run("Edit", { file_path: "001_create_tasks.sql" }, migrationsDir, { CLAUDE_PROJECT_DIR: undefined });
  assert.equal(r.code, 2);
});

test("outside a git repo: allows and logs, does not crash", () => {
  const dir = mkdtempSync(join(tmpdir(), "no-git-"));
  const log = join(dir, "hook.log");
  try {
    const r = run("Edit", { file_path: "x.sql" }, dir, { CLAUDE_PROJECT_DIR: undefined, PROTECT_MIGRATIONS_LOG: log });
    assert.equal(r.code, 0);
    assert.match(readFileSync(log, "utf8"), /"decision":"allow".*git failed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("still blocks when the log file cannot be written", () => {
  const r = run("Edit", { file_path: applied }, root, { PROTECT_MIGRATIONS_LOG: "/nonexistent-dir/hook.log" });
  assert.equal(r.code, 2);
});

test("allows a new migration file", () => {
  assert.equal(run("Write", { file_path: "db/migrations/003_add_priority.sql" }).code, 0);
});

test("allows files outside db/migrations", () => {
  assert.equal(run("Edit", { file_path: "lib/tasks.ts" }).code, 0);
});

for (const command of [
  `sed -i '' s/120/200/ ${applied}`,
  `echo x >> ${applied}`,
  `npm test && rm ${applied}`,
  `mv ${applied} /tmp/x.sql`,
  `echo x > ${applied.toUpperCase()}`,
  `sed -Ei 's/120/200/' ${applied}`,
  `sed --in-place 's/120/200/' ${applied}`,
  `sed -n -i 's/120/200/' ${applied}`,
  `cp /tmp/other.sql ${applied}`,
  `perl -pi -e 's/120/200/' ${applied}`,
  `truncate -s 0 ${applied}`,
  `echo x | tee ${applied}`,
  `dd if=/dev/null of=${applied}`,
  `rm ${applied}`,
]) {
  test(`blocks Bash: ${command}`, () => assert.equal(run("Bash", { command }).code, 2));
}

for (const command of [
  `cat ${applied}`,
  `grep check ${applied} > out.txt; rm -f out.txt`,
  "ls db/migrations",
  `cp ${applied} /tmp/copy.sql`,
  `sed -n '1,5p' ${applied}`,
  `sed -E 's/a/b/' ${applied} > /tmp/out.sql`,
]) {
  test(`allows Bash: ${command}`, () => assert.equal(run("Bash", { command }).code, 0));
}

test("fails open on a malformed payload", () => {
  const r = spawnSync("node", [hook], { input: "not json", env: { ...process.env, PROTECT_MIGRATIONS_LOG: logFile } });
  assert.equal(r.status, 0);
});
