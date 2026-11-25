import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const hook = resolve('.claude/hooks/protect-migrations.mjs');

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'migration-guard-'));
  mkdirSync(join(root, 'db/migrations'), { recursive: true });
  writeFileSync(join(root, 'db/migrations/001_existing.sql'), 'select 1;');
  symlinkSync(join(root, 'db/migrations/001_existing.sql'), join(root, 'alias.sql'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function run(root, payload) {
  return spawnSync(process.execPath, [hook], {
    cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    input: typeof payload === 'string' ? payload : JSON.stringify(payload), encoding: 'utf8',
  });
}

for (const tool_name of ['Edit', 'Write', 'MultiEdit']) {
  test(`${tool_name} blocks an existing migration with a reason`, t => {
    const result = run(fixture(t), { tool_name, tool_input: { file_path: 'db/migrations/001_existing.sql' } });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /existing migration.*new migration/i);
  });
}

test('normalizes absolute, traversal, Windows separator and symlink paths', t => {
  const root = fixture(t);
  for (const file_path of [join(root, 'db/migrations/001_existing.sql'),
    'db/migrations/../migrations/001_existing.sql', 'db\\migrations\\001_existing.sql', 'alias.sql']) {
    assert.equal(run(root, { tool_name: 'Write', tool_input: { file_path } }).status, 2, file_path);
  }
});

test('allows a new migration, unrelated edit and reading an old migration', t => {
  const root = fixture(t);
  for (const [tool_name, file_path] of [['Write', 'db/migrations/003_new.sql'], ['Edit', 'lib/tasks.ts'],
    ['Read', 'db/migrations/001_existing.sql']]) {
    assert.equal(run(root, { tool_name, tool_input: { file_path } }).status, 0);
  }
});

test('fails closed on malformed JSON and missing write path', t => {
  const root = fixture(t);
  assert.equal(run(root, '{broken').status, 2);
  assert.equal(run(root, { tool_name: 'Write', tool_input: {} }).status, 2);
});
