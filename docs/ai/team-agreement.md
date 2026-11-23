# Team AI agreement — SDET SAT

<!-- owner: @oksanastrohetska · review-by: 2026-12-01 · change it by PR, CODEOWNERS approve -->

This agreement defines how AI agents can contribute to the Team repository, how their work is verified,
and who is responsible for maintaining the harness.

## 1. Autonomy matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line ·
**L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| UI styling and layout changes | L3 | `npm run build` passes; before/after screenshots demonstrate expected visual changes; human reviews the PR | PR reviewer |
| UI behavior and form validation | L3 | Tests cover user interactions, form validation, and error states; npm test passes | PR reviewer |
| Tests and test fixtures | L3 | New tests verify the intended behavior; npm test passes; bug regression tests fail before the fix and pass afterward | PR reviewer |
| API endpoints | L3 | Tests cover successful requests, validation failures, and relevant HTTP status codes; npm test passes. | PR reviewer |
| Business logic | L2 | Unit tests cover changed behavior and edge cases; npm test passes; human reviews every changed line | PR reviewer |
| New database migrations | L2 | Migration succeeds on a fresh database; schema changes are reviewed; rollback or recovery procedure is documented | PR reviewer |
| Editing existing applied migrations | L0 | 'PreToolUse' hook blocks modifications to existing applied migrations with exit code 2; violation output is captured as evidence | — |

Rule of thumb: a change type goes one level up only when its check is cheap, independent of the agent, and runs every time.

## 2. Who owns agent output

The person opening the pull request is responsible for all AI-generated changes as if they wrote them personally.
They must understand the changes, verify test results, review the diff, and ensure no secrets, confidential data,
or unrelated modifications are included. AI-generated code must follow the same review and quality standards as human-written code.

## 3. Harness owners

- `AGENTS.md`, `.claude/**`, `docs/ai/**`: @oksanastrohetska (see `.github/CODEOWNERS`)

## 4. How rules change

1. Any contributor may propose a harness change through a pull request explaining the problem and expected behavior.
2. Changes affecting agent behavior must include evidence, such as an A/B comparison, a failing and passing test, or hook execution output.
3. The harness owner reviews the proposal, checks for conflicts with existing rules, and approves changes before merging. Authors cannot self-approve.
4. When a rule reaches its review-by date, the owner evaluates whether it is still necessary, updates or removes it, and sets a new review date through a PR.

## 5. Personal vs team

Personal preferences: `~/.claude/CLAUDE.md`, `.claude/settings.local.json` (git-ignored). No `CLAUDE.md` / `CLAUDE.local.md` in the repo.
