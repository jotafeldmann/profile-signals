// Sharing settings with a team: what travels, what is refused, and the example in docs/examples.
// Run with: make test
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import rules from '../extension/rules.json' with {type: 'json'};
import '../extension/share.js';
import '../extension/verdict.js';

type Config = Record<string, any>;
const S = (globalThis as unknown as {ProfileSignalsShare: {
  text: (c: Config, v: string) => string; importSettings: (raw: string, current: Config) => {config?: Config; error?: string};
}}).ProfileSignalsShare;
const {evaluate} = (globalThis as unknown as {ProfileSignalsVerdict: {evaluate: (c: unknown, d: Record<string, string>) => {color: string | null}}}).ProfileSignalsVerdict;
const mine = (): Config => structuredClone(rules);

test('what is shared loads back as the same verdict and rules', () => {
  const shared = mine(); shared.rules[0].hardGate = false; shared.verdict.greenAtLeast = 0.9;
  const loaded = S.importSettings(S.text(shared, '0.5.0'), mine()).config!;
  assert.deepEqual(loaded.rules, shared.rules);
  assert.deepEqual(loaded.verdict, shared.verdict);
});

test('collection and cache are not shared: the person loading keeps theirs', () => {
  const sender = mine(); sender.collection = {automatic: true}; sender.cache = {enabled: true, days: 90};
  const receiver = mine(); receiver.collection = {automatic: false}; receiver.cache = {enabled: false};
  const text = S.text(sender, '0.5.0');
  assert.ok(!('collection' in JSON.parse(text)) && !('cache' in JSON.parse(text)));
  const loaded = S.importSettings(text, receiver).config!;
  assert.deepEqual(loaded.collection, {automatic: false});
  assert.deepEqual(loaded.cache, {enabled: false});
});

test('a plain rules.json, as the Advanced section shows it, is accepted', () => {
  assert.ok(S.importSettings(JSON.stringify(rules), mine()).config);
});

test('anything else is refused with a reason', () => {
  const error = (raw: string) => S.importSettings(raw, mine()).error;
  assert.match(error('hello')!, /not valid JSON/);
  assert.match(error('[1, 2]')!, /not a settings file/);
  assert.match(error('{"profileSignals": "something-else", "rules": []}')!, /not a Profile Signals settings file/);
  assert.match(error('{"profileSignals": "profile-signals-settings", "format": 2, "rules": []}')!, /newer version/);
  assert.match(error('{"verdict": {}}')!, /no rules/);
  assert.match(error(JSON.stringify({rules: rules.rules, verdict: {greenAtLeast: 0.4, yellowAtLeast: 0.6}}))!, /Yellow must start at or below green/);
  assert.match(error(JSON.stringify({rules: [{label: 'Odd', field: 'age', type: 'color', weight: 1}]}))!, /unknown type/);
});

test('the worst-signal-wins example: any red is red, any yellow is yellow, green only when all are green', () => {
  const example = S.importSettings(readFileSync(new URL('../docs/examples/worst-signal-wins.json', import.meta.url), 'utf8'), mine()).config!;
  const color = (age: string, connections: string, verification = 'Identity: Verified by LinkedIn') =>
    evaluate(example, {age, connections, verification}).color;
  assert.equal(color('~30 months', '500+'), 'green');
  assert.equal(color('~11 months', '500+'), 'red');
  assert.equal(color('~0 months', '500+'), 'red');
  assert.equal(color('~30 months', '99'), 'red');
  assert.equal(color('~30 months', '500+', ''), 'red');
  assert.equal(color('~12 months', '500+'), 'yellow');
  assert.equal(color('~30 months', '200'), 'yellow');
  assert.equal(color('~30 months', '201'), 'green');
});
