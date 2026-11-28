---
paths:
  - "app/**"
  - "next.config.ts"
  - "proxy.ts"
  - "instrumentation.ts"
  - "instrumentation-client.ts"
  - "**/*.tsx"
---
<!-- owner: @e5d3e1 · why: Next.js 16 has breaking changes vs. model training data; `next dev` used to inject this guidance into AGENTS.md, which we turned off (agentRules: false) to keep AGENTS.md short · review-by: 2027-02-24 -->
<!-- MANUAL COPY: text below is copied by hand from node_modules/next/dist/server/lib/generate-agent-files.js (buildAgentRulesBlock) as of next@16.4.6. Next.js will NOT update this file. Re-check it whenever `next` is upgraded. -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
