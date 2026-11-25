# Team AI agreement — Team Tasks

<!-- owner: @RudyRoom1 · review-by: 2027-03-01 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/*.test.ts`) | L4 | New test fails without the change it covers and passes with it; `npm test` green; no non-test file in the diff | Sampled weekly by @RudyRoom1 |
| Business rules (`lib/tasks.ts`) | L3 | Each changed rule has a boundary test (accepted at the limit, rejected past it); `npm test` + `npm run typecheck` green | Any team member, on the PR |
| API routes (`app/api/**`) | L3 | Test or `curl` transcript for every status code touched (200/201/400/404/422); `npm run typecheck` green | Any team member, on the PR |
| New migration (`db/migrations/NNN_*.sql`, new file) | L2 | `npm test` runs all migrations on a fresh in-memory DB; `npm run db:reset` + `npm run dev` start cleanly; `git status db/migrations` shows only new files; human reads every SQL line | @RudyRoom1 (tech lead) |
| Harness (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L1 | A/B note (≥ 2 runs per side) for behaviour changes; CODEOWNERS approval | @RudyRoom1 |
| Editing an applied migration, reading `.env` / `data/*.db` | L0 | Blocked: `protect-migrations` hook (exit 2) and `deny` rules in `.claude/settings.json` | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns every line in it as if they wrote it, including during review and incidents.
"The agent did it" is not an answer in review.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`, `next.config.ts`: @RudyRoom1 (see `.github/CODEOWNERS`)

## 4. How rules change

1. **Propose:** anyone opens a PR that changes the rule. The PR says why (incident, repeated review comment, new need) and fills in the `owner · why · review-by` header.
2. **Prove:** a behaviour change (new rule, hook, skill or permission) comes with an A/B note in `docs/ai/` with ≥ 2 runs per side. Wording fixes don't need one.
3. **Approve:** a CODEOWNER reviews it, and one approval is needed to merge. A new hook also needs its manual-run output (see `docs/ai/hook-test.md`).
4. **Expire:** when a rule passes its `review-by` date, its owner re-confirms it with a new date and a short reason, or deletes it in a PR within 2 weeks. An expired rule is a candidate for deletion, not something to keep by default.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.