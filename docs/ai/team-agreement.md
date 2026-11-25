# Team AI agreement — Team Tasks

<!-- owner: @SayidJarrah · why: one shared answer to "how far may the agent go here" instead of per-person setups · review-by: 2027-05-25 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Paths | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|---|
| Tests only | `lib/*.test.ts` | **L3** | new test is red without the code change and green with it; `npm test` exit 0 shown in the PR | any team member |
| Business rule | `lib/tasks.ts` | **L3** | one unit test per rule, boundaries included (e.g. 1 and 40, 1 and 120 chars); `npm test` and `npm run typecheck` exit 0 | any team member |
| API route | `app/api/**` | **L3** | rule violations go through `RuleViolation` → 422, bad body → 400; a test or a `curl` run per status code pasted in the PR; `npm run typecheck` exit 0 | any team member |
| New migration | `db/migrations/NNN_*.sql` (new file only) | **L2** | `npm test` exit 0 (tests open `:memory:` and apply every migration from scratch); DB `check` matches the validation in `lib/tasks.ts`; rollback note in the PR | harness owner, every line |
| Dependencies | `package.json`, `package-lock.json` | **L1** | `npm install` is `ask` in `.claude/settings.json`; a human decides and writes the change | harness owner |
| Harness | `AGENTS.md`, `.claude/**`, `docs/ai/**` | **L1** | CODEOWNERS approval; an A/B note for anything that changes agent behaviour | harness owner |
| Editing an applied migration | `db/migrations/001_*`, `002_*`, … (already on `main`) | **L0** | blocked by the `PreToolUse` hook `.claude/hooks/protect-migrations.mjs` (exit 2) | — |
| Secrets | `.env`, `.env.*` (not `.env.example`) | **L0** | `deny` on `Read`/`Edit` in `.claude/settings.json` | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.
Nothing is L4 yet: there is no CI gate in this repo. It can be proposed once CI runs `npm test` on every PR.

## 2. Who owns agent output

The person who opens the PR owns every line in it as if they wrote it, including what the agent wrote.
"The agent did it" is not an answer in review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @SayidJarrah (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone proposes a change by PR. The PR says which incident or need it answers (the `why:` in the header).
2. A harness owner (CODEOWNERS) reviews. A change that should alter agent behaviour comes with an A/B note
   (`docs/ai/ab-note.md` format): the same task before and after, at least 2 runs each.
3. Every rule, skill and hook carries `owner`, `why` and `review-by` (3–6 months out).
4. When `review-by` passes, the owner re-confirms the rule with a new date or deletes it in a PR. A rule nobody
   re-confirms is removed.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
