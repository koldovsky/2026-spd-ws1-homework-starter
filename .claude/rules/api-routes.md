---
paths:
  - "app/api/**"
---
<!-- owner: @AlexGLT · why: every API route must return 400/422 the same way and keep business rules in lib/, so clients and tests stay predictable · review-by: 2027-04-24 -->

# API route rules

- Bad input shape (missing field, wrong type, value not in the enum) returns **400**.
- `RuleViolation` from `lib/` returns **422**. This includes "task not found". Re-throw every other error.
- Error body is always `{ "error": "<message>" }`.
- A route checks the **shape** only. `lib/` checks values and rules (length, range, status moves). Do not copy a limit into a route.
- No SQL in a route. Call a function from `lib/tasks.ts`.
