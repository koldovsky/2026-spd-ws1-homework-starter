# Team AI agreement — garnaga (solo harness)

<!-- owner: @garnaga · why: solo harness for HW 1.1, kept in team format so it transfers to a real team · review-by: 2027-02-25 -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| secrets/`.env` access | L0 | denied by `.claude/settings.json`; nothing to verify — blocked | — |
| editing an applied migration | L0 | blocked by `protect-migrations` hook (evidence: `docs/ai/evidence/hook-firing.md`) | — |
| new migration | L3 | `add-migration` skill check: `npm run db:reset` (fresh-DB apply) + tests green + rollback note | PR review |
| app code / API (`lib/`, `app/`) | L3 | `npm test && npm run typecheck` green; route behavior covered by tests | PR review |
| harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L2 | every line reviewed; CODEOWNERS enforces `@garnaga` approval | `@garnaga` |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

Honest boundary: the `protect-migrations` hook covers `Edit`/`Write`-class tools only. Shell-based migration edits are not blocked by the hook and are caught in review.

Why no comments in `.claude/settings.json`: JSON settings files cannot carry comments, so the reasoning ("why") for each permission and hook lives in the `protect-migrations` hook script header and in this agreement.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: `@garnaga` (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone can propose a change by PR.
2. Changes to matrix levels or hook behavior require an A/B note (`docs/ai/templates/ab-note.md`) as evidence.
3. Past `review-by` (2027-02-25) a rule is re-confirmed or deleted by PR.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
