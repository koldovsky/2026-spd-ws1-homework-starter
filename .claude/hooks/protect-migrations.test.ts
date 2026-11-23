import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK = join(import.meta.dirname, "protect-migrations.mjs");
let project: string;

// A throwaway git repo: 001 and 002 committed (applied), 003 created but not committed yet.
beforeAll(() => {
  project = mkdtempSync(join(tmpdir(), "protect-migrations-"));
  mkdirSync(join(project, "db", "migrations"), { recursive: true });
  for (const f of ["001_create_tasks.sql", "002_add_task_estimate.sql"]) {
    copyFileSync(join("db", "migrations", f), join(project, "db", "migrations", f));
  }
  const git = (...args: string[]) => execFileSync("git", args, { cwd: project, stdio: "ignore" });
  git("init", "-q");
  git("add", ".");
  git("-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-qm", "applied");
  writeFileSync(join(project, "db", "migrations", "003_add_priority.sql"), "select 1;\n");
});
afterAll(() => rmSync(project, { recursive: true, force: true }));

function run(tool_name: string, tool_input: Record<string, unknown>) {
  const r = spawnSync("node", [HOOK], {
    input: JSON.stringify({ tool_name, tool_input, cwd: project }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: project },
    encoding: "utf8",
  });
  return { code: r.status, stderr: r.stderr };
}
const edit = (file_path: string) => run("Edit", { file_path });
const bash = (command: string) => run("Bash", { command });

describe("protect-migrations hook: file tools", () => {
  it("blocks editing a committed migration and suggests the next number", () => {
    const r = edit("db/migrations/001_create_tasks.sql");
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("BLOCKED");
    expect(r.stderr).toContain("db/migrations/004_");
  });

  it("blocks an absolute path to a committed migration", () => {
    expect(run("Write", { file_path: join(project, "db/migrations/002_add_task_estimate.sql") }).code).toBe(2);
  });

  it("blocks a case-variant path, which hits the same file on macOS", () => {
    expect(edit("DB/Migrations/001_create_tasks.sql").code).toBe(2);
  });

  it("allows creating a new migration", () => {
    expect(run("Write", { file_path: "db/migrations/004_new.sql" }).code).toBe(0);
  });

  it("allows fixing a migration that is not committed yet", () => {
    expect(edit("db/migrations/003_add_priority.sql").code).toBe(0);
  });

  it("allows files outside db/migrations", () => {
    expect(edit("lib/tasks.ts").code).toBe(0);
  });
});

describe("protect-migrations hook: Bash", () => {
  it.each([
    "rm db/migrations/001_create_tasks.sql",
    "rm db/migrations/*.sql",
    "rm -r db/migrations",
    "git rm -r db/migrations/",
    "rm -r db",
    "git rm -r db",
    "mv db db_old",
    'find db/migrations -name "*.sql" -delete',
    "cd db/migrations && rm 001_create_tasks.sql",
    "cd db && rm migrations/002_add_task_estimate.sql",
    "git mv db/migrations/002_add_task_estimate.sql db/migrations/002_renamed.sql",
    "git checkout main -- db/migrations/001_create_tasks.sql",
    "cp /tmp/x.sql db/migrations/001_create_tasks.sql",
    "echo 'drop table tasks;' >> db/migrations/001_create_tasks.sql",
    "echo x>db/migrations/001_create_tasks.sql",
    "echo x>>db/migrations/001_create_tasks.sql",
    "echo x 2>/dev/null >db/migrations/001_create_tasks.sql",
    "patch db/migrations/001_create_tasks.sql fix.diff",
    "sed -i '' 's/120/200/' db/migrations/001_create_tasks.sql",
    "sed -E -i '' 's/120/200/' db/migrations/001_create_tasks.sql",
    "perl -pi -e 's/120/200/' db/migrations/001_create_tasks.sql",
  ])("blocks %s", (command) => {
    expect(bash(command).code).toBe(2);
  });

  it.each([
    "cat db/migrations/001_create_tasks.sql",
    "cat db/migrations/001_create_tasks.sql 2>/dev/null",
    "find db/migrations -name '*.sql'",
    "cat db/migrations/001_create_tasks.sql>/tmp/copy.sql",
    "echo select 1>db/migrations/004_new.sql",
    "ls db/migrations > /tmp/list.txt",
    "rm -rf node_modules && cat db/migrations/001_create_tasks.sql",
    "cat > db/migrations/004_new.sql <<EOF\nselect 1;\nEOF",
    "mv db/migrations/003_add_priority.sql db/migrations/003_add_task_priority.sql",
    "cd db/migrations && rm 003_add_priority.sql",
    "git checkout -b feature/priority",
    "git checkout .",
  ])("allows %s", (command) => {
    expect(bash(command).code).toBe(0);
  });
});

it("fails open on an unreadable payload", () => {
  const r = spawnSync("node", [HOOK], { input: "not json", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  expect(r.status).toBe(0);
});
