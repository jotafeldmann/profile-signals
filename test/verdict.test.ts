// The scoring rules, checked against the default rules.json. Run with: make test
import test from 'node:test';
import assert from 'node:assert/strict';
import rules from '../extension/rules.json' with {type: 'json'};
import '../extension/verdict.js';

type Data = Record<string, string>;
type Result = {id: string; color: string | null; reason: string};
type Verdict = {color: string | null; score: number | null; reason: string; results: Result[]};
const {evaluate} = (globalThis as unknown as {ProfileSignalsVerdict: {evaluate: (config: unknown, data: Data) => Verdict}}).ProfileSignalsVerdict;

const verified = 'Identity: Verified by LinkedIn in April 2026';
const color = (data: Data) => evaluate(rules, data).color;

test('created before 2016, verified, 500+ connections is green', () => {
  assert.equal(color({created: 'May 2013', verification: verified, connections: '500+'}), 'green');
});

test('created in 2016 is no longer before 2016, so the hard gate caps it at yellow', () => {
  assert.equal(color({created: 'January 2016', verification: verified, connections: '500+'}), 'yellow');
});

test('created in 2020 is yellow even when every other rule is green', () => {
  const v = evaluate(rules, {created: 'March 2020', verification: verified, connections: '500+'});
  assert.equal(v.color, 'yellow');
  assert.match(v.reason, /Hard gate, Account created: 2020/);
});

test('created in 2022 is still yellow; red starts after 2022', () => {
  assert.equal(color({created: 'December 2022', verification: verified, connections: '500+'}), 'yellow');
  assert.equal(color({created: 'February 2023', verification: verified, connections: '500+'}), 'red');
});

test('Portuguese dates are read too', () => {
  assert.equal(color({created: 'maio de 2024'}), 'red');
});

test('an unchecked hard gate caps the result at yellow', () => {
  const v = evaluate(rules, {verification: verified, connections: '500+'});
  assert.equal(v.color, 'yellow');
  assert.match(v.reason, /not checked/);
});

test('a creator profile with followers only leaves connections out of the score', () => {
  const v = evaluate(rules, {created: 'May 2013', verification: verified, followers: '40,858,516'});
  assert.equal(v.color, 'green');
  assert.equal(v.results.find(r => r.id === 'connections')?.color, null);
});

test('few connections and no verification pull an old account down by weight', () => {
  // created green (5), verification yellow (3 x 0.5), connections red (2 x 0) = 6.5 / 10 = 65%
  const v = evaluate(rules, {created: 'May 2013', connections: '12'});
  assert.equal(Math.round((v.score ?? 0) * 100), 65);
  assert.equal(v.color, 'yellow');
});

test('"No verifications" counts as none shown', () => {
  const v = evaluate(rules, {created: 'May 2013', verification: 'No verifications', connections: '500+'});
  assert.equal(v.results.find(r => r.id === 'verification')?.color, 'yellow');
});

test('a disabled rule is ignored, and a disabled gate no longer caps', () => {
  const custom = structuredClone(rules);
  (custom.rules.find(r => r.id === 'account-created') as {enabled?: boolean}).enabled = false;
  assert.equal(evaluate(custom, {verification: verified, connections: '500+'}).color, 'green');
});

test('rules keep their priority order in the results', () => {
  assert.deepEqual(evaluate(rules, {}).results.map(r => r.id), rules.rules.map(r => r.id));
});
