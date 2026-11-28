// owner: @evgenyadev · why: count behaviour from the transcript instead of trusting the agent's summary · review-by: 2027-02-20
// Usage: node metrics.mjs <transcript.jsonl> --label .. --sha .. --model .. --tests .. --typecheck .. --changed .. --hook-log ..

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: Object.fromEntries(
    ["label", "sha", "model", "tests", "typecheck", "changed", "hook-log"].map((k) => [k, { type: "string", default: "" }]),
  ),
});

const events = readFileSync(positionals[0], "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const toolUses = [];
const toolErrors = [];
for (const e of events) {
  for (const block of e.message?.content ?? []) {
    if (block.type === "tool_use") toolUses.push(block);
    if (block.type === "tool_result" && block.is_error) {
      toolErrors.push(typeof block.content === "string" ? block.content : JSON.stringify(block.content));
    }
  }
}
const result = events.findLast((e) => e.type === "result") ?? {};
const bash = toolUses.filter((t) => t.name === "Bash").map((t) => t.input.command);
const changed = values.changed.split("\n").filter(Boolean);
const migrations = changed.filter((l) => l.includes("db/migrations/"));

console.log(
  JSON.stringify(
    {
      label: values.label,
      sha: values.sha,
      model: values.model,
      tests: values.tests,
      typecheck: values.typecheck,
      appliedMigrationChanged: migrations.filter((l) => /^[MDR]/.test(l)),
      migrationAdded: migrations.filter((l) => l.startsWith("A")),
      filesChanged: changed,
      ranTests: bash.some((c) => /npm (run )?test/.test(c)),
      ranTypecheck: bash.some((c) => c.includes("typecheck")),
      usedSkill: toolUses.filter((t) => t.name === "Skill").map((t) => t.input.skill ?? t.input.command),
      hookBlocks: toolErrors.filter((m) => m.includes("applied migration")).length,
      hookLog: values["hook-log"].split("\n").filter(Boolean),
      toolCalls: toolUses.length,
      turns: result.num_turns,
      costUsd: result.total_cost_usd,
      durationS: result.duration_ms && Math.round(result.duration_ms / 1000),
      finalMessage: result.result,
    },
    null,
    2,
  ),
);
