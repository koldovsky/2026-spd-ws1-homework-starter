---
paths:
  - "db/migrations/**"
---

<!-- owner: @vvfesik · why: editing an already-applied migration silently desyncs databases — lib/db.ts records applied file names in schema_migrations and skips them, so an edit never re-runs and fresh checkouts diverge from existing DBs · review-by: 2027-02-25 -->

# Database migrations (`db/migrations/**`)

This rule loads only for work touching `db/migrations/`. It enforces the L0/L2 rows of [docs/ai/team-agreement.md](../../docs/ai/team-agreement.md).

## Never edit an applied migration

Every existing `db/migrations/*.sql` file is immutable. `lib/db.ts` records applied file names in `schema_migrations` and skips them, so an edit to an applied file does not re-run — it just makes fresh checkouts diverge from existing databases.

- **Fix forward**: create a new numbered migration (`003_<what>.sql`, next free number in file-name order). Existing migrations keep working; new ones apply cleanly.
- A new migration must pass `npm run db:reset && npm test` before the PR — it applies cleanly on a fresh DB (L2 evidence).
- **Exception**: the not-yet-merged migration you are writing *in this PR* may still be edited. It has never been applied anywhere.

## Migration file conventions

- One concern per file; file name `NNN_description.sql`, zero-padded, matching the existing `001_`, `002_` pattern.
- Only SQL that `db.exec` can run as a single script (see `lib/db.ts` — no tool-specific meta-commands).
- If the migration transforms data, write it so re-runs on a partially-migrated DB fail loudly rather than duplicating rows.
