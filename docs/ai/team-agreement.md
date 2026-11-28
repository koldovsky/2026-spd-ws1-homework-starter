# Team AI agreement — Team Tasks (spd-ws1)

<!-- owner: @vvfesik · why: no shared autonomy limits — every agent task renegotiated scope ad hoc; this page fixes levels, evidence and owners · review-by: 2027-02-25 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Test-only change (`lib/**/*.test.ts` and new test files) | L4 | New/changed tests fail without the fix and pass with it; `npm test` green on the PR | @vvfesik, sampled weekly |
| App code (`app/**`, `lib/**` except tests and `db.ts`) | L3 | `npm run typecheck` and `npm test` green; API changes list a request/response check per status code in the PR body | any team member |
| New migration (a new file in `db/migrations/`) | L2 | `npm run db:reset && npm test` green — applies cleanly on a fresh DB; rollback note in the PR; business-rule changes in `lib/tasks.ts` come with a test | @vvfesik |
| Editing an applied migration (existing `db/migrations/*.sql`) | L0 | Blocked by hook (PreToolUse, exit 2); fix forward with a new migration instead | — (hook blocks agents) |
| Secrets and env (`.env`, `.env.local`, `.env.development`, `.env.production`, keys, tokens) | L0 | Read and edit denied in `.claude/settings.json` (`.env.example` stays readable — it documents the shape); secrets live in `.env` (git-ignored) | — (permission deny) |
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`, `.github/CODEOWNERS`) | L1 | Agent drafts in a PR; every rule keeps an `owner · why · review-by` header; behaviour-changing rules ship with an A/B note (`docs/ai/ab-note.md`) | @vvfesik (CODEOWNERS) |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns agent-written code as if they had written it: they answer review comments, they fix or revert, they do not blame the agent. A line merged from an agent is your line.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`, `.github/CODEOWNERS`: @vvfesik (see `.github/CODEOWNERS`)
- The team is one person today (homework repo); the process below is written so a second member slots in without rewriting it.

## 4. How rules change

1. Anyone proposes a change by PR against this file or the rule/skill/hook it touches, keeping the `owner · why · review-by` header on every changed rule.
2. Behaviour-changing rules (new or changed hook, permission, skill) must attach an A/B note: same task before and after, ≥2 runs per side.
3. @vvfesik reviews; harness paths require CODEOWNERS approval; merge puts the rule in force.
4. Past its `review-by` date, a rule is re-confirmed (bump the date) or deleted in the next PR that touches it — stale rules are removed, never silently ignored.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
