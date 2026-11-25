# A/B note — team harness (AGENTS.md, migrations rule, `add-task-field` skill, hook, permissions)

<!-- owner: @SayidJarrah · why: prove whether the harness changes agent behaviour, not just adds files (HW 1.1, item 9) · review-by: 2027-05-25 -->

**Task given to the agent (identical in A and B):**
> Add a `priority` field to tasks (low/medium/high, default medium), validate it, and expose it in the API.

**A — before** (commit `62ac6f8`, no harness) · **B — after** (commit `5b74c73`, this harness)

Why this task: it needs a schema change, so it hits the riskiest rule (never edit an applied migration) and the
path rule, skill and hook all apply.

**Setup, same for every run:** a fresh `git worktree` at the commit, `node_modules` copied in, then
`claude -p "<prompt>" --output-format stream-json --verbose --permission-mode acceptEdits --allowedTools "Bash(npm *)"
"Bash(npx *)" "Bash(node *)" "Bash(git diff*)" "Bash(git status*)" "Bash(ls*)" "Bash(cat*)"`.
Claude Code 2.1.332, model `claude-opus-5-5`, macOS, 2026-11-25. After the agent finished I ran `npm test` myself.
Script: [`ab-runs/run.sh`](ab-runs/run.sh). Per run: diff, diffstat, metrics and the agent's final report in
[`ab-runs/`](ab-runs/).

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes, 13/13 | none — new `003_add_task_priority.sql` | 3 (`003_*.sql`, `lib/tasks.ts`, `lib/tasks.test.ts`) | 13 / $0.37 | 2 permission denials (compound `for` loop, `&&` chain) |
| 2 | A | yes, 13/13 | none — new `003_*.sql` | 3, same | 14 / $0.37 | 1 denial (heredoc + python) |
| 1 | B | yes, 13/13 | none — new `003_*.sql` | 3, same | 21 / $0.41 | used skill `add-task-field`; read `migrations.md`; ran `git status` to confirm no migration changed; 3 denials |
| 2 | B | yes, 13/13 | none — new `003_*.sql` | 3, same | 21 / $0.47 | used skill; read rules and team agreement; checked DB `check` = code rule; 4 denials |

**What changed**

- **The agent followed the team procedure.** Both B runs invoked `/add-task-field` and read
  `.claude/rules/migrations.md` before writing. Neither A run had a procedure to follow; both explored the repo
  from scratch (`cat AGENTS.md CLAUDE.md` came back empty, then they read every source file and `TASK-7.md`).
- **Verification matched the skill's "Check" section.** Both B runs ran `git status --short` to prove that exactly one
  new migration exists and none changed, and reported it: *"No existing migration was touched; `git status` shows this
  as the only new migration file."* (B2). B2 also stated *"The code check and the database check allow the same three
  values"*, a check item from the skill. B reports give the test count before → after (*"4 to 13"*); A reports don't.
- **Same shape of code.** All four diffs add `003_add_task_priority.sql`, a `PRIORITIES` const, a `RuleViolation`
  and 9 tests. The harness did not change *what* was built here.

**What didn't change**

- **No rule violations on either side.** Without any harness the agent already created a new migration instead of
  editing `001`/`002`. The hook never fired in B because nothing tried to break the rule. Its value is shown
  separately in [`hook-evidence.md`](hook-evidence.md), where an explicit request to edit `001` is blocked.
- **Cost went up, not down.** B took 21 turns in both runs vs 13–14 in A (+50%), $0.41–0.47 vs $0.37 (+10–27%),
  51–58 s vs 43–44 s. The extra turns are the skill's verification steps and reading the rule files. I expected
  `AGENTS.md` to cut exploration; it did not offset the added checks.
- **Permission denials did not drop (3–4 in B vs 1–2 in A).** The agent chains commands (`npm test; echo $?;
  npm run typecheck`), and `allow: Bash(npm test *)` matches only a single command, so chains are denied and retried.
  More checks meant more chains. Follow-up: add "run each check as its own command" to `AGENTS.md`, then re-run B.

**Verdict:** for this task the harness bought predictability and a verifiable report, not a different result, at
about +50% turns. Its protective parts (hook, `deny` on `.env`) did not come into play in A/B and are proven by direct
tests instead. Two runs per side is a small sample; the turn counts were stable within each side (13/14, 21/21).
