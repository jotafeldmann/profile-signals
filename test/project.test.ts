// Checks that keep a release consistent: one version everywhere, and a package that holds only what ships.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import manifest from '../extension/manifest.json' with {type: 'json'};
import pkg from '../package.json' with {type: 'json'};
import {SHIPPED} from '../scripts/package.ts';

test('package.json and manifest.json carry the same version', () => {
  assert.equal(manifest.version, pkg.version);
});

test('every file the manifest loads is shipped, and everything shipped exists', () => {
  const loaded = [
    ...manifest.content_scripts.flatMap(c => c.js), manifest.background.service_worker,
    manifest.action.default_popup, manifest.options_ui.page
  ];
  for (const f of loaded) assert.ok(SHIPPED.includes(f), `${f} is loaded but not shipped`);
  const present = readdirSync(new URL('../extension/', import.meta.url));
  for (const f of SHIPPED) assert.ok(present.includes(f), `${f} is listed but missing`);
  assert.deepEqual([...present].sort(), [...SHIPPED].sort(), 'extension/ holds a file the package leaves out');
});

test('the default rules collect only when asked', () => {
  const rules = JSON.parse(readFileSync(new URL('../extension/rules.json', import.meta.url), 'utf8'));
  assert.equal(rules.collection.automatic, false);
});
