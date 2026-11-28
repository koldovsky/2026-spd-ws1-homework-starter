---
name: verify-change
description: Verify task API changes, validation rules, HTTP responses, and tests before completing work.
owner: "@IraOets"
why: "Ensure changes to the task API preserve business rules and are verified with repository-specific checks."
review-by: "2027-01-20"
---

# Verify Task API Changes

Use this skill when modifying `app/api/tasks/` or related business logic in `lib/tasks.ts`.

## Procedure

1. **Inspect existing behaviour**
   - Read the relevant API route in `app/api/tasks/`.
   - Review validation and business rules in `lib/tasks.ts`.
   - Identify existing HTTP response codes and JSON formats.

2. **Implement the change**
   - Update business validation in `lib/tasks.ts` when necessary.
   - Update the corresponding API route.
   - Preserve existing response contracts unless explicitly requested otherwise.
   - Never modify an existing applied database migration.

3. **Add or update tests**
   - Test successful requests (200 or 201).
   - Test invalid input (400).
   - Test business rule violations (422).
   - Test unexpected server errors (500).
   - Cover only status codes relevant to the changed endpoint.
   - If route-level tests cannot run, report the limitation.

4. **Run repository checks**
   - `npm test`
   - `npm run typecheck`
   - `npm run build`

5. **Review the changes**
   - Run `git diff --stat`.
   - Check for unrelated modifications and exposed secrets.
   - Confirm that API response formats remain compatible.

6. **Report results**
   - List changed files.
   - Report test results and any failures.
   - Identify untested behaviour.
   - Request line-by-line human review (API changes are L2).

## Completion Criteria

- [ ] Relevant validation rules are covered by tests.
- [ ] Required checks passed or failures are documented.
- [ ] API response compatibility was reviewed.
- [ ] No existing migration was modified.
- [ ] Human review is requested before merging.