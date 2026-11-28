// owner: @Bondarenko199 · why: an applied migration was edited once and a teammate's DB silently diverged; this hook makes applied migrations immutable · review-by: 2027-02-22
// PreToolUse hook: reads the Claude Code JSON payload on stdin.
// Exit 2 = block the tool call; the stderr text is shown to the agent as the reason.
// Blocks Edit/Write/MultiEdit file paths AND Bash commands that would modify an APPLIED
// db/migrations/*.sql file (one tracked in git). Creating a NEW migration file — or fixing
// an uncommitted one — is allowed, on either route. Any unexpected error fails closed.
import { execFileSync } from "node:child_process";
import { isAbsolute, resolve, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

/**
 * Canonicalize a path: realpath the nearest existing ancestor (so symlinked directories
 * and symlinked filenames resolve to their real target), then re-append the remainder
 * that does not exist yet (a brand-new migration file, or a tracked file deleted from
 * the working tree but still in git). Plain resolve() is not enough: a path through a
 * symlink would keep its alias form and escape the db/migrations classification.
 * realpathSync.native (not the JS realpath) also normalizes case on case-insensitive
 * filesystems (macOS APFS, Windows), so DB/Migrations/001.SQL cannot alias the tracked
 * db/migrations/001.sql.
 */
function canonical(p) {
  const abs = resolve(p);
  try {
    return realpathSync.native(abs);
  } catch {
    // find the longest existing prefix, realpath it, re-append the non-existent tail
    const parts = abs.split(sep);
    for (let i = parts.length - 1; i > 0; i--) {
      const head = parts.slice(0, i).join(sep);
      try {
        return realpathSync.native(head) + sep + parts.slice(i).join(sep);
      } catch {
        if (dirname(head) === head) break; // reached the filesystem root, stop
        // prefix doesn't exist either, walk further up
      }
    }
    return abs;
  }
}

/** Repo root: CLAUDE_PROJECT_DIR when Claude Code provides it, else derived from this
 * script's own location (script lives at <root>/.claude/hooks/). fileURLToPath (not
 * URL.pathname) so paths with spaces or other URL-encoded characters resolve correctly. */
function projectRoot() {
  return process.env.CLAUDE_PROJECT_DIR
    ? canonical(process.env.CLAUDE_PROJECT_DIR)
    : resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/** One shared migration-filename shape: 1-4 digits + underscore + name, any separators.
 * Used for the Bash pre-gate AND candidate extraction so the gate can never be stricter
 * than the extraction (a stricter gate silently allows what extraction would have caught). */
const MIG_NAME = /(?:^|[^\w.])(\d{1,4}_[\w.-]*\.sql)(?![\w.-])/gi;

/** Canonicalize + relativize a candidate to the repo root (lowercased, forward slashes —
 * git ls-files format). Returns null when the path escapes the root. Shared first half of
 * migrationRel, the cd-target resolution, and the redirect-target check, so the
 * canonicalization contract lives in exactly one place. */
function relToRoot(candidate, root) {
  const abs = canonical(isAbsolute(candidate) ? candidate : resolve(root, candidate));
  const rel = relative(root, abs).split(sep).join("/");
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return rel.toLowerCase();
}

/**
 * Classify one candidate path: relToRoot, then require a migration SQL file under
 * db/migrations/ (case-insensitive: case-insensitive filesystems make
 * DB/Migrations/X.SQL the same file as db/migrations/x.sql).
 * Returns the normalized lowercase slash-relative path for migration SQL files, else null.
 */
function migrationRel(candidate, root) {
  const relLower = relToRoot(candidate, root);
  if (!relLower) return null;
  if (!relLower.startsWith("db/migrations/") || !relLower.endsWith(".sql")) return null;
  return relLower;
}

/**
 * The tracked list for db/migrations, fetched ONCE per invocation with -z (NUL
 * separators) and core.quotepath=false (git would otherwise quote non-ASCII names and
 * the JS-side comparison would miss them). Pathspec matching is case-sensitive, so the
 * DIRECTORY is listed and the case-insensitive match happens here in JS — passing a
 * lowercased path as a pathspec would filter tracked files with uppercase letters out
 * before the comparison could run.
 * Returns a Set of lowercased tracked paths, or null on any git error (callers fail closed).
 */
function trackedSet(root) {
  try {
    const out = execFileSync(
      "git",
      // :(icase) — a repo whose migrations dir has uppercase letters (tracked on a
      // case-sensitive FS) must still be listed; without it the pathspec matches nothing
      // and the guard would silently allow everything there.
      ["-c", "core.quotepath=false", "ls-files", "-z", "--", ":(icase)db/migrations"],
      { cwd: root, encoding: "utf8" },
    );
    return new Set(out.split("\0").filter(Boolean).map((f) => f.toLowerCase()));
  } catch {
    return null; // git failed (not a repo, missing, permission...) — callers fail closed
  }
}

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("error", () => process.exit(2)); // stdin failure: fail closed
process.stdin.on("end", () => {
  try {
    main(JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw));
  } catch (e) {
    // Empty stdin (hook run manually without input) legitimately has nothing to guard.
    // Everything else that throws — malformed JSON, non-string payload fields, any bug —
    // fails CLOSED (exit 2): an immutability guard must never fail open by crashing.
    if (raw.trim().length > 0) {
      console.error("BLOCKED: hook could not process its input (fail-closed).");
      if (e instanceof SyntaxError) {
        console.error("(payload was not valid JSON)");
      } else {
        console.error(`(unexpected hook error: ${e?.message ?? e})`);
      }
      process.exitCode = 2;
      return;
    }
    process.exit(0);
  }
});

function main(payload) {
  // Wrong-shape payloads (null, arrays, string tool_input, numeric command…) don't
  // throw — they just degrade. An immutability guard must not silently degrade to
  // allow: anything that is not the expected object shape fails closed.
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    console.error("BLOCKED: hook received a non-object payload (fail-closed).");
    process.exitCode = 2;
    return;
  }
  if (payload.tool_name !== undefined && typeof payload.tool_name !== "string") {
    console.error("BLOCKED: hook received a non-string tool_name (fail-closed).");
    process.exitCode = 2;
    return;
  }
  if (payload.tool_input !== undefined && (typeof payload.tool_input !== "object" || payload.tool_input === null)) {
    console.error("BLOCKED: hook received a non-object tool_input (fail-closed).");
    process.exitCode = 2;
    return;
  }
  if (payload.tool_name === "Bash" && payload.tool_input?.command !== undefined && typeof payload.tool_input.command !== "string") {
    console.error("BLOCKED: hook received a non-string Bash command (fail-closed).");
    process.exitCode = 2;
    return;
  }

  // ── Bash route: the Edit/Write guard is bypassable via shell commands, so inspect the
  // command line too. Extract migration-file arguments, resolve them (honouring `cd`),
  // classify with the shared classifier, and block only if a referenced file is TRACKED
  // (applied). A redirect to a brand-new 003_*.sql stays allowed, exactly like Write of a
  // new migration. Fail closed when a write verb's target cannot be resolved cleanly.
  if (payload?.tool_name === "Bash") {
    const cmd = String(payload?.tool_input?.command ?? "");
    const cmdLower = cmd.toLowerCase();

    // cheap pre-gate with the SAME name shape as extraction: if neither the directory nor
    // a migration filename appears, nothing in this command can touch a migration.
    if (!cmdLower.includes("migrations") && !MIG_NAME.test(cmdLower)) {
      process.exit(0); // the .test() above advances MIG_NAME.lastIndex — reset before extraction
    }
    MIG_NAME.lastIndex = 0; // load-bearing: matchAll clones the regex with the advanced lastIndex

    // null sinks and fd-duplication redirects (2>&1, >&2) are not writes to the repo
    const cmdNoSink = cmd
      .replace(/\d?>>&?\s*\/dev\/null/g, " ")
      .replace(/\d?>>&?\d/g, " ");

    // write verbs, anchored so `grep install`, `git checkout -b branch` and
    // `tee migrations.log` (log file, not the migration) do not match. sed/perl require
    // an in-place flag (-i, -i.bak, -ni, -Ei, --in-place); bare -n / -pe are read-only.
    const writeish =
      /(^|\s|;|&&|\|\|)(sed\s+(-[^i\s]*i|i|-i\.[^\s]*|--in-place)|perl\s+(-[^e\s]*i\w*e|\w*e\s|.*\s(-i|--in-place)\s))\s/.test(cmdLower)
      || /(^|\s|;|&&|\|\|)(tee|cp|mv|rm|truncate|dd|shred|mkfile|touch|rsync)\s/.test(cmdLower)
        // target-file verbs: the verb matters only if a referenced file resolves to a
        // tracked migration — the candidate loop below decides; tee to a .log file has no
        // migration candidate and resolves nothing, so it is handled by resolvedAny below
        // (its only candidate, "migrations", is not a file path and never resolves).
      || /\bfind\b[^;|&]*-delete/.test(cmdLower)
      || /(^|\s)(git\s+(restore|checkout\s+--|clean)(\s|$))/.test(cmdLower)
      || /(^|\s)<</.test(cmd)
      || redirectTargetInRepo(cmdNoSink, projectRoot());

    if (!writeish) process.exit(0); // read-only mention (cat, ls, git log, grep, 2>&1…)

    // candidate migration file paths mentioned in the command (basename or path form)
    const candidates = new Set();
    for (const m of cmd.matchAll(MIG_NAME)) candidates.add(m[1]);
    for (const m of cmdNoSink.matchAll(/(?:^|[\s"'=;(])(db[\/\\]+migrations[\w.\/\\-]*\.sql|[\\\/]db[\/\\]+migrations[\w.\/\\-]*)/gi)) {
      candidates.add(m[1]);
    }

    const root = projectRoot();
    const tracked = trackedSet(root); // null = git failed → fail closed below
    let resolvedAny = false;
    if (tracked) {
      // honour `cd <dir>`: a bare basename after cd resolves against that directory.
      // The cd target is a plain in-repo path (no .sql requirement — it is usually the
      // db/migrations directory itself).
      let cwdDir = null;
      for (const m of cmd.matchAll(/(?:^|&&|\|\||;)\s*cd\s+([^\s;|&]+)/gi)) {
        const cdRel = relToRoot(m[1], root);
        if (cdRel !== null) cwdDir = cdRel.endsWith("/") ? cdRel : cdRel + "/";
      }
      for (const cand of candidates) {
        let relLower = migrationRel(cand, root);
        if (!relLower && cwdDir) {
          // bare or dir-relative filename after a cd: classify the joined path
          // (covers both `cd db/migrations && … 001.sql` and `cd db && … migrations/001.sql`)
          relLower = migrationRel(cwdDir + cand, root);
        }
        if (!relLower) continue;
        resolvedAny = true;
        if (tracked.has(relLower)) {
          blockBash(cmd);
          return;
        }
      }
    }
    if (!tracked) {
      // git failed → fail closed unconditionally
      blockBash(cmd);
      return;
    }
    if (!resolvedAny) {
      // unresolvable write target: fail closed when the command plausibly targets the
      // migrations directory — either the full `db/migrations` path or any path segment
      // named `migrations` (covers `cd db && … migrations/001.sql` and globs). A write
      // verb whose only "migrations" mention is a non-migration file (`tee
      // migrations.log` — the dot is not a separator) stays allowed.
      const dirContext = /(^|[^\w])(db[\/\\]+migrations)([\/\\\s;|&"']|$)/i.test(cmd)
        || /(^|[^\w.])migrations([\/\\\s;|&"']|$)/i.test(cmd);
      if (dirContext) {
        blockBash(cmd);
        return;
      }
    }
    process.exit(0); // write routed at untracked/new files only
  }

  // NotebookEdit payloads carry notebook_path, not file_path — the matcher claims
  // coverage, so read both.
  const filePathRaw = payload?.tool_input?.file_path ?? payload?.tool_input?.notebook_path;
  if (filePathRaw === undefined || filePathRaw === null || filePathRaw === "") process.exit(0);
  if (typeof filePathRaw !== "string") {
    // unclassifiable payload: fail closed — we cannot tell what file the tool targets
    console.error("BLOCKED: hook received a non-string file_path (fail-closed).");
    process.exitCode = 2;
    return;
  }
  // Windows-style backslash separators: normalize to the host's separator so that a
  // payload written with \ (Claude Code on Windows, or a copy-pasted path) classifies the
  // same as one written with /. Harmless on POSIX, where a literal \ in a filename is
  // rare and fail-closed is the safe direction.
  const filePath = filePathRaw.replace(/[\\/]+/g, sep);

  const root = projectRoot();
  const relLower = migrationRel(filePath, root);
  if (!relLower) process.exit(0); // not a migration SQL file inside this project

  const tracked = trackedSet(root);
  // allow only on a definite "untracked"; "tracked" and git-error (null) both fail closed
  if (tracked && !tracked.has(relLower)) process.exit(0);

  console.error(
    `BLOCKED: editing an applied migration is forbidden (db/migrations is immutable once committed).\n` +
    `File: ${relLower}\n` +
    `Instead, add a NEW numbered migration: db/migrations/<next-number>_<what_it_does>.sql\n` +
    `Follow the add-migration skill: .claude/skills/add-migration/SKILL.md`,
  );
  // Set the exit code and let the process end naturally so stderr is flushed — an immediate
  // process.exit(2) can truncate the buffered message on pipes (code review finding #4).
  process.exitCode = 2;
}

function blockBash(cmd) {
  console.error(
    `BLOCKED: this shell command could modify an applied migration (db/migrations is immutable).\n` +
    `Command: ${cmd.slice(0, 200)}\n` +
    `Instead, add a NEW numbered migration per .claude/skills/add-migration/SKILL.md`,
  );
  process.exitCode = 2;
}

/** A redirect counts as a write ONLY when its target resolves to a path inside the repo —
 * `2>&1`, `>/dev/null`, `>/tmp/x`, `>/dev/null 2>&1` and other out-of-repo sinks are not
 * writes to db/migrations. Returns true if any redirect target classifies as in-repo. */
function redirectTargetInRepo(cmd, root) {
  for (const m of cmd.matchAll(/>{1,2}\s*([^\s;|&]+)/g)) {
    const target = m[1].replace(/^["']|["']$/g, "");
    if (!target || target.startsWith("&")) continue; // >&N fd-duplication
    // migration target → write; non-migration but in-repo → also a write (the candidate
    // loop then decides); out-of-repo sink → not our concern
    if (relToRoot(target, root) !== null) return true;
  }
  return false; // all redirect targets are out-of-repo sinks
}
