// owner: @Bondarenko199 · why: the rubric requires verifiable hook evidence; this battery is the reproducible form of the manual tests in hook-evidence.md · review-by: 2027-02-22
// Run: node docs/ai/hook-battery.mjs   (from anywhere; locates the repo via its own path)
// Every case pipes a Claude Code payload into the hooks and checks the exit code:
// PreToolUse (protect-migrations.mjs): 2 = block, 0 = allow.
// PostToolUse (detect-migration-diff.mjs, round-5 D-cases): 2 = damage detected, 0 = clean.
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, cpSync, writeFileSync, rmSync, symlinkSync, unlinkSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."); // repo root from docs/ai/
const H = R + "/.claude/hooks/protect-migrations.mjs";
const POST = R + "/.claude/hooks/detect-migration-diff.mjs";
const run = (payload) => {
  try {
    execFileSync("node", [H], { input: payload, stdio: ["pipe", "ignore", "ignore"] });
    return 0;
  } catch (e) { return e.status; }
};
const bs = String.fromCharCode(92); // backslash, built at runtime so this file's own text stays neutral
const mig = "db" + "/migrations";   // same idea: assembled, not literal, where it matters

const cases = [
  // block cases — instructor round-2 exact scenarios (shell routes at an applied migration)
  ["B1 no-space redirect",        2, JSON.stringify({tool_name:"Bash",tool_input:{command:"echo x>" + mig + "/001_create_tasks.sql"}})],
  ["B2 no-space append",          2, JSON.stringify({tool_name:"Bash",tool_input:{command:"echo x>>" + mig + "/001_create_tasks.sql"}})],
  ["B3 cd + sed -i relative",     2, JSON.stringify({tool_name:"Bash",tool_input:{command:"cd " + mig + " && sed -i 's/120/200/' 001_create_tasks.sql"}})],
  ["B4 spaced redirect",          2, JSON.stringify({tool_name:"Bash",tool_input:{command:"echo x >> " + mig + "/001_create_tasks.sql"}})],
  ["B5 full-path sed -i",         2, JSON.stringify({tool_name:"Bash",tool_input:{command:"sed -i 's/1/2/' " + R + "/" + mig + "/001_create_tasks.sql"}})],
  ["B6 case-variant redirect",    2, JSON.stringify({tool_name:"Bash",tool_input:{command:"echo x > DB/Migrations/001_create_tasks.sql"}})],
  ["B7 tee to applied",           2, JSON.stringify({tool_name:"Bash",tool_input:{command:"echo x | tee " + mig + "/001_create_tasks.sql"}})],
  ["B8 git restore applied",      2, JSON.stringify({tool_name:"Bash",tool_input:{command:"git restore " + mig + "/001_create_tasks.sql"}})],
  ["B9 rm applied",               2, JSON.stringify({tool_name:"Bash",tool_input:{command:"rm " + mig + "/001_create_tasks.sql"}})],
  // allow cases — read-only routes and writes to NEW (untracked) files must pass
  ["A1 cat applied (read)",       0, JSON.stringify({tool_name:"Bash",tool_input:{command:"cat " + mig + "/001_create_tasks.sql"}})],
  ["A2 ls migrations (read)",     0, JSON.stringify({tool_name:"Bash",tool_input:{command:"ls " + mig}})],
  ["A3 git diff (read)",          0, JSON.stringify({tool_name:"Bash",tool_input:{command:"git diff -- " + mig}})],
  ["A4 npm test (read)",          0, JSON.stringify({tool_name:"Bash",tool_input:{command:"npm test 2>&1"}})],
  ["A5 redirect to NEW file",     0, JSON.stringify({tool_name:"Bash",tool_input:{command:"echo x > " + mig + "/003_new.sql"}})],
  ["A6 grep (read)",              0, JSON.stringify({tool_name:"Bash",tool_input:{command:"grep -rn migrations lib"}})],
  ["A7 git log path (read)",      0, JSON.stringify({tool_name:"Bash",tool_input:{command:"git log -- " + mig}})],
  ["A8 ls with redirect to null", 0, JSON.stringify({tool_name:"Bash",tool_input:{command:"ls " + mig + " 2>/dev/null"}})],
  ["A9 commit msg mention (read)",0, JSON.stringify({tool_name:"Bash",tool_input:{command:"git commit -m \"touch " + mig + " docs\""}})],
  // file route: Windows-style backslash path must be classified (and blocked when tracked)
  ["W1 win-style backslash path", 2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:R + bs + "db" + bs + "migrations" + bs + "001_create_tasks.sql"}})],
  // core file-route regression set (rounds 1-2: Codex + instructor findings)
  ["T1 tracked relative",         2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:"db/migrations/001_create_tasks.sql"}})],
  ["T2 new untracked",            0, JSON.stringify({tool_name:"Write",tool_input:{file_path:"db/migrations/003_new.sql"}})],
  ["T3 non-migration",            0, JSON.stringify({tool_name:"Edit",tool_input:{file_path:"lib/tasks.ts"}})],
  ["T4 tracked absolute",         2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:R + "/db/migrations/002_add_task_estimate.sql"}})],
  ["T15 case-variant dir",        2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:R + "/DB/Migrations/001_create_tasks.sql"}})],
  ["T16 upper ext",               2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:R + "/db/migrations/001_create_tasks.SQL"}})],
  ["T17 both variants",           2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:R + "/DB/Migrations/001_create_tasks.SQL"}})],
  ["T18 new case-variant untracked", 0, JSON.stringify({tool_name:"Write",tool_input:{file_path:R + "/DB/Migrations/003_new.sql"}})],
  ["T14 fully nonexistent path",  0, JSON.stringify({tool_name:"Edit",tool_input:{file_path:"/nonexistent/a/b.sql"}})],
  // environment-dependent round-1/2 cases (foreign cwd): use runEnv below
  ["T19 tracked deleted, case-variant path", 2, JSON.stringify({tool_name:"Write",tool_input:{file_path:R + "/DB/Migrations/001_create_tasks.sql"}})],
  ["T20 tracked deleted, correct-case path", 2, JSON.stringify({tool_name:"Write",tool_input:{file_path:R + "/db/migrations/001_create_tasks.sql"}})],
];
// environment-dependent cases: run(payload, env)
const runEnv = (payload, env) => {
  try {
    execFileSync("node", [H], { input: payload, stdio: ["pipe", "ignore", "ignore"], env: { ...process.env, ...env } });
    return 0;
  } catch (e) { return e.status; }
};
let fails = 0;
for (const [label, want, payload] of cases) {
  const got = run(payload);
  const ok = got === want;
  if (!ok) fails++;
  console.log((ok ? "PASS" : "FAIL") + " " + label + ": got " + got + ", want " + want);
}
// T8: git errors (cwd does not exist) — must FAIL CLOSED
{
  const got = runEnv(JSON.stringify({tool_name:"Edit",tool_input:{file_path:"db/migrations/001_create_tasks.sql"}}), { CLAUDE_PROJECT_DIR: "/nonexistent/repo" });
  const ok = got === 2;
  if (!ok) fails++;
  console.log((ok ? "PASS" : "FAIL") + " T8 git-error fail-closed: got " + got + ", want 2");
}

// ── Round-3 review findings (code-review max): each was a verified bypass or over-block ──
const bash = (command) => JSON.stringify({tool_name:"Bash",tool_input:{command}});
const editPath = (p) => JSON.stringify({tool_name:"Edit",tool_input:{file_path:p}});
const block = [
  ["R1 sed --in-place long form",   2, bash("sed --in-place 's/120/200/' db/migrations/002_add_task_estimate.sql")],
  ["R1b cat > tracked (redirect target decides)", 2, bash("cat foo > db/migrations/001_create_tasks.sql")],
  ["R2a touch tracked",             2, bash("touch db/migrations/001_create_tasks.sql")],
  ["R2b find -delete on migrations",2, bash("find db/migrations -name '*.sql' -delete")],
  ["R2c rsync into migrations",     2, bash("rsync -a empty/ db/migrations/")],
  ["R6 non-string file_path (crash guard)", 2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:123}})],
  ["R6b object file_path (crash guard)",    2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:{nested:true}}})],
  ["R-garbage non-empty payload",   2, "this is not json at all {"],
  // cd-adjacent routes (found by probing the dirContext narrowing; `/simplify` round 3)
  ["R11 cd db + sed -i migrations/001", 2, bash("cd db && sed -i 's/1/2/' migrations/001_create_tasks.sql")],
  ["R12 cd db + rm migrations/001",     2, bash("cd db && rm migrations/001_create_tasks.sql")],
  ["R13 cd db/ + truncate migrations/…",2, bash("cd db/ && truncate -s0 migrations/001_create_tasks.sql")],
];
for (const [label, want, payload] of block) {
  const got = run(payload);
  const ok = got === want;
  if (!ok) fails++;
  console.log((ok ? "PASS" : "FAIL") + " " + label + ": got " + got + ", want " + want);
}
const allow = [
  ["R3 sed -n print-only (read)",   0, bash("sed -n 's/i/x/p' db/migrations/001_create_tasks.sql")],
  ["R3b perl -pe print-only",       0, bash("perl -pe 's/i/x/' db/migrations/001_create_tasks.sql")],
  ["R3c git checkout -b branch",    0, bash("git checkout -b add-migrations-support")],
  ["R3d grep install (false verb)", 0, bash("grep -rn install db/migrations")],
  ["R3e tee to a .log file",        0, bash("npm test | tee migrations.log")],
  ["R14 cd db + ls migrations/ (read-only)", 0, bash("cd db && ls migrations/")],
  ["R15 cd db + cat migrations/001 (read-only)", 0, bash("cd db && cat migrations/001_create_tasks.sql")],
  ["R16 cd db + tee out.log (non-migration target)", 0, bash("cd db && npm run x | tee out.log")],
  ["R8 2>&1 on cat (fd-dup)",       0, bash("cat db/migrations/001_create_tasks.sql 2>&1")],
  ["R8b git diff > /tmp (out sink)",0, bash("git diff -- db/migrations > /tmp/mig.diff")],
  ["R-empty payload (manual run)",  0, ""],
];
for (const [label, want, payload] of allow) {
  const got = run(payload);
  const ok = got === want;
  if (!ok) fails++;
  console.log((ok ? "PASS" : "FAIL") + " " + label + ": got " + got + ", want " + want);
}
// stderr assertion: block cases must actually explain why (guards against exit-code-only regressions)
{
  try {
    execFileSync("node", [H], { input: JSON.stringify({tool_name:"Edit",tool_input:{file_path:"db/migrations/001_create_tasks.sql"}}), stdio: ["pipe","ignore","pipe"] });
    fails++; console.log("FAIL stderr-message: expected block, got exit 0");
  } catch (e) {
    const msg = (e.stderr || "").toString();
    const ok = e.status === 2 && msg.includes("BLOCKED") && msg.includes("add-migration");
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " stderr-message on block: exit " + e.status + ", stderr " + msg.length + " chars");
  }
}
// temp-repo cases: case-sensitive pathspec bug + cd + untracked fix-in-place (R2, R7)
{
  const S = mkdtempSync(tmpdir() + "/hwbatt-");
  cpSync(R + "/db", S + "/db", { recursive: true });
  cpSync(R + "/.claude", S + "/.claude", { recursive: true });
  // a tracked migration with uppercase letters in the name (pathspec-case bug repro)
  writeFileSync(S + "/db/migrations/002_Mixed_Case.sql", "-- mixed case tracked\n");
  const g = (...a) => execFileSync("git", a, { cwd: S, stdio: "ignore" });
  g("init", "-q"); g("add", "-A"); g("-c","user.email=t@t","-c","user.name=t","commit","-q","-m","x");
  // an untracked draft migration (fix-in-place must stay allowed)
  writeFileSync(S + "/db/migrations/003_draft.sql", "-- draft, not yet committed\n");
  const HS = S + "/.claude/hooks/protect-migrations.mjs";
  const runIn = (payload, env = {}) => {
    try {
      execFileSync("node", [HS], { input: payload, stdio: ["pipe","ignore","ignore"], env: { ...process.env, CLAUDE_PROJECT_DIR: S, ...env } });
      return 0;
    } catch (e) { return e.status; }
  };
  const tempCases = [
    ["R2 tracked mixed-case name (pathspec bug)", 2, editPath(S + "/db/migrations/002_Mixed_Case.sql")],
    ["R2b tracked mixed-case via Bash", 2, bash("sed -i 's/1/2/' db/migrations/002_Mixed_Case.sql")],
    ["R7 cd + sed -i on UNTRACKED draft stays allowed", 0, bash("cd db/migrations && sed -i 's/typo/fix/' 003_draft.sql")],
    ["R7b cd + sed -i on TRACKED (after cd) blocks", 2, bash("cd db/migrations && sed -i 's/120/200/' 001_create_tasks.sql")],
    ["R7c redirect to untracked draft stays allowed", 0, bash("echo x > db/migrations/003_draft.sql")],
  ];
  for (const [label, want, payload] of tempCases) {
    const got = runIn(payload);
    const ok = got === want;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " " + label + ": got " + got + ", want " + want);
  }
  // non-ASCII tracked name (quotePath bug repro)
  // NOTE: 003_draft.sql (line 145) is intentionally still untracked here — do NOT git-add it.
  writeFileSync(S + "/db/migrations/004_créer_tâches.sql", "-- non-ascii name\n");
  execFileSync("git", ["add", "db/migrations/002_Mixed_Case.sql", "db/migrations/004_créer_tâches.sql"], { cwd: S, stdio: "ignore" });
  g("-c","user.email=t@t","-c","user.name=t","commit","-q","-m","y");
  {
    const got = runIn(editPath(S + "/db/migrations/004_créer_tâches.sql"));
    const ok = got === 2;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " R10 non-ASCII tracked name (quotePath): got " + got + ", want 2");
  }
  // symlink alias cases (round-2 Codex finding 2 + the deleted-via-alias gap found by testing)
  symlinkSync("db/migrations", S + "/migration-link");
  symlinkSync(S + "/db/migrations/001_create_tasks.sql", S + "/alias-001.sql");
  const symCases = [
    ["T10 dir-alias to tracked", 2, editPath(S + "/migration-link/001_create_tasks.sql")],
    ["T11 file-symlink to tracked", 2, editPath(S + "/alias-001.sql")],
    ["T12 new file under alias stays allowed", 0, editPath(S + "/migration-link/003_draft.sql")],
  ];
  for (const [label, want, payload] of symCases) {
    const got = runIn(payload);
    const ok = got === want;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " " + label + ": got " + got + ", want " + want);
  }
  unlinkSync(S + "/db/migrations/001_create_tasks.sql");
  {
    const got = runIn(editPath(S + "/migration-link/001_create_tasks.sql"));
    const ok = got === 2;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " T13 deleted tracked via alias: got " + got + ", want 2");
  }
  rmSync(S, { recursive: true, force: true });
}

// ── Round-5: payload-shape crash guard (#6) — wrong shapes must fail closed, never exit 1
const shapeCases = [
  ["X1 tool_input as string",   2, JSON.stringify({tool_name:"Edit",tool_input:"str"})],
  ["X2 command as number",      2, JSON.stringify({tool_name:"Bash",tool_input:{command:123}})],
  ["X3 file_path as number",    2, JSON.stringify({tool_name:"Edit",tool_input:{file_path:123}})],
  ["X4 payload null",           2, "null"],
  ["X5 payload array",          2, "[]"],
];
for (const [label, want, payload] of shapeCases) {
  const got = run(payload);
  const ok = got === want;
  if (!ok) fails++;
  console.log((ok ? "PASS" : "FAIL") + " " + label + ": got " + got + ", want " + want);
}

// ── Round-5: NotebookEdit coverage (#13) — notebook_path classifies like file_path
const nbCases = [
  ["N1 notebook_path to tracked", 2, JSON.stringify({tool_name:"NotebookEdit",tool_input:{notebook_path:R + "/db/migrations/001_create_tasks.sql"}})],
  ["N2 notebook_path to new",     0, JSON.stringify({tool_name:"NotebookEdit",tool_input:{notebook_path:R + "/db/migrations/003_new.ipynb"}})],
];
for (const [label, want, payload] of nbCases) {
  const got = run(payload);
  const ok = got === want;
  if (!ok) fails++;
  console.log((ok ? "PASS" : "FAIL") + " " + label + ": got " + got + ", want " + want);
}

// BOM payload: must parse (BOM stripped) and BLOCK (exit 2) — was a fail-open before the fix
const bomPayload = "﻿" + JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "db/migrations/001_create_tasks.sql" } });
const bomGot = run(bomPayload);
const bomOk = bomGot === 2;
if (!bomOk) fails++;
console.log((bomOk ? "PASS" : "FAIL") + " BOM payload parses and blocks: got " + bomGot + ", want 2");

// ── Round-5: uppercase-dir icase coverage (#2) + PostToolUse outcome detector ──
// One temp repo with an UPPERCASE DB/Migrations dir (tracked on a case-sensitive FS):
// exercises the :(icase) pathspec in trackedSet AND the detector's diff pathspec.
{
  const S = mkdtempSync(tmpdir() + "/hwpost-");
  mkdirSync(S + "/DB/Migrations", { recursive: true });
  cpSync(R + "/.claude", S + "/.claude", { recursive: true });
  writeFileSync(S + "/DB/Migrations/001_Create.sql", "-- uppercase dir tracked\n");
  const g = (...a) => execFileSync("git", a, { cwd: S, stdio: "ignore" });
  g("init", "-q"); g("add", "-A"); g("-c","user.email=t@t","-c","user.name=t","commit","-q","-m","x");
  const runIn = (hook, payload) => {
    try {
      execFileSync("node", [hook], { input: payload, stdio: ["pipe","ignore","ignore"], env: { ...process.env, CLAUDE_PROJECT_DIR: S } });
      return 0;
    } catch (e) { return e.status; }
  };
  const postCases = [
    ["U1 uppercase dir: PreToolUse blocks tracked edit", 2, H, editPath(S + "/DB/Migrations/001_Create.sql")],
    ["U2 uppercase dir: PreToolUse allows new file", 0, H, editPath(S + "/DB/Migrations/009_new.sql")],
    ["D1 detector: clean tree exits 0", 0, POST, "{}"],
  ];
  for (const [label, want, hook, payload] of postCases) {
    const got = runIn(hook, payload);
    const ok = got === want;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " " + label + ": got " + got + ", want " + want);
  }
  // detector: modified tracked migration (simulates a scanner-missed spelling, e.g. perl -pi)
  writeFileSync(S + "/DB/Migrations/001_Create.sql", "-- modified out-of-band\n");
  {
    const got = runIn(POST, "{}");
    const ok = got === 2;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " D2 detector: modified tracked exits 2: got " + got + ", want 2");
  }
  // restore, then: untracked draft and staged-add must NOT fire (authoring workflow)
  execFileSync("git", ["checkout", "--", "."], { cwd: S, stdio: "ignore" });
  writeFileSync(S + "/DB/Migrations/003_draft.sql", "-- draft\n");
  {
    const got = runIn(POST, "{}");
    const ok = got === 0;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " D4 detector: untracked draft exits 0: got " + got + ", want 0");
  }
  g("add", "DB/Migrations/003_draft.sql");
  {
    const got = runIn(POST, "{}");
    const ok = got === 0;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " D4b detector: staged new migration exits 0: got " + got + ", want 0");
  }
  // deleted tracked migration must fire
  rmSync(S + "/DB/Migrations/001_Create.sql");
  {
    const got = runIn(POST, "{}");
    const ok = got === 2;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " D3 detector: deleted tracked exits 2: got " + got + ", want 2");
  }
  // detector: garbage payload must never crash with exit 1 (fail-open) — 0 or 2 both acceptable
  {
    const got = runIn(POST, "garbage {");
    const ok = got !== 1;
    if (!ok) fails++;
    console.log((ok ? "PASS" : "FAIL") + " D5 detector: garbage payload never exits 1: got " + got);
  }
  rmSync(S, { recursive: true, force: true });
}
console.log(fails === 0 ? "ALL PASS" : fails + " FAILURES");
