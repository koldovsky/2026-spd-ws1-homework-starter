// owner: @evgenyadev · why: the backstop is only useful if it reliably sees what the PreToolUse parser misses · review-by: 2027-02-26
// Run: npm run hook:test. Each test works in a throwaway git repo, never in this one.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";

const hook = join(import.meta.dirname, "verify-migrations.mjs");
let repo;

const git = (...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: repo });

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "verify-migrations-"));
  mkdirSync(join(repo, "db", "migrations"), { recursive: true });
  writeFileSync(join(repo, "db/migrations/001_create.sql"), "create table t (id integer);\n");
  git("init", "-q");
  git("add", ".");
  git("commit", "-qm", "init");
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

function run(cwd = repo) {
  const r = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "anything" }, cwd }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo, PROTECT_MIGRATIONS_LOG: join(repo, "hook.log") },
    encoding: "utf8",
  });
  return { code: r.status, stderr: r.stderr };
}

test("clean tree passes", () => {
  assert.equal(run().code, 0);
});

test("reports a modified applied migration, whatever tool did it", () => {
  writeFileSync(join(repo, "db/migrations/001_create.sql"), "create table t (id integer, x text);\n");
  const r = run();
  assert.equal(r.code, 2);
  assert.match(r.stderr, /M db\/migrations\/001_create\.sql/);
  assert.match(r.stderr, /git restore --source=HEAD/);
});

test("reports a staged change too", () => {
  writeFileSync(join(repo, "db/migrations/001_create.sql"), "changed\n");
  git("add", ".");
  assert.equal(run().code, 2);
});

test("reports a deleted applied migration", () => {
  unlinkSync(join(repo, "db/migrations/001_create.sql"));
  assert.equal(run().code, 2);
});

test("allows a new migration, untracked or staged", () => {
  writeFileSync(join(repo, "db/migrations/002_add.sql"), "alter table t add column y text;\n");
  assert.equal(run().code, 0);
  git("add", ".");
  assert.equal(run().code, 0);
});

test("works when the session cwd is db/migrations", () => {
  writeFileSync(join(repo, "db/migrations/001_create.sql"), "changed\n");
  assert.equal(run(join(repo, "db", "migrations")).code, 2);
});

test("outside a git repo: allows and logs, does not crash", () => {
  const dir = mkdtempSync(join(tmpdir(), "no-git-"));
  const env = { ...process.env, PROTECT_MIGRATIONS_LOG: join(dir, "hook.log") };
  delete env.CLAUDE_PROJECT_DIR;
  try {
    const r = spawnSync("node", [hook], { input: JSON.stringify({ tool_name: "Bash", cwd: dir }), env, encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.match(readFileSync(join(dir, "hook.log"), "utf8"), /"decision":"allow".*git failed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("still reports when the log file cannot be written", () => {
  writeFileSync(join(repo, "db/migrations/001_create.sql"), "changed\n");
  const r = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_name: "Bash", cwd: repo }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo, PROTECT_MIGRATIONS_LOG: "/nonexistent-dir/hook.log" },
  });
  assert.equal(r.status, 2);
});

test("fails open on a malformed payload", () => {
  const r = spawnSync("node", [hook], { input: "not json", env: { ...process.env, PROTECT_MIGRATIONS_LOG: join(repo, "hook.log") } });
  assert.equal(r.status, 0);
});
