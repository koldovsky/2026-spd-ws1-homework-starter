
#!/usr/bin/env python3
# owner: @oksanastrohetska
# why: Prevent AI agents from modifying existing SQL migrations.
# review-by: 2026-12-01

import json
import os
import re
import sys
from pathlib import Path


MIGRATION_DIRS = [
    "db/migrations",
]


def block(reason):
    """Block a Claude Code tool call with exit code 2."""
    print(f"BLOCKED: {reason}", file=sys.stderr)
    sys.exit(2)


def main():
    try:
        event = json.load(sys.stdin)
    except (ValueError, UnicodeDecodeError):
        block("Invalid JSON hook input.")

    if not isinstance(event, dict):
        block("Invalid hook event.")

    tool = event.get("tool_name")
    args = event.get("tool_input", {})

    # Bash: block shell commands that write to or delete existing migration files.
    if tool == "Bash":
        cmd = args.get("command", "") if isinstance(args, dict) else ""
        if isinstance(cmd, str) and re.search(
            r"(sed\s+-i|tee|>>?|\brm\b|\bmv\b|\bcp\b|truncate|perl\s+-pi)[^;&|\n]*db/migrations/", cmd
        ):
            block("Shell commands must not modify files in db/migrations/. Create a new numbered migration instead.")
        return

    # Inspect direct file-writing tools.
    if tool not in ("Write", "Edit", "MultiEdit"):
        return

    if not isinstance(args, dict):
        block("Invalid tool arguments.")

    filename = args.get("file_path")

    if not isinstance(filename, str) or not filename:
        block("Missing file_path.")

    root = Path(
        os.environ.get("CLAUDE_PROJECT_DIR")
        or event.get("cwd")
        or os.getcwd()
    ).resolve()

    target = Path(filename)

    if not target.is_absolute():
        target = root / target

    target = target.resolve()

    # Check every configured migration directory.
    for migration_dir in MIGRATION_DIRS:
        migrations = (root / migration_dir).resolve()

        if target.is_relative_to(migrations) and target.is_file():
            block(
                f"Existing migration cannot be modified: "
                f"{target.relative_to(root) if target.is_relative_to(root) else target}. "
                "Create a new numbered migration instead."
            )


if __name__ == "__main__":
    main()
