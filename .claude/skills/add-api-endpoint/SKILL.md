<!-- owner: @mmelnyk-spd · why: standardise how new API routes are added so every endpoint has tests and validation · review-by: 2027-05-25 -->

# Add API endpoint

A step-by-step procedure for adding a new Next.js API route to this project.

## Steps

1. **Create route file** at `app/api/<resource>/route.ts`.
   - Import `db` from `@/lib/db`.
   - Export named handlers: `GET`, `POST`, `PUT`, `DELETE` as needed.

2. **Add business logic** in `lib/<resource>.ts`.
   - Define TypeScript types for the entity.
   - Validate input: check required fields, types, length constraints.
   - Throw `RuleViolation` for domain errors (returns 422).

3. **Write tests** in `lib/<resource>.test.ts`.
   - Test happy path for each HTTP method.
   - Test validation errors (missing fields, bad values).
   - Test edge cases (not found, state transitions).
   - Use in-memory SQLite: `openDb(":memory:")`.

4. **Create migration** if new table or columns needed.
   - Add `db/migrations/<next-number>_<description>.sql`.
   - Never edit existing migration files.

5. **Verify**
   ```bash
   npm run db:reset
   npm test
   npm run typecheck
   ```
   All three must pass before marking done.

## Check

- [ ] Route file exists under `app/api/`
- [ ] Business logic in `lib/`, not in route handler
- [ ] Tests cover happy path + validation errors
- [ ] Migration file (if needed) is new, not edited
- [ ] `npm test` and `npm run typecheck` pass
