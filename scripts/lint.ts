// Syntax check for the extension (plain scripts, no build step) and the JSON it reads. Run with: make lint
import {execFileSync} from 'node:child_process';
import {readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'extension');
let failed = 0;
for (const f of readdirSync(dir).sort()) {
  const path = join(dir, f);
  try {
    if (f.endsWith('.js')) execFileSync('node', ['--check', path], {stdio: 'pipe'});
    else if (f.endsWith('.json')) JSON.parse(readFileSync(path, 'utf8'));
    else continue;
    console.log(`ok   extension/${f}`);
  } catch (e) {
    failed++;
    console.log(`FAIL extension/${f}\n${String((e as {stderr?: Buffer}).stderr || (e as Error).message)}`);
  }
}
process.exit(failed ? 1 : 0);
