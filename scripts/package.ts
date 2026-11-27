// Builds dist/profile-signals-<version>.zip: the files Chrome loads, in a folder named profile-signals.
// Run with: make package
import {execFileSync} from 'node:child_process';
import manifest from '../extension/manifest.json' with {type: 'json'};
import {cpSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

/** What ships. A file in extension/ that is not listed here fails `make test`. */
export const SHIPPED = [
  'manifest.json', 'background.js', 'content.js', 'extract.js', 'inspector.js', 'verdict.js',
  'rules.json', 'popup.html', 'popup.js', 'options.html', 'options.js', 'update.js', 'share.js'
];

if (import.meta.main) {
  const root = resolve(import.meta.dirname, '..');
  const {version} = manifest;
  const work = mkdtempSync(join(tmpdir(), 'profile-signals-'));
  try {
    const folder = join(work, 'profile-signals');
    mkdirSync(folder);
    for (const f of SHIPPED) cpSync(join(root, 'extension', f), join(folder, f));
    cpSync(join(root, 'LICENSE'), join(folder, 'LICENSE'));
    mkdirSync(join(root, 'dist'), {recursive: true});
    const zip = join(root, 'dist', `profile-signals-${version}.zip`);
    rmSync(zip, {force: true});
    execFileSync('zip', ['-qrX', zip, 'profile-signals'], {cwd: work});
    console.log(`dist/profile-signals-${version}.zip`);
  } finally {
    rmSync(work, {recursive: true, force: true});
  }
}
