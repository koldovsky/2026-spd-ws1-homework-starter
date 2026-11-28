---
paths:
  - "app/api/**"
owner: "@IraOets"
why: "Prevent unsafe API changes and ensure consistent request validation and error handling."
review-by: "2027-01-20"
---

# API Development Rules

When modifying API routes under `app/api/`:

1. Validate all incoming request data.
2. Return appropriate HTTP status codes.
3. Handle errors without exposing sensitive information.
4. Preserve existing API response formats unless a change is explicitly requested.
5. Run relevant tests after making changes.
6. Report any failing or unavailable tests.