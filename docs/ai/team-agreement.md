# Team AI agreement — Team Tasks (HW 1.1)

<!-- owner: @JKord · why: one shared answer to "how far may the agent go here, and how do we check it" · review-by: 2027-02-28 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Docs and comments (`docs/**`, `*.md`) | L3 | PR review; no code paths affected | any team member |
| Logic in `lib/**` covered by tests | L3 | `npm test` + `npm run typecheck` green in the PR | any team member |
| `app/api/**` (API contract) | L2 | `npm test` green + manual `curl` of the changed route pasted into the PR + owner review | @JKord |
| `db/migrations/**` | L2 (ask before acting) | agent announces the new file before writing it; new file only (`00N_name.sql`, next number); `npm run db:reset` + `npm test` green | @JKord |
| Editing an applied migration, `.env*` | L0 | Edit/Write blocked by the `protect-migrations` hook (exit 2, see `docs/ai/hook-evidence.md`); `.env*` reads blocked by `deny` in `.claude/settings.json` | @JKord |
| Harness (`.claude/**`, `AGENTS.md`, `.github/CODEOWNERS`) | L1 | every agent Edit/Write hits an `ask` prompt in `.claude/settings.json`; merge only via PR with CODEOWNERS approval | @JKord |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns agent-written changes as if they had written them themselves.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`, `.github/CODEOWNERS`: @JKord (see `.github/CODEOWNERS`)
- `db/migrations/**`: @JKord

## 4. How rules change

1. Anyone opens an issue describing the proposed rule and the evidence that justifies the new level (for behaviour changes — an A/B note in `docs/ai/`).
2. The change lands as a PR against the harness files; CODEOWNERS review is required.
3. @JKord reviews and merges; `review-by` dates on touched files are bumped.
4. The change is announced to the team in the team chat.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
