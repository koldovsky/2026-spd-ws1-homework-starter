// owner: @skindyk · why: regression check for .claude/hooks/*.mjs — run `node docs/ai/hook-cases.mjs` after changing a hook (CI runs it too) · review-by: 2027-03-01
// Feeds sample payloads to the hooks and checks the exit code (2 = blocked / reported, 0 = allowed).
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const pre = join(root, ".claude", "hooks", "protect-migrations.mjs");
const post = join(root, ".claude", "hooks", "check-migrations-diff.mjs");
const secrets = join(root, ".claude", "hooks", "protect-secrets.mjs");
const m = "db/migrations/";
const tmp = mkdtempSync(join(tmpdir(), "hook-cases-"));

// Patch files for the `git apply` cases.
const badPatch = join(tmp, "bad.patch");
writeFileSync(badPatch, `diff --git a/${m}002_add_task_estimate.sql b/${m}002_add_task_estimate.sql\n--- a/${m}002_add_task_estimate.sql\n+++ b/${m}002_add_task_estimate.sql\n@@ -1 +1 @@\n-40\n+80\n`);
const okPatch = join(tmp, "ok.patch");
writeFileSync(okPatch, `diff --git a/lib/tasks.ts b/lib/tasks.ts\n--- a/lib/tasks.ts\n+++ b/lib/tasks.ts\n@@ -1 +1 @@\n-40\n+80\n`);

const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });
const ps = (command) => ({ tool_name: "PowerShell", tool_input: { command } });
const file = (tool_name, file_path) => ({ tool_name, tool_input: { file_path } });

const preCases = [
  // file tools
  ["Edit applied 001 (relative path)", 2, file("Edit", `${m}001_create_tasks.sql`)],
  ["Edit applied 002 (absolute path)", 2, file("Edit", join(root, "db", "migrations", "002_add_task_estimate.sql"))],
  ["Edit DB/Migrations/001 (other case)", 2, file("Edit", "DB/Migrations/001_create_tasks.sql")],
  ["Write over applied 001", 2, file("Write", `${m}001_create_tasks.sql`)],
  ["Write NEW 003 migration", 0, file("Write", `${m}003_widen_estimate.sql`)],
  ["Edit lib/tasks.ts", 0, file("Edit", "lib/tasks.ts")],
  // shell: destructive
  ["Bash rm applied 001", 2, bash(`rm ${m}001_create_tasks.sql`)],
  ["Bash cd migrations && rm 001", 2, bash(`cd ${m} && rm 001_create_tasks.sql`)],
  ["Bash (cd db; cd migrations; rm 001)", 2, bash(`(cd db; cd migrations; rm 001_create_tasks.sql)`)],
  ["Bash sed -i applied 002", 2, bash(`sed -i 's/40/80/' ${m}002_add_task_estimate.sql`)],
  ["Bash append into applied 002", 2, bash(`echo x >> ${m}002_add_task_estimate.sql`)],
  ["Bash (cd migrations; echo x>>001) subshell, no space", 2, bash(`(cd db/migrations; echo x>>001_create_tasks.sql)`)],
  ["Bash ls 001* | xargs sed -i", 2, bash(`ls ${m}001* | xargs sed -i 's/40/80/'`)],
  ["Bash git ls-files migrations | xargs git rm", 2, bash(`git ls-files db/migrations | xargs git rm`)],
  ["Bash cd migrations && ls | xargs -n1 rm", 2, bash(`cd db/migrations && ls | xargs -n 1 rm`)],
  ["PowerShell Get-ChildItem migrations | Remove-Item", 2, ps(`Get-ChildItem db\\migrations | Remove-Item`)],
  ["Bash echo NEW 003 | xargs rm (allowed)", 0, bash(`echo ${m}003_widen_estimate.sql | xargs rm`)],
  ["Bash ls migrations | xargs cat (read only)", 0, bash(`ls ${m}* | xargs cat`)],
  ["Bash cp x over applied 001", 2, bash(`cp x.sql ${m}001_create_tasks.sql`)],
  ["Bash install over applied 001", 2, bash(`install -m 644 x.sql ${m}001_create_tasks.sql`)],
  ["Bash git rm -r migrations folder", 2, bash(`git rm -r db/migrations`)],
  ["Bash find -delete in migrations", 2, bash(`find db/migrations -name "*.sql" -delete`)],
  ["Bash git checkout main -- applied 001", 2, bash(`git checkout main -- ${m}001_create_tasks.sql`)],
  ["Bash git apply patch touching 002", 2, bash(`git apply ${badPatch}`)],
  ["Bash node -e writeFileSync 001", 2, bash(`node -e "require('fs').writeFileSync('${m}001_create_tasks.sql','x')"`)],
  ["PowerShell Set-Content applied 001", 2, ps(`Set-Content db\\migrations\\001_create_tasks.sql "x"`)],
  ["PowerShell Copy-Item -Force over 001", 2, ps(`Copy-Item x.sql ${m}001_create_tasks.sql -Force`)],
  ["PowerShell New-Item -Force over 001", 2, ps(`New-Item ${m}001_create_tasks.sql -ItemType File -Force`)],
  ["PowerShell Remove-Item -Recurse folder", 2, ps(`Remove-Item db\\migrations -Recurse -Force`)],
  // shell: harmless, must not block
  ["Bash read 001, redirect elsewhere", 0, bash(`cat ${m}001_create_tasks.sql > out.txt 2>&1`)],
  ["Bash cp applied 001 to a backup", 0, bash(`cp ${m}001_create_tasks.sql /tmp/001.bak`)],
  ["Bash ls migrations && npm test", 0, bash(`ls ${m} && npm test`)],
  ["Bash rm NEW 003 migration", 0, bash(`rm ${m}003_widen_estimate.sql`)],
  ["Bash git commit -m mentioning rm 001", 0, bash(`git commit -m "never rm ${m}001_create_tasks.sql"`)],
  ["Bash echo text mentioning rm 001", 0, bash(`echo "do not rm ${m}001_create_tasks.sql"`)],
  ["Bash node -e reading 001", 0, bash(`node -e "console.log(require('fs').readFileSync('${m}001_create_tasks.sql','utf8'))"`)],
  ["Bash heredoc doc text mentioning rm 001", 0, bash(`node - <<'EOF'\nrequire('fs').writeFileSync('notes.md', 'rm ${m}001_create_tasks.sql -e x')\nEOF`)],
  ["Bash heredoc INTO applied 001", 2, bash(`cat > ${m}001_create_tasks.sql <<'EOF'\ncreate table x (id int);\nEOF`)],
  ["Bash git apply patch touching lib only", 0, bash(`git apply ${okPatch}`)],
  ["Bash git restore applied 001 from HEAD (repair)", 0, bash(`git restore --source=HEAD --staged --worktree -- ${m}001_create_tasks.sql`)],
  ["Bash git checkout -- applied 001 (repair)", 0, bash(`git checkout -- ${m}001_create_tasks.sql`)],
];

let failed = 0;
function run(hook, name, want, payload, projectDir = root, session = "hook-cases") {
  const r = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ session_id: session, cwd: projectDir, ...payload }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: "utf8",
  });
  const ok = r.status === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  exit=${r.status} (want ${want})  ${name}`);
  if (r.status === 2) console.log(`      stderr: ${r.stderr.split("\n")[0]}`);
}

console.log("# PreToolUse: protect-migrations.mjs");
for (const [name, want, payload] of preCases) run(pre, name, want, payload);

const secretsCases = [
  // searches that reach .env without naming it
  ["Bash grep -rn SECRET .", 2, bash(`grep -rn SECRET .`)],
  ["Bash grep -R password (no path = cwd)", 2, bash(`grep -R password`)],
  ["Bash egrep --recursive token .", 2, bash(`egrep --recursive token .`)],
  ["Bash rg --no-ignore SECRET", 2, bash(`rg --no-ignore SECRET`)],
  ["Bash rg -uu SECRET .", 2, bash(`rg -uu SECRET .`)],
  ["Bash rg --hidden SECRET", 2, bash(`rg --hidden SECRET`)],
  ["Bash findstr /s SECRET *", 2, bash(`findstr /s SECRET *`)],
  ["PowerShell gci -Recurse | Select-String SECRET", 2, ps(`Get-ChildItem -Recurse | Select-String SECRET`)],
  ["PowerShell Select-String -Path ./* SECRET", 2, ps(`Select-String -Pattern SECRET -Path ./*`)],
  ["Bash grep SECRET .* (dotfile glob)", 2, bash(`grep SECRET .*`)],
  // reading .env by name
  ["Bash cat .env", 2, bash(`cat .env`)],
  ["Bash head -1 .env.local", 2, bash(`head -1 .env.local`)],
  ["Bash source .env", 2, bash(`source .env`)],
  ["Bash cp .env /tmp/x", 2, bash(`cp .env /tmp/x`)],
  ["Bash echo x | cat .env (hidden in a pipe)", 2, bash(`echo x | cat .env`)],
  ["Bash grep -e SECRET .env", 2, bash(`grep -e SECRET .env`)],
  ["Bash node -e readFileSync('.env')", 2, bash(`node -e "console.log(require('fs').readFileSync('.env','utf8'))"`)],
  ["PowerShell Get-Content .env", 2, ps(`Get-Content .env`)],
  ["PowerShell Get-Content -Path .\\.env.production", 2, ps(`Get-Content -Path .\\.env.production`)],
  ["Bash node - heredoc script reading .env", 2, bash(`node - <<'EOF'\nconsole.log(require('fs').readFileSync('.env','utf8'))\nEOF`)],
  ["Bash heredoc doc text mentioning cat .env (data)", 0, bash(`cat > notes.md <<'EOF'\nNever run cat .env or grep -rn SECRET .\nEOF`)],
  // harmless, must not block
  ["Bash grep -rn --exclude='.env*' SECRET .", 0, bash(`grep -rn --exclude='.env*' SECRET .`)],
  ["Bash grep -rn estimate lib/ (subfolder)", 0, bash(`grep -rn estimate lib/`)],
  ["Bash rg SECRET (respects .gitignore)", 0, bash(`rg SECRET`)],
  ["Bash git grep SECRET", 0, bash(`git grep SECRET`)],
  ["Bash grep -n '\\.env' .gitignore (pattern, not file)", 0, bash(`grep -n "\\.env" .gitignore`)],
  ["Bash cat .env.example", 0, bash(`cat .env.example`)],
  ["Bash ls -la .env", 0, bash(`ls -la .env`)],
  ["PowerShell gci lib -Recurse | Select-String estimate", 0, ps(`Get-ChildItem lib -Recurse | Select-String estimate`)],
  ["Bash npm test", 0, bash(`npm test`)],
];

console.log("\n# PreToolUse: protect-secrets.mjs");
for (const [name, want, payload] of secretsCases) run(secrets, name, want, payload);

// PostToolUse cases run in a throwaway git repo so the real working tree is never touched.
console.log("\n# PostToolUse: check-migrations-diff.mjs (temp repo)");
const repo = join(tmp, "repo");
mkdirSync(join(repo, "db", "migrations"), { recursive: true });
const git = (...a) => execFileSync("git", ["-c", "user.name=hook-cases", "-c", "user.email=hook-cases@example.invalid", ...a], { cwd: repo, stdio: "ignore" });
const mig = (n) => join(repo, "db", "migrations", n);
writeFileSync(mig("001_create_tasks.sql"), "create table tasks (id integer primary key);\n");
git("init", "-q");
git("add", "-A");
git("commit", "-qm", "init");
const session = `hook-cases-${process.pid}-${Date.now()}`;
const anyBash = bash("some command");

run(post, "clean tree", 0, anyBash, repo, session);
writeFileSync(mig("003_new.sql"), "select 1;\n");
run(post, "new untracked 003 migration", 0, anyBash, repo, session);
writeFileSync(mig("001_create_tasks.sql"), "create table tasks (id integer primary key, x text);\n");
run(post, "applied 001 modified (e.g. via xargs or a script)", 2, anyBash, repo, session);
run(post, "same state again: reported once, no nagging", 0, anyBash, repo, session);
writeFileSync(mig("001_create_tasks.sql"), "create table tasks (id integer primary key, y text);\n");
run(post, "second, different edit to applied 001", 2, anyBash, repo, session);
git("restore", "--source=HEAD", "--staged", "--worktree", "--", "db/migrations/001_create_tasks.sql");
run(post, "after git restore from HEAD", 0, anyBash, repo, session);
rmSync(mig("001_create_tasks.sql"));
run(post, "applied 001 deleted", 2, anyBash, repo, session);

rmSync(tmp, { recursive: true, force: true });
const total = preCases.length + secretsCases.length + 7;
console.log(failed ? `\n${failed} of ${total} case(s) failed` : `\nall ${total} cases passed`);
process.exit(failed ? 1 : 0);
