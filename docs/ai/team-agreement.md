<!-- owner: @Bondarenko199 · why: a solo team still needs explicit agent-autonomy rules so every change type is governed, not guessed · review-by: 2027-02-22 · change it by PR, CODEOWNERS approve -->

# Team AI agreement — Bondarenko199 (solo)

One page. How far agents may go in this repo, how their work is checked, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`, CODEOWNERS) | L2 | Agent proposal only; owner reviews every line (governed config, matches CODEOWNERS) | Owner |
| Docs, comments, A/B notes (`docs/**`, `*.md` — excluding the harness files above) | L3 | Agent runs `npm test` + `npm run typecheck`; docs-only diff (no `lib/`, `app/`, `db/` changes) | Owner reviews the PR |
| New code + its tests (`lib/**`, `app/**`) | L3 | `npm test` and `npm run typecheck` green; every business rule change has a failing test first | Owner reviews the PR line by line |
| New migration (`db/migrations/0NN_*.sql`) | L2 | `npm test` green — fresh-DB check per [add-migration skill step 5](../../.claude/skills/add-migration/SKILL.md) (`db:reset` is human-run, denied for agents); no destructive SQL without a rollback note in the PR | Owner reviews the PR line by line |
| Editing an applied migration (`db/migrations/**`, existing file) | L0 | Blocked by the `protect-migrations` PreToolUse hook (exit 2); rewrite history instead: add `0NN+1_*.sql` | — (hook blocks; human decides next step) |

No L4 in this solo repo: "agent merges" would require `gh pr merge`, which sits on `ask` in `.claude/settings.json` —
a human always clicks merge. L4 becomes reachable only if that rule is consciously changed (see §4).

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it. In this solo repo that is always @Bondarenko199: every agent
change ships through a PR with the checks above, never straight to `main`.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @Bondarenko199 (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone (here: the owner, or an agent proposal in a PR) edits the rule and adds its evidence to the PR description.
2. The owner reviews; behaviour changes of the harness (hooks, permissions) require an A/B note in `docs/ai/ab-note.md`.
3. Every rule carries a `review-by` date. Past that date the rule is re-confirmed in a PR or removed — stale rules are deleted, not ignored.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
