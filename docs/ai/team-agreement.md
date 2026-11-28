# Team AI agreement — art-team

<!-- owner: @artem-tkachenko · review-by: 2027-05-23 · change it by PR, CODEOWNERS approve -->

One page. How far agents may go in this repo, how we check their work, who owns the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | What the agent does | Evidence that earns this level | Who signs off |
|---|---|---|---|---|
| Documentation (`docs/**`, `README.md`) | L2 | reads freely; edits only after human approval | `npm test` and `npm run typecheck` stay green; a human reviews every line of the diff | any team member |
| UI (`app/**/*.tsx`) | L2 | reads freely; edits only after human approval | `npm test` and `npm run typecheck` green; a human reviews the diff | any team member |
| API (`app/api/**`) | L2 | reads freely; edits only after human approval | `npm test` and `npm run typecheck` green; a human reviews the diff | any team member |
| Business logic (`lib/**`) | L2 | reads freely; edits only after human approval | `npm test` and `npm run typecheck` green; every new or changed rule has a test in `lib/tasks.test.ts`; a human reviews the diff | any team member |
| New migration (new file in `db/migrations/`) | L2 | creates a new `.sql` only after human approval | `npm test` runs every migration on a fresh `:memory:` DB and is green; a human reviews the SQL | @artem-tkachenko |
| Editing an applied migration (any `db/migrations/*.sql` already in the repo) | L0 | does not edit | blocked by a hook; `openDb()` skips applied files by name, so an edit would make schemas diverge between databases | — |

**For every row:** the agent runs `npm test` and `npm run typecheck` without asking. At the end of each session a human
reviews `git diff` as a safety net: the agent must not have changed any file whose edit was not approved.
Approval for an edit is given per file, or once for a whole group (documentation, UI, API, business logic).

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

### Commands and file access

| Action | Rule |
|---|---|
| `npm test`, `npm run typecheck` | allowed without asking |
| `npm install` | only after human approval; approve if `node_modules/` is missing, but do not approve package changes without review |
| `npm run dev`, `npm run build`, `npm start` | only after human approval (`dev`/`start` open `data/tasks.db` and apply new migrations) |
| `git fetch` | allowed without asking |
| `git pull`, `git commit`, `git push`, `git reset`, `git clean`, `git restore`, `git checkout --` | only after human approval |
| `npm run db:reset` | forbidden for the agent; only a human runs it by hand |
| reading `.env` and `.env.*` | forbidden, except `.env.example` (fake values only, shows which variables exist); `protect-secrets` is a best-effort guard, not a sandbox |
| editing `db/migrations/**`, `AGENTS.md`, `.claude/**`, `docs/ai/**` | always asks, even in auto-accept mode (`ask` in `.claude/settings.json`) |
| editing `package.json`, `package-lock.json`, `lib/db.ts`, `scripts/**`, `.gitignore`, `.github/**`, `next.config.ts` | always asks: these files can bypass other rules (e.g. a changed `test` script runs under the allowed `npm test`, or `next.config.ts` can re-enable managed AGENTS.md edits) |

## 2. Who owns agent output

The agent is a tool. The person who opens the PR owns it as if they wrote it.

Before commit and push, that person:
1. runs `npm test` and `npm run typecheck` — both green;
2. reviews `git diff` and understands every change;
3. confirms the commit and push themselves — the agent never does them without permission.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @artem-tkachenko (see `.github/CODEOWNERS`)

## 4. How rules change

1. Anyone on the team proposes a change by PR to `AGENTS.md`, `.claude/**` or `docs/ai/**`, with an objective reason: what problem it solves.
2. If the change gives the agent more autonomy (raises a level in the matrix, loosens a `deny`/`ask` or a hook), the PR includes an A/B note (`docs/ai/ab-note.md`): at least 2 runs before and after, tests, rule violations.
3. The harness owner (@artem-tkachenko, see `.github/CODEOWNERS`) decides whether to merge, based on the reason and the A/B results.
4. `review-by` dates are checked during the regular harness review: the agent is not fully predictable, so rules must be
   re-checked against its real behaviour. When the date arrives, a rule is either extended with a new date or removed.
   The harness owner may extend a date without a PR, since that loosens nothing. Removing or loosening a rule always
   goes through a PR (steps 1–3), whoever starts it.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No root-level `CLAUDE.md` / `CLAUDE.local.md` in the repo; scoped instructions live in `.claude/rules/`.
