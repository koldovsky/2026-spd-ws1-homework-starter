# Team AI agreement — My Awesome Team

<!-- owner: @oshamoiev · review-by: 2027-02-25 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`**/*.test.ts`) | L3 | New tests fail without the change and pass with it; `npm test` green. Not L4: no CI runs the tests yet | PR reviewer |
| API route (`app/api/**`) | L3 | `npm test` and `npm run typecheck` green; each status code (201, 400, 422) is covered by a test | PR reviewer |
| New DB migration (new file in `db/migrations/`) | L2 | Applies on a fresh DB (`npm run db:reset`, then `npm test`); rollback note in the PR; `check` constraints match the rules in `lib/tasks.ts` | Harness owner |
| Editing an applied migration | L0 | Blocked by the `PreToolUse` hook; fix forward with a new numbered migration | — |
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`, CODEOWNERS) | L2 | Every line reviewed; behaviour changes come with an A/B note | Harness owner (CODEOWNERS) |
| Real secrets (`.env`, `.env.*` except `.env.example`) | L0 | Blocked by `deny` permissions in `.claude/settings.json` | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. "The agent did it" is not an answer in review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @oshamoiev (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone proposes a change to a rule, skill, hook or permission by PR.
2. The PR states the reason in the rule header (`owner`, `why`, `review-by`). A change in agent behaviour needs an A/B note: the same task, before and after.
3. The harness owner reviews and approves through CODEOWNERS.
4. A rule past its `review-by` date is reviewed within one week: renew the date with a reason, or delete the rule.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
