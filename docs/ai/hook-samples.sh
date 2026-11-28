#!/usr/bin/env bash
# owner: @Kurkov1990 · why: reproducible evidence that guard-migrations blocks and allows the right calls · review-by: 2027-03-23
# Feeds sample PreToolUse payloads to the hook and prints stderr and the exit code. Usage: bash docs/ai/hook-samples.sh
cd "$(dirname "$0")/../.." || exit 1
export CLAUDE_PROJECT_DIR="$PWD"
M=db/migrations
run() {
  echo "\$ [$1]"
  printf '%s' "$2" | node .claude/hooks/guard-migrations.mjs
  echo "exit code: $?"
  echo
}
run "Edit an applied migration" "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$M/001_create_tasks.sql\",\"old_string\":\"120\",\"new_string\":\"200\"}}"
run "Write over an applied migration (absolute path)" "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$PWD/$M/002_add_task_estimate.sql\",\"content\":\"x\"}}"
run "Bash: sed -i on a migration" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"sed -i '' s/120/200/ $M/001_create_tasks.sql\"}}"
run "Bash: rm a migration" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"npm test && rm $M/002_add_task_estimate.sql\"}}"
run "Bash: append via redirect" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo 'alter table tasks add x' >> $M/002_add_task_estimate.sql\"}}"
run "Write a new migration with a skipped number" "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$M/005_add_description.sql\",\"content\":\"x\"}}"
run "Write the next migration (allowed)" "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$M/003_add_task_description.sql\",\"content\":\"x\"}}"
run "Bash: read-only ls + cat (allowed)" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls $M && cat $M/001_create_tasks.sql\"}}"
run "Bash: heredoc that only mentions the folder (allowed)" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"cat > notes.md <<'EOF'\\nnever rm $M files\\nEOF\"}}"
run "Edit a lib file (allowed)" "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"lib/tasks.ts\",\"old_string\":\"a\",\"new_string\":\"b\"}}"

# Review follow-ups: bypasses that used to exit 0, and repair paths that used to exit 2.
run "Bash: cd into the folder, then sed -i" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"cd $M && sed -i '' s/40/80/ 002_add_task_estimate.sql\"}}"
run "Bash: session cwd is the folder" "{\"tool_name\":\"Bash\",\"cwd\":\"$PWD/$M\",\"tool_input\":{\"command\":\"rm 001_create_tasks.sql\"}}"
run "Bash: 1> redirect" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo x 1>$M/001_create_tasks.sql\"}}"
run "Bash: &> redirect" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo x &>$M/001_create_tasks.sql\"}}"
run "Edit with different case (same file on APFS)" "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"DB/Migrations/001_create_tasks.sql\",\"old_string\":\"a\",\"new_string\":\"b\"}}"
run "Bash: 2>&1 and a read (allowed)" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"cat $M/001_create_tasks.sql 2>&1 | head\"}}"
run "Bash: repair from HEAD (allowed)" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git restore --source=HEAD --staged --worktree -- $M/001_create_tasks.sql\"}}"
run "Bash: restore from an older commit" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git restore --source=HEAD~1 -- $M/001_create_tasks.sql\"}}"

# Payload edge cases. Decision: strip a BOM; malformed JSON fails closed (exit 2) in pre mode.
run "Edit an applied migration, payload starts with a BOM" $'\xEF\xBB\xBF'"{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$M/001_create_tasks.sql\"}}"
run "Malformed JSON payload (fail closed)" '{"tool_name":"Edit",'

# Bash commands as the agent would type them; payload JSON is built by node, so no hand escaping.
bashrun() {
  echo "\$ [Bash: $1]"
  echo "  command: $2"
  node -e 'process.stdout.write(JSON.stringify({tool_name:"Bash",tool_input:{command:process.argv[1]}}))' "$2" |
    node .claude/hooks/guard-migrations.mjs $3
  echo "exit code: $?"
  echo
}
bashrun "replay of A/B run B1: shell heredoc creating 003 (blocked; use Write)" $'cat > db/migrations/003_raise_estimate_limit.sql <<EOF\ncreate table x (id int);\nEOF'

# Known limits: the pre check exits 0 on these; the post check below catches the result.
LIMIT_XARGS="ls $M/001* | xargs perl -pi -e s/120/200/"
LIMIT_FIND="find $M -name '001*' -exec perl -pi -e s/120/200/ {} +"
LIMIT_NODE="node -e \"require('fs').appendFileSync('$M/001_create_tasks.sql', '-- x')\""
LIMIT_PY="python3 -c \"open('$M/002_add_task_estimate.sql', 'a').write('-- x')\""
bashrun "known limit: ls | xargs (pre exits 0)" "$LIMIT_XARGS"
bashrun "known limit: find -exec (pre exits 0)" "$LIMIT_FIND"
bashrun "known limit: node -e (pre exits 0)" "$LIMIT_NODE"
bashrun "known limit: python -c (pre exits 0)" "$LIMIT_PY"

# guard-env: file tools, Grep and Bash.
envrun() {
  echo "\$ [guard-env: $1]"
  printf '%s' "$2" | node .claude/hooks/guard-env.mjs
  echo "exit code: $?"
  echo
}
envcmd() {
  envrun "Bash: $1 $2" "$(node -e 'process.stdout.write(JSON.stringify({tool_name:"Bash",tool_input:{command:process.argv[1]}}))' "$1")"
}
E=.env
envrun "Read .env.example (allowed)" '{"tool_name":"Read","tool_input":{"file_path":".env.example"}}'
envrun "Read $E.staging" "{\"tool_name\":\"Read\",\"tool_input\":{\"file_path\":\"$E.staging\"}}"
envrun "Grep with path $E" "{\"tool_name\":\"Grep\",\"tool_input\":{\"pattern\":\"SECRET\",\"path\":\"$E\"}}"
envrun "Grep with glob $E*" "{\"tool_name\":\"Grep\",\"tool_input\":{\"pattern\":\"SECRET\",\"glob\":\"$E*\"}}"
envrun "Grep over the project (allowed: the Grep tool skips gitignored $E files)" '{"tool_name":"Grep","tool_input":{"pattern":"SECRET","path":"."}}'
envcmd "cat $E"
envcmd "source ./$E.local && npm test"
envcmd "cat .env.example" "(allowed)"
envcmd "rg SECRET ." "(allowed: rg skips gitignored files)"

# A throwaway clone for cases that need real file changes: an uncommitted 003, the PostToolUse backstop,
# and recursive grep while a secret file exists.
SRC="$PWD"
TMP="$(mktemp -d)"
git clone -q "$SRC" "$TMP/repo" && cp "$SRC"/.claude/hooks/*.mjs "$TMP/repo/.claude/hooks/"
(
  cd "$TMP/repo" || exit 1
  export CLAUDE_PROJECT_DIR="$PWD"
  run() {
    echo "\$ [clone: $1]"
    printf '%s' "$2" | node .claude/hooks/guard-migrations.mjs $3
    echo "exit code: $?"
    echo
  }
  post() { run "post check after: $1" '{"tool_name":"Bash","tool_input":{"command":"(see label)"}}' post; }
  restore() { git restore --source=HEAD --staged --worktree -- "$M"; }

  echo "-- 003 written but not committed --" && echo "select 1;" > "$M/003_add_task_description.sql"
  run "Edit the uncommitted 003 (allowed)" "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$M/003_add_task_description.sql\",\"old_string\":\"1\",\"new_string\":\"2\"}}"
  run "Write the next one, 004 (allowed)" "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$M/004_add_owner.sql\",\"content\":\"x\"}}"
  post "only a new 003 exists (allowed)"

  echo "-- the known-limit commands, run for real --"
  for c in "$LIMIT_XARGS" "$LIMIT_FIND" "$LIMIT_NODE" "$LIMIT_PY"; do
    echo "ran: $c" && sh -c "$c" && post "$c"
    restore
  done
  rm "$M/001_create_tasks.sql"
  post "rm of 001"
  run "post check with a malformed payload still runs (git, not the payload)" '{"tool_name":' post
  restore
  post "restore --source=HEAD (clean again)"

  echo "-- a secret $E exists (clone only, fake value) --" && printf 'SECRET=fake\n' > "$E"
  envcmd "grep -rn SECRET ."
  envcmd "grep -rn SECRET . --exclude=$E*" "(allowed)"
  envcmd "rg -uu SECRET ."
)
rm -rf "$TMP"
