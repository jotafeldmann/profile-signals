// The update check: version order, when GitHub is asked, and what is stored. No network: fetch is faked.
// Run with: make test
import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/update.js';

type Saved = {checkedAt?: number; latest?: string; failedAt?: number} | undefined;
type Get = (url: string, init?: unknown) => Promise<{ok: boolean; status: number; json: () => Promise<unknown>}>;
const U = (globalThis as unknown as {ProfileSignalsUpdate: {
  LATEST: string; newer: (a: string, b: string) => boolean; available: (s: Saved, v: string) => boolean;
  due: (s: Saved, v: string, now: number) => boolean; check: (s: Saved, v: string, now: number, get: Get) => Promise<Saved>;
}}).ProfileSignalsUpdate;

const HOUR = 3_600_000, DAY = 24 * HOUR, NOW = 1_800_000_000_000;
function github(tag: unknown, ok = true) {
  const calls: string[] = [];
  const get: Get = async url => { calls.push(url); return {ok, status: ok ? 200 : 503, json: async () => ({tag_name: tag})}; };
  return {calls, get};
}

test('versions compare by number, not as text', () => {
  assert.equal(U.newer('0.10.0', '0.9.0'), true);
  assert.equal(U.newer('v0.5.0', '0.4.0'), true);
  assert.equal(U.newer('1.0', '0.99.99'), true);
  assert.equal(U.newer('0.4.0', '0.4.0'), false);
  assert.equal(U.newer('0.3.9', '0.4.0'), false);
});

test('GitHub is asked at most once a day', () => {
  assert.equal(U.due(undefined, '0.4.0', NOW), true);
  assert.equal(U.due({checkedAt: NOW - 23 * HOUR, latest: '0.4.0'}, '0.4.0', NOW), false);
  assert.equal(U.due({checkedAt: NOW - DAY - 1, latest: '0.4.0'}, '0.4.0', NOW), true);
});

test('once a newer version is known, GitHub is not asked again until the person updates', () => {
  const saved = {checkedAt: NOW - 30 * DAY, latest: '0.5.0'};
  assert.equal(U.available(saved, '0.4.0'), true);
  assert.equal(U.due(saved, '0.4.0', NOW), false);
  assert.equal(U.available(saved, '0.5.0'), false);
  assert.equal(U.due(saved, '0.5.0', NOW), true);
});

test('after a failure, GitHub is asked again only an hour later', () => {
  assert.equal(U.due({failedAt: NOW - 59 * 60_000}, '0.4.0', NOW), false);
  assert.equal(U.due({failedAt: NOW - HOUR - 1}, '0.4.0', NOW), true);
});

test('a check stores the version GitHub gives, without its v', async () => {
  const {calls, get} = github('v0.5.0');
  assert.deepEqual(await U.check(undefined, '0.4.0', NOW, get), {checkedAt: NOW, latest: '0.5.0'});
  assert.deepEqual(calls, [U.LATEST]);
});

test('a check that is not due makes no request', async () => {
  const {calls, get} = github('v0.6.0');
  const saved = {checkedAt: NOW - HOUR, latest: '0.4.0'};
  assert.equal(await U.check(saved, '0.4.0', NOW, get), saved);
  assert.deepEqual(calls, []);
});

test('an error or an odd answer keeps what was known and records the failure', async () => {
  const saved = {checkedAt: NOW - 2 * DAY, latest: '0.4.0'};
  assert.deepEqual(await U.check(saved, '0.4.0', NOW, github('v0.5.0', false).get), {...saved, failedAt: NOW});
  assert.deepEqual(await U.check(saved, '0.4.0', NOW, github('<html>').get), {...saved, failedAt: NOW});
});
