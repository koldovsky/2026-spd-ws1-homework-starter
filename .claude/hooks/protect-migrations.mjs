// owner: @IgorPetr · why: applied migrations must never change; lib/db.ts skips a file once applied, so an edit makes databases diverge silently · review-by: 2027-02-24
// "Applied" = tracked in git. A new, untracked migration (the agent's own 003) can still be fixed; a committed one cannot.
//
// PreToolUse  (default mode): Edit|Write|MultiEdit on a tracked migration, or a Bash command that writes to one
//             (redirect, sed -i, tee, cp, mv, rm, truncate, perl -i, dd of=, install, ...). Exit 2 blocks the call.
// PostToolUse (`post` argument): backstop for whatever the Pre check cannot see, e.g. a script that rewrites a migration.
//             Fails when `git diff HEAD` shows a tracked migration as modified, deleted or renamed. Exit 2 shows stderr to the agent.
import { appendFileSync, readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const MODE = process.argv[2] === "post" ? "post" : "pre";
const DIR = "db/migrations";

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // not our payload; never block on a parse error
}

const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? process.cwd());
const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });

function trackedMigrations() {
  const r = git("ls-files", "--", DIR);
  return r.status === 0 ? r.stdout.split("\n").filter(Boolean) : null; // null: git unavailable
}

function block(what) {
  const reason =
    `BLOCKED: ${what} touches an applied migration (tracked in git). Applied migrations must not change. ` +
    `Add a new numbered file in ${DIR}/ instead (see .claude/skills/add-migration/SKILL.md).`;
  try {
    appendFileSync(
      resolve(root, ".claude/hooks/block.log"),
      `${new Date().toISOString()} ${MODE} ${payload.tool_name ?? "?"} ${what} BLOCKED\n`,
    );
  } catch {
    // logging must never decide the outcome
  }
  console.error(reason);
  process.exit(2);
}

const tracked = trackedMigrations();

if (MODE === "post") {
  const r = git("diff", "--name-status", "HEAD", "--", DIR);
  const bad = r.status === 0 ? r.stdout.split("\n").filter((l) => /^[MDRT]/.test(l)) : [];
  if (bad.length) block(`the working tree (${bad.map((l) => l.replace(/\s+/g, " ")).join("; ")}); restore with \`git checkout HEAD -- ${DIR}\`; the change`);
  process.exit(0);
}

const input = payload.tool_input ?? {};

if (typeof input.file_path === "string") {
  const rel = relative(root, resolve(root, input.file_path)).split("\\").join("/");
  const isApplied = tracked ? tracked.includes(rel) : rel.startsWith(`${DIR}/`);
  if (rel.startsWith(`${DIR}/`) && isApplied) block(rel);
  process.exit(0);
}

if (typeof input.command === "string") {
  // Drop harmless redirections so `2>&1` and `> /dev/null` do not count as writes.
  const cmd = input.command.replace(/\d*>&\d+/g, " ").replace(/\d*>>?\s*\/dev\/null/g, " ");
  // The command is about an applied migration if it names a tracked file, uses a glob, or refers to the directory itself
  // (`cd db/migrations && ...`). A path to a new, untracked file such as db/migrations/003_x.sql does not count.
  const names = (tracked ?? []).map((f) => basename(f));
  const rest = cmd.replace(/migrations\/[^\s"';|&<>)*?[{]+/g, (m) => (names.includes(basename(m)) ? m : " "));
  const mentions = names.some((n) => cmd.includes(n)) || /migrations/.test(tracked ? rest : cmd);
  const writes =
    /(^|[^<>\d])>{1,2}[^>]/.test(cmd) || // redirect: > file, >> file
    /\b(sed|perl|ruby)\b[^|;&]*\s(-[a-zA-Z]*i|--in-place)/.test(cmd) || // in-place edit
    /\b(tee|cp|mv|rm|truncate|install|ln|patch|dd|shred|ed|ex)\b/.test(cmd) ||
    /\bgit\s+(checkout|restore|apply|stash|reset|mv|rm)\b/.test(cmd) ||
    /\bpython3?\b|\bnode\b[^|;&]*\s-e\b/.test(cmd); // inline scripts can write anything
  if (mentions && writes) block(`Bash \`${input.command.slice(0, 120)}\``);
}
process.exit(0);
