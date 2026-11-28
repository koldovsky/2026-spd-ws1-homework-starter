#!/usr/bin/env node

// owner: @IraOets
// why: Protect existing DB migrations and prevent force pushes.
// review-by: 2027-01-20

const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function block(reason) {
    console.error(`BLOCKED: ${reason}`);
    process.exit(2);
}

function migrationPath(file) {
    if (typeof file !== "string") return false;

    const absolute = path.resolve(root, file);
    const relative = path.relative(root, absolute).replace(/\\/g, "/");

    return relative.startsWith("db/migrations/") &&
        !relative.startsWith("../");
}

function tracked(file) {
    const absolute = path.resolve(root, file);
    const relative = path.relative(root, absolute);

    const result = cp.spawnSync(
        "git",
        ["ls-files", "--error-unmatch", "--", relative],
        { cwd: root, stdio: "ignore" }
    );

    return result.status === 0;
}

function checkFile(file) {
    if (migrationPath(file) && tracked(file)) {
        block(`Cannot modify tracked migration: ${file}. Add a new numbered migration instead.`);
    }
}

function checkBash(command) {
    if (typeof command !== "string") {
        block("Invalid Bash command.");
    }

    // Conservative force-push detection, including git -C.
    if (
        /\bgit\b[^\n;&|]*\bpush\b[^\n;&|]*(?:--force(?:-with-lease|-if-includes)?\b|-f(?:\s|$))/.test(command)
    ) {
        block("Force push is prohibited by team policy.");
    }

    // Block shell writes involving existing migration files.
    // Conservative: may also reject some harmless commands.
    const writeOperation =
        /\b(?:sed|perl|python3?|node|ruby|tee|cp|mv|rm|truncate|touch)\b|(?:>>|(?<![<])>(?!>))/;

    if (writeOperation.test(command)) {
        const files = cp.spawnSync(
            "git",
            ["ls-files", "--", "db/migrations"],
            { cwd: root, encoding: "utf8" }
        );

        if (files.status !== 0) {
            block("Cannot verify tracked migrations.");
        }

        for (const file of files.stdout.split("\n").filter(Boolean)) {
            if (command.includes(file) || command.includes(path.basename(file))) {
                block(`Bash command may modify tracked migration: ${file}`);
            }
        }
    }
}

function main() {
    let payload;

    try {
        payload = JSON.parse(fs.readFileSync(0, "utf8"));
    } catch {
        block("Invalid hook input.");
    }

    const tool = payload.tool_name;
    const input = payload.tool_input || {};

    if (["Edit", "Write", "MultiEdit"].includes(tool)) {
        checkFile(input.file_path);

        if (Array.isArray(input.edits)) {
            for (const edit of input.edits) {
                checkFile(edit.file_path || input.file_path);
            }
        }
    }

    if (tool === "Bash") {
        checkBash(input.command);
    }
}

main();
