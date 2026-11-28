// owner: @Bondarenko199 · why: the PreToolUse guard predicts routes and cannot see every spelling (interpreter writes, obfuscated shell, aliases — see hook-evidence.md Known limits); this outcome check catches ANY modification, deletion or type change of a tracked migration after the fact · review-by: 2027-02-22
// PostToolUse hook: runs after the tool call has executed. Exit 2 does not undo the
// action, but stderr is shown to the agent so it can restore immediately.
// Detection rule: a TRACKED db/migrations/*.sql that differs from HEAD (M/D/T filter —
// staged ADDITIONS of brand-new migration files are the legitimate authoring workflow
// and must not fire). Untracked files never appear in `git diff HEAD` at all.
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.CLAUDE_PROJECT_DIR
  ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

let changed;
try {
  changed = execFileSync(
    "git",
    // :(icase) so an uppercase-on-disk migrations dir is covered too; MDT = modified,
    // deleted, type-changed (added files are the allowed authoring workflow)
    ["diff", "--name-only", "--diff-filter=MDT", "HEAD", "--", ":(icase)db/migrations"],
    { cwd: root, encoding: "utf8" },
  );
} catch (e) {
  // git failed (repo with no HEAD yet, git missing...): fail OPEN with a stderr note —
  // this is a safety net, not the guard; it must never wedge every tool call.
  // The PreToolUse guard and CODEOWNERS review remain the backstops.
  console.error(`[detect-migration-diff] git diff failed (net is inactive this call): ${e?.status ?? e?.code ?? "error"}`);
  process.exit(0);
}

const files = changed.split("\n").filter(Boolean);
if (files.length === 0) process.exit(0); // clean — nothing to flag

console.error(
  `WARNING: the last tool call modified a TRACKED (applied) migration:\n` +
  files.map((f) => `  ${f}`).join("\n") +
  `\nApplied migrations are immutable once committed.\n` +
  `STOP and ask the user to restore: git checkout -- <file> (agents cannot run\n` +
  `git restore/checkout on db/migrations — the guard blocks it by design).\n` +
  `Instead, add a NEW numbered migration per .claude/skills/add-migration/SKILL.md`,
);
// Set the exit code and let the process end naturally so stderr is not truncated.
process.exitCode = 2;
