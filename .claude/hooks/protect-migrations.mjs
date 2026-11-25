// owner: @vvedula-svg · why: prevent rewriting existing schema history · review-by: 2027-03-25
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

function block(reason) {
  console.error(`Blocked: ${reason}`);
  process.exit(2);
}

try {
  const payload = JSON.parse(readFileSync(0, 'utf8'));
  if (!['Edit', 'Write', 'MultiEdit'].includes(payload?.tool_name)) process.exit(0);
  const file = payload.tool_input?.file_path;
  if (typeof file !== 'string' || !file) block('write operation has no valid file_path.');
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const target = resolve(payload.cwd || root, file.replaceAll('\\', '/'));
  if (!existsSync(target)) process.exit(0);
  const directory = resolve(root, 'db/migrations');
  if (!existsSync(directory)) process.exit(0);
  const within = relative(realpathSync(directory), realpathSync(target));
  if (within && !within.startsWith('..') && !isAbsolute(within) && within.endsWith('.sql')) {
    block('cannot rewrite an existing migration. Create a new migration instead; schema history is immutable.');
  }
} catch {
  block('migration guard could not validate its input; fix the payload before retrying.');
}
