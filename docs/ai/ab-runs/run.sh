#!/bin/zsh
# usage: run.sh <RUN_ID> <COMMIT>
set -u
RUN=$1; COMMIT=$2
REPO=~/ai-workshop/2026-spd-ws1-homework-starter
WT=~/ai-workshop/ab/wt/$RUN
OUT=~/ai-workshop/ab/results/$RUN
PROMPT='Add a `priority` field to tasks (low/medium/high, default medium), validate it, and expose it in the API.'
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null
rm -rf "$WT" "$OUT"; mkdir -p "$OUT"
git -C "$REPO" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1
cp -cR "$REPO/node_modules" "$WT/"
cd "$WT"
echo "$PROMPT" > "$OUT/prompt.txt"
echo "$COMMIT" > "$OUT/commit.txt"
claude -p "$PROMPT" --output-format stream-json --verbose \
  --permission-mode acceptEdits \
  --allowedTools "Bash(npm *)" "Bash(npx *)" "Bash(node *)" "Bash(git diff*)" "Bash(git status*)" "Bash(ls*)" "Bash(cat*)" \
  > "$OUT/transcript.jsonl" 2> "$OUT/stderr.txt"
echo $? > "$OUT/claude-exit.txt"
git add -A -N . 2>/dev/null
git diff --stat > "$OUT/diffstat.txt"
git diff > "$OUT/diff.patch"
npm test > "$OUT/npm-test.txt" 2>&1; echo $? > "$OUT/npm-test-exit.txt"
echo "done $RUN"
