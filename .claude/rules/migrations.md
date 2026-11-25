---
paths:
  - "db/migrations/**"
---
<!-- owner: @vvedula-svg · why: databases record migration names and never rerun changed files · review-by: 2027-03-25 -->
# Immutable migration history

1. Do not edit, overwrite, rename, or delete an existing SQL migration, even for comments or formatting.
2. Propose a new, sequentially numbered SQL migration and describe forward compatibility and rollback before a human reviews it.
3. Run `npm test` to exercise a fresh in-memory database. For a schema change, also show upgrading a disposable database from the previous schema.
4. Never run `npm run db:reset` against user data without explicit authorization.
5. If the migration guard blocks an edit, report its reason. Do not retry through Bash or disable the guard.

The file-tool hook conservatively protects every existing SQL file, even a newly written local migration. Draft new SQL fully before writing; further edits need a human. It is an accidental-edit guard, not a sandbox against arbitrary shell commands.
