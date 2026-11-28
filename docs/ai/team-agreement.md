# Team AI agreement — Iron Born

<!-- owner: @vitalii-liashenko · review-by: 2027-02-23 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Tests only (`lib/tasks.test.ts`) | L3 | `npm test` green; a new test fails on the old code and passes on the new | PR reviewer |
| Business rules (`lib/tasks.ts`) | L2 | Every rule change has a test in the same PR; `npm test` and `npm run typecheck` green; human reads every line | Tech lead |
| Route handlers (`app/api/**`) | L3 | `npm run typecheck` and `npm test` green; handler only parses input and calls `lib/`, no business rules | PR reviewer |
| New migration (new numbered file in `db/migrations/`) | L2 | `npm run db:reset` then `npm run dev` applies it on a fresh DB; rollback note in the PR | Tech lead |
| Editing an applied migration | L0 | Blocked by the `PreToolUse` hook for Edit/Write/MultiEdit (`.claude/hooks/block-applied-migration.mjs`); a Bash `sed -i` on a migration is blocked by a `deny` rule in `.claude/settings.json`. Other Bash writes (`>`, `tee`, scripts) are not covered: the reviewer checks the PR diff for `db/migrations/` | — |
| Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) | L1 | Agent drafts, a human writes the final text; behaviour changes need an A/B note | CODEOWNERS |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person who opens the PR owns it as if they wrote it.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @vitalii-liashenko (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone opens a PR that touches `AGENTS.md`, `.claude/**` or `docs/ai/**`, with the reason in the PR body and the rule's header (`owner`, `why`, `review-by`).
2. A CODEOWNERS member approves. A change that alters agent behaviour also needs an A/B note (`docs/ai/ab-note.md`) with at least 2 runs on each side.
3. Rules and hooks are merged only when their header is complete.
4. When `review-by` passes, the owner re-checks the rule and either extends the date with a new PR or removes the rule.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.

## 6. Permissions and hooks: why each one exists

`.claude/settings.json` has no room for comments, so this table is its header. Owner for all rows: @vitalii-liashenko. Review-by for all rows: 2027-02-23.

| Entry in `.claude/settings.json` | Kind | Why |
|---|---|---|
| `Read(./.env)`, `Read(./.env.local)` | deny | secrets must not enter the agent's context |
| `Bash(rm -rf:*)` | deny | irreversible deletion |
| `Bash(git push --force:*)` | deny | rewrites shared history |
| `Bash(sed -i:*)` | deny | in-place edit of a migration through Bash, which the hook does not see |
| `Bash(npm run db:reset)` | ask | deletes the local SQLite file |
| `Bash(git push:*)`, `Bash(git commit:*)` | ask | publishes or records work; a human confirms |
| `Bash(npm test)`, `Bash(npm run typecheck)`, `Bash(git status)`, `Bash(git diff:*)` | allow | read-only or verification commands |
| `PreToolUse` hook `block-applied-migration.mjs` | hook, exit 2 | editing an applied migration makes databases that already ran it diverge |
