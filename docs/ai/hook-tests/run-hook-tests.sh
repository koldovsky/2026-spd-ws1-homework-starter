#!/usr/bin/env bash
# owner: @IgorPetr · why: regression test for .claude/hooks/protect-migrations.mjs, run from the repo root · review-by: 2027-02-24
# Runs the migration hook against many payloads inside a throwaway clone of the repo.
mkdir -p /tmp/hooktest-out
SRC="$(git rev-parse --show-toplevel)"
W=/tmp/hooktest-out/repo
rm -r "$W" 2>/dev/null
git clone -q "$SRC" "$W" && cd "$W" || exit 1
cp "$SRC/.claude/hooks/protect-migrations.mjs" .claude/hooks/
git config user.email t@example.com; git config user.name t
export CLAUDE_PROJECT_DIR="$W"
HOOK=.claude/hooks/protect-migrations.mjs

pre() { # label expected payload
  printf '%s' "$3" | node $HOOK >/tmp/hooktest-out/out 2>/tmp/hooktest-out/err; code=$?
  [ "$code" = "$2" ] && r=PASS || r=FAIL
  printf '%s  exit=%s (want %s)  %s\n' "$r" "$code" "$2" "$1"
  [ "$code" = 2 ] && sed 's/^/        stderr: /' /tmp/hooktest-out/err
}
bash_payload() { jq -nc --arg c "$1" '{tool_name:"Bash",tool_input:{command:$c}}'; }
edit_payload() { jq -nc --arg f "$1" --arg t "${2:-Edit}" '{tool_name:$t,tool_input:{file_path:$f}}'; }

echo "--- Edit / Write"
pre "Edit tracked 001"            2 "$(edit_payload db/migrations/001_create_tasks.sql)"
pre "Write tracked 002 (absolute)" 2 "$(edit_payload "$W/db/migrations/002_add_task_estimate.sql" Write)"
pre "Write new untracked 003"     0 "$(edit_payload db/migrations/003_new.sql Write)"
echo "select 1;" > db/migrations/003_new.sql
pre "Edit own untracked 003"      0 "$(edit_payload db/migrations/003_new.sql)"
pre "Edit lib/tasks.ts"           0 "$(edit_payload lib/tasks.ts)"

echo "--- Bash"
pre "redirect into 001"           2 "$(bash_payload 'echo x>db/migrations/001_create_tasks.sql')"
pre "append into 001"             2 "$(bash_payload 'echo x >> db/migrations/001_create_tasks.sql')"
pre "sed -i on 001"               2 "$(bash_payload "sed -i 's/120/200/' db/migrations/001_create_tasks.sql")"
pre "cd + sed -i"                 2 "$(bash_payload "cd db/migrations && sed -i 's/120/200/' 001_create_tasks.sql")"
pre "tee 002"                     2 "$(bash_payload 'echo x | tee db/migrations/002_add_task_estimate.sql')"
pre "cp over 002"                 2 "$(bash_payload 'cp /tmp/x.sql db/migrations/002_add_task_estimate.sql')"
pre "rm 001"                      2 "$(bash_payload 'rm db/migrations/001_create_tasks.sql')"
pre "git checkout of 001"         2 "$(bash_payload 'git checkout abc -- db/migrations/001_create_tasks.sql')"
pre "python rewrite by basename"  2 "$(bash_payload "python3 -c \"open('001_create_tasks.sql','w')\"")"
pre "cat 001 (read only)"         0 "$(bash_payload 'cat db/migrations/001_create_tasks.sql')"
pre "ls migrations"               0 "$(bash_payload 'ls db/migrations')"
pre "grep with 2>&1"              0 "$(bash_payload 'grep -n check db/migrations/001_create_tasks.sql 2>&1')"
pre "npm test | tail"             0 "$(bash_payload 'npm test 2>&1 | tail -5')"
pre "write new 004 via redirect"  0 "$(bash_payload 'echo "select 1;" > db/migrations/004_other.sql')"
pre "write new 004 via heredoc"   0 "$(bash_payload "cat > db/migrations/004_other.sql <<'SQL'
select 1;
SQL")"
pre "glob sed -i over all"        2 "$(bash_payload "sed -i 's/a/b/' db/migrations/*.sql")"
pre "cd into dir then write"      2 "$(bash_payload 'cd db/migrations && echo x > 004_other.sql')"

echo "--- PostToolUse backstop"
post() { printf '%s' '{"tool_name":"Bash","tool_input":{"command":"x"}}' | node $HOOK post 2>/tmp/hooktest-out/err; code=$?; printf '%s  exit=%s (want %s)  %s\n' "$([ "$code" = "$1" ] && echo PASS || echo FAIL)" "$code" "$1" "$2"; [ "$code" = 2 ] && sed 's/^/        stderr: /' /tmp/hooktest-out/err; }
post 0 "clean tree (untracked 003 only)"
echo "-- tampered" >> db/migrations/001_create_tasks.sql
post 2 "001 modified behind the hook's back"
git checkout -q HEAD -- db/migrations
post 0 "after restore"
rm db/migrations/002_add_task_estimate.sql
post 2 "002 deleted"
echo "--- log"; cat .claude/hooks/block.log | cut -c1-150
