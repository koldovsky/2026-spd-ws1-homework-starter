// owner: @evgenyadev · why: a review-by date nobody checks is a comment, not a process; this turns it into a failing check · review-by: 2027-02-20
//
// Checks harness files for the `owner · why · review-by` header.
// Fails (exit 1) when a rule, skill or hook has no header, or a review-by date has passed. Warns 30 days ahead.
// REVIEW_BY_TODAY=YYYY-MM-DD overrides today's date, to try it out.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const WARN_DAYS = 30;
const HARNESS = /^(AGENTS\.md|\.claude\/|docs\/ai\/|scripts\/check-review-by\.mjs)/;
// Files that must carry a header: every rule, skill and hook script.
const REQUIRED = /^\.claude\/(rules\/.+\.md|skills\/[^/]+\/SKILL\.md|hooks\/.+\.mjs)$/;
const DATE = /review-by:\s*(\d{4}-\d{2}-\d{2})/;

const today = new Date(process.env.REVIEW_BY_TODAY ?? new Date().toISOString().slice(0, 10));
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => HARNESS.test(f));

const failures = [];
const warnings = [];
for (const file of files) {
  const match = readFileSync(file, "utf8").match(DATE);
  if (!match) {
    if (REQUIRED.test(file)) failures.push(`${file}: no review-by header (owner · why · review-by)`);
    continue;
  }
  const daysLeft = Math.floor((new Date(match[1]) - today) / 86_400_000);
  if (daysLeft < 0) failures.push(`${file}: review-by ${match[1]} passed ${-daysLeft} days ago, re-confirm or delete`);
  else if (daysLeft <= WARN_DAYS) warnings.push(`${file}: review-by ${match[1]} in ${daysLeft} days`);
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const f of failures) console.error(`FAIL  ${f}`);
console.log(`${files.length} harness files checked: ${failures.length} failing, ${warnings.length} due soon`);
process.exit(failures.length ? 1 : 0);
