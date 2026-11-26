#!/usr/bin/env node
// owner: @skindyk · why: Read() denies stop `cat .env`, but a recursive `grep -rn SECRET .` printed .env in a live test (mentor review 2026-11-26) · review-by: 2027-03-01
//
// PreToolUse hook for Bash/PowerShell. Blocks (exit 2, reason on stderr):
//   1. content searches over the project root that would read .env* and don't exclude it:
//      grep -r/-R, rg/ag with ignore files disabled, findstr /s, Select-String over a recursive or wildcard listing,
//      and dotfile globs like `grep X .*`;
//   2. commands and inline scripts that read an .env file by name (cat, head, Get-Content, source, cp, node -e …).
// Allowed: `.env.example` (committed, fake values), `git grep` (tracked files only), plain `rg` (skips git-ignored
// and hidden files), searches limited to a subfolder (`grep -rn x lib/`), and searches that exclude .env*.
// Decisions are appended to .claude/hooks/protect-secrets.log (git-ignored).
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}
const tool = payload.tool_name ?? "";
if (tool !== "Bash" && tool !== "PowerShell") process.exit(0);
const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();

// Heredoc bodies: text written to a file (`cat > notes.md <<EOF`) is data and is dropped; a body fed to an
// interpreter (`node - <<EOF`, `python - <<EOF`, `bash <<EOF`) is a script and is checked as one.
const heredocScripts = [];
function stripHeredocs(text) {
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const m = lines[i].match(/<<-?\s*['"]?([A-Za-z_]\w*)['"]?/);
    if (!m) continue;
    const body = [];
    while (i + 1 < lines.length && lines[i + 1].trim() !== m[1]) body.push(lines[++i]);
    i++; // terminator
    if (/\b(node|python3?|perl|ruby|bash|sh|zsh|pwsh|powershell|deno|bun)(\.exe)?\b/i.test(lines[i - body.length - 1] ?? "")) heredocScripts.push(body.join("\n"));
  }
  return out.join("\n");
}
const cmd = stripHeredocs(String(payload.tool_input?.command ?? "")).replace(/\\/g, "/");

function block(why) {
  try {
    const line = [new Date().toISOString(), "BLOCK", tool, payload.session_id ?? "-", why, cmd.slice(0, 200).replace(/\s+/g, " ")].join("\t");
    appendFileSync(join(projectDir, ".claude", "hooks", "protect-secrets.log"), line + "\n");
  } catch {}
  process.stderr.write(
    `BLOCKED by .claude/hooks/protect-secrets.mjs: ${why}\n` +
      `.env files hold real secrets and must not reach the agent's context (AGENTS.md rule 4).\n` +
      `Do this instead: search tracked files with \`git grep\` or plain \`rg\` (both skip .env), search a subfolder, ` +
      `or exclude secrets explicitly, e.g. \`grep -rn --exclude='.env*' PATTERN .\`. For variable names, read .env.example.\n`,
  );
  process.exit(2);
}

const ENV_NAME = /^(.*\/)?\.env(\.(?!example$)[\w.-]+)?$/i; // .env, .env.local, x/.env.production — not .env.example
const ENV_IN_TEXT = /(^|[\s'"`=(,/])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'"`),;|&<>])/i;
const EXCLUDES_ENV = /(--exclude(-dir)?(=|\s+)|--glob(=|\s+)|(^|\s)-g\s+|-Exclude\s+)['"]?!?[^\s'"]*\.env/i;
const INLINE = /\b(node|python3?|perl|ruby|bun|deno|pwsh|powershell)(\.exe)?\s+([^|;&\n]*\s)?-(e|c|p|-eval|Command)\b/i;
/** A search location that includes the project root (where .env lives). No location means the current folder. */
const atRoot = (paths) => paths.length === 0 || paths.some((p) => /^(\.|\.\/|\*|\*\.\*|\.\/\*|\.\.(\/.*)?|~.*|\/)$/.test(p));

const words = (stage) =>
  stage.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/^[({'"`]+|[)}'"`,;]+$/g, ""));
/** Operands of a search command: drop flags, flag values and the pattern. */
function searchPaths(args, valueFlags) {
  const out = [];
  let patternSeen = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (/^(-e|--regexp|-Pattern)$/i.test(a)) { i++; patternSeen = true; continue; }
    if (valueFlags.test(a)) { i++; continue; }
    if (a.startsWith("-") || (a.startsWith("/") && a.length <= 3)) continue; // flags (findstr uses /s /i)
    if (!patternSeen) { patternSeen = true; continue; }
    out.push(a);
  }
  return out;
}

for (const script of heredocScripts) if (ENV_IN_TEXT.test(script.replace(/\\/g, "/"))) block("heredoc script reads an .env file");

for (const seg of cmd.split(/&&|\|\||;|\n/)) {
  const s = seg.trim();
  if (!s) continue;
  if (EXCLUDES_ENV.test(s)) continue; // the command keeps .env out explicitly

  if (INLINE.test(s)) {
    if (ENV_IN_TEXT.test(s)) block("inline script reads an .env file");
    continue;
  }

  const stages = s.split("|");
  for (let k = 0; k < stages.length; k++) {
    const w = words(stages[k]);
    while (w.length && /^(sudo|env|command|nohup|time|xargs|exec)$/i.test(w[0])) w.shift();
    const verb = (w[0] ?? "").toLowerCase();
    const args = w.slice(1);
    if (!verb) continue;

    // 1. Searches that can reach .env without naming it.
    if (/^(e|f)?grep$/.test(verb) && args.some((a) => /^(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive|--dereference-recursive)$/.test(a))) {
      if (atRoot(searchPaths(args, /^(-[ABCmf]|--include|--exclude|--color)$/))) block("recursive grep over the project root would read .env* files");
    }
    if (/^(rg|ag)$/.test(verb) && args.some((a) => /^(-u+|--no-ignore\S*|--hidden|--unrestricted|--skip-vcs-ignores|-\.|-[a-zA-Z]*u[a-zA-Z]*)$/.test(a))) {
      if (atRoot(searchPaths(args, /^(-[tTgABCmM]|--type|--glob|--max-count)$/))) block("rg/ag with ignore rules disabled would read .env* files");
    }
    if (verb === "findstr" && args.some((a) => /^\/s$/i.test(a))) {
      if (atRoot(searchPaths(args, /^$/))) block("findstr /s over the project root would read .env* files");
    }
    if (/^(select-string|sls)$/.test(verb)) {
      const prev = k > 0 ? words(stages[k - 1]) : [];
      const listing = /^(get-childitem|gci|dir|ls)$/i.test(prev[0] ?? "");
      const recursive = listing && prev.slice(1).some((a) => /^-(Recurse|r)$/i.test(a));
      const listingPaths = prev.slice(1).filter((a, i, all) => !a.startsWith("-") && !/^-(Filter|Include|Exclude|Depth)$/i.test(all[i - 1] ?? ""));
      const pi = args.findIndex((a) => /^-Path$/i.test(a));
      const wildcard = pi !== -1 && /(^|\/)\*/.test(args[pi + 1] ?? "");
      if ((recursive && atRoot(listingPaths)) || wildcard) block("Select-String over a recursive or wildcard listing would read .env* files");
    }
    if (/^(cat|head|tail|less|more|grep|egrep|fgrep|type|strings|base64|xxd|od|get-content|gc)$/.test(verb) && args.some((a) => /^(\.\/)?\.[\w-]*\*/.test(a))) {
      block("a dotfile glob (.*) would match .env* files");
    }

    // 2. An .env file named as an operand (Read() denies cover some of these too; this is the shell-side guarantee).
    if (/^(ls|dir|test-path|echo|printf|write-host|write-output|touch)$/.test(verb)) continue;
    if (verb === "git" && /^(status|check-ignore|ls-files|add|rm|diff|log|grep)$/.test(args[0] ?? "")) continue;
    let operands = args;
    if (/^(e|f)?grep$|^rg$|^ag$|^findstr$|^select-string$|^sls$/.test(verb)) operands = searchPaths(args, /^$/);
    if (operands.some((a) => ENV_NAME.test(a))) block("command reads an .env file by name");
  }
}
process.exit(0);
