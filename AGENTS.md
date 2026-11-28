# Agent Instructions

## Project
Next.js task management application with API routes under `app/api/tasks/`.

## Commands
- Install dependencies: `npm ci`
- Run tests: `npm test`
- Check TypeScript: `npm run typecheck`
- Build application: `npm run build`

## Hard Rules
- Never edit an existing applied migration in `db/migrations/`.
- Add a new numbered migration instead.
- Never expose secrets or credentials.
- Never force-push Git history.
- Do not commit or push without explicit human approval.
- Preserve existing API response contracts unless explicitly requested.

## Team Harness
- Read `docs/ai/team-agreement.md` before making changes.
- Follow path-specific rules in `.claude/rules/`.
- Use `.claude/skills/verify-change/SKILL.md` for API change verification.
- API endpoints are L2: human reviews every changed line.

## Verification
- Run `npm test` and `npm run typecheck` after code changes.
- Run `npm run build` when applicable.
- Review `git diff --stat` and report failed checks.

## Handoff
- Use `docs/ai/handoff-template.md` for unfinished work.