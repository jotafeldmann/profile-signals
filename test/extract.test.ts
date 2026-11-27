// What extract.js derives from the About panel's text. Run with: make test
import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/extract.js';
import '../extension/verdict.js';

const {ageFrom} = (globalThis as unknown as {ProfileSignalsExtract: {ageFrom: (s: string, now: Date) => string}}).ProfileSignalsExtract;
const {evaluate} = (globalThis as unknown as {ProfileSignalsVerdict: {evaluate: (c: unknown, d: Record<string, string>) => {color: string | null}}}).ProfileSignalsVerdict;
const NOW = new Date(2026, 10, 27);

test('account age is a number of months, in English and Portuguese', () => {
  assert.equal(ageFrom('May 2013', NOW), '~162 months');
  assert.equal(ageFrom('outubro de 2026', NOW), '~1 month');
  assert.equal(ageFrom('Joined', NOW), '');
});

test('an account created this month is 0 months old, so an age rule can judge it', () => {
  assert.equal(ageFrom('November 2026', NOW), '~0 months');
  const age = {rules: [{id: 'age', label: 'Account age', field: 'age', type: 'number', weight: 1, hardGate: true, greenAtLeast: 24, redBelow: 12}],
    verdict: {greenAtLeast: 0.8, yellowAtLeast: 0.5}};
  assert.equal(evaluate(age, {age: ageFrom('November 2026', NOW)}).color, 'red');
});
