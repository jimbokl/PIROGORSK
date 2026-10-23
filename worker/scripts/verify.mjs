import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const checks = [
  ['Worker typecheck', [process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'worker/tsconfig.json']]],
  ['Browser script typecheck', [process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'worker/tsconfig.client.json']]],
  ['API and SQL integration tests', [process.execPath, ['--test', 'worker/tests/interest.test.mjs']]],
];
for (const [label, [command, args]] of checks) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) { process.stderr.write(`${label}: FAIL\n${result.stdout || ''}${result.stderr || ''}`); process.exit(result.status || 1); }
  process.stdout.write(`${label}: PASS\n`);
}
