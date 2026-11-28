#!/usr/bin/env bash
# owner: @evgenyadev · why: an A/B claim must be reproducible by someone else, not a story about one run · review-by: 2027-02-20
#
# One A/B run: fresh clone at <sha>, one headless Claude session on <prompt-file>, then independent checks.
# Usage: docs/ai/ab/run.sh <label> <sha> <prompt-file> <out-dir>
# Same flags on both sides. npm test/typecheck are allowed on both, so a difference comes from the harness
# (instructions, rule, skill, hook), not from one side being unable to run tests.
# A fresh clone path also means no auto-memory from the main checkout leaks in.
set -euo pipefail

label=$1 sha=$2 prompt_file=$3 out=$4
model=${AB_MODEL:-sonnet}
repo=$(git rev-parse --show-toplevel)
prompt=$(cat "$prompt_file")
dir=$(mktemp -d)/repo
mkdir -p "$out" && out=$(cd "$out" && pwd)

git clone -q "$repo" "$dir"
git -C "$dir" checkout -q "$sha"
ln -s "$repo/node_modules" "$dir/node_modules"

cd "$dir"
claude -p "$prompt" --model "$model" --setting-sources project,local --permission-mode acceptEdits \
  --allowedTools "Bash(npm test),Bash(npm run test),Bash(npm run typecheck)" \
  --output-format stream-json --verbose < /dev/null > "$out/transcript.jsonl" || true

# Independent checks: run after the agent, by us, whatever the agent claimed.
tests=$(npm test 2>&1 | grep -E "Tests +[0-9]" | sed 's/^ *//' || echo "Tests: did not run")
if npm run -s typecheck > /dev/null 2>&1; then typecheck=green; else typecheck=red; fi
git add -A -- . ':!node_modules'
git diff --cached "$sha" > "$out/diff.patch"
changed=$(git diff --cached --name-status "$sha" | tr '\t' ' ')
hook_log=$( [ -f .claude/hooks/protect-migrations.log ] && cat .claude/hooks/protect-migrations.log || true)

node "$repo/docs/ai/ab/metrics.mjs" "$out/transcript.jsonl" \
  --label "$label" --sha "$sha" --model "$model" --tests "$tests" --typecheck "$typecheck" \
  --changed "$changed" --hook-log "$hook_log" > "$out/metrics.json"
rm -rf "$(dirname "$dir")"
cat "$out/metrics.json"
