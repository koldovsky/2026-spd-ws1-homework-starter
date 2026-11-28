# Team AI Agreement — Task Management App

<!-- owner: @IraOets · review-by: 2027-01-20 · change it by PR, CODEOWNERS approve -->

This agreement defines agent autonomy, verification requirements, and ownership for the task management application.

## 1. Autonomy Matrix

Levels: **L0** no agent · **L1** agent suggests, human writes · **L2** agent writes, human reviews every line · **L3** agent writes and runs checks, human reviews the PR · **L4** agent merges when gates are green, human audits samples.

| Change type | Level | Evidence that earns this level | Who signs off |
|---|---|---|---|
| Documentation changes | L3 | Diff reviewed for accuracy; referenced paths and commands checked manually | PR reviewer |
| UI components (`app/page.tsx`) | L3 | `npm run typecheck`, `npm test` and `npm run build` pass; visual changes manually reviewed | PR reviewer |
| API endpoints (`app/api/tasks/**`) | L2 | `npm test` and `npm run typecheck` pass; relevant status codes verified with route-level tests or documented manual checks | Human reviewer, line by line |
| New database migrations | L2 | New numbered SQL file; migration tested on a fresh database; existing migrations unchanged | Repository owner |
| Editing tracked migrations | L0 | PreToolUse hook blocks edits to tracked files in `db/migrations/`; blocking test returns exit code 2 | Not permitted |

A change type may receive more autonomy only when verification is reliable, repeatable, and appropriate for the risk.

## 2. Who Owns Agent Output

The person opening a PR owns all AI-generated changes as if they wrote them.

The PR author is responsible for reviewing changes, verifying checks, and reporting limitations.

## 3. Harness Owners

- `AGENTS.md`: @IraOets
- `.claude/**`: @IraOets
- `docs/ai/**`: @IraOets

Ownership is defined in `.github/CODEOWNERS`.

## 4. How Rules Change

1. Any contributor may propose a change through a Pull Request.
2. The harness owner reviews the reason, scope and risks.
3. Behaviour-changing rules require evidence, such as an A/B comparison or hook test.
4. The responsible CODEOWNER approves changes before merging.
5. Rules are reviewed by their `review-by` date and renewed, updated or removed.

## 5. Personal vs Team

Personal preferences belong in `~/.claude/CLAUDE.md` and `.claude/settings.local.json` (git-ignored).

Do not commit `CLAUDE.md` or `CLAUDE.local.md` to this repository.