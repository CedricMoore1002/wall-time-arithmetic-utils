import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addWallTime, subtractWallTime, normalizeWallTime } from '../src/core.js';

test('addWallTime wraps forward across midnight', () => {
  const result = addWallTime({ hour: 23, minute: 0 }, { hours: 2, minutes: 0 });
  assert.deepEqual(result, { hour: 1, minute: 0 });
});

test('subtractWallTime wraps backward across midnight', () => {
  const result = subtractWallTime({ hour: 1, minute: 0 }, { hours: 2, minutes: 0 });
  assert.deepEqual(result, { hour: 23, minute: 0 });
});

test('addWallTime carries minutes into hours', () => {
  const result = addWallTime({ hour: 10, minute: 30 }, { hours: 0, minutes: 45 });
  assert.deepEqual(result, { hour: 11, minute: 15 });
});

test('subtractWallTime borrows from hours', () => {
  const result = subtractWallTime({ hour: 10, minute: 15 }, { hours: 0, minutes: 45 });
  assert.deepEqual(result, { hour: 9, minute: 30 });
});

test('zero delta returns a copy of the input time', () => {
  const input = { hour: 12, minute: 30 };
  const result = addWallTime(input, {});
  assert.deepEqual(result, { hour: 12, minute: 30 });
  assert.notEqual(result, input);
});

test('negative delta in addWallTime wraps backward', () => {
  const result = addWallTime({ hour: 0, minute: 0 }, { hours: -1, minutes: 0 });
  assert.deepEqual(result, { hour: 23, minute: 0 });
});

test('positive delta in subtractWallTime wraps forward', () => {
  const result = subtractWallTime({ hour: 23, minute: 0 }, { hours: -2, minutes: 0 });
  assert.deepEqual(result, { hour: 1, minute: 0 });
});

test('very large delta wraps multiple days', () => {
  const result = addWallTime({ hour: 0, minute: 0 }, { hours: 48, minutes: 0 });
  assert.deepEqual(result, { hour: 0, minute: 0 });
});

test('hours and minutes combine before wrapping', () => {
  const result = addWallTime({ hour: 23, minute: 59 }, { hours: 0, minutes: 1 });
  assert.deepEqual(result, { hour: 0, minute: 0 });
});

test('addWallTime and subtractWallTime are inverses', () => {
  const start = { hour: 14, minute: 37 };
  const delta = { hours: 5, minutes: 23 };
  const after = addWallTime(start, delta);
  const back = subtractWallTime(after, delta);
  assert.deepEqual(back, start);
});

test('normalizeWallTime handles negative totals', () => {
  assert.deepEqual(normalizeWallTime(-60), { hour: 23, minute: 0 });
});

test('normalizeWallTime handles totals beyond one day', () => {
  assert.deepEqual(normalizeWallTime(1500), { hour: 1, minute: 0 });
});

test('addWallTime rejects non-integer hours', () => {
  assert.throws(
    () => addWallTime({ hour: 10, minute: 0 }, { hours: 1.5 }),
    { name: 'TypeError' },
  );
});

test('addWallTime rejects NaN', () => {
  assert.throws(
    () => addWallTime({ hour: 10, minute: NaN }, { hours: 1 }),
    { name: 'TypeError' },
  );
});

test('addWallTime rejects boolean coerced as number', () => {
  assert.throws(
    () => addWallTime({ hour: 10, minute: 0 }, { hours: true }),
    { name: 'TypeError' },
  );
});

test('addWallTime rejects null input', () => {
  assert.throws(
    () => addWallTime(null, { hours: 1 }),
    { name: 'TypeError' },
  );
});

test('subtractWallTime with null delta throws TypeError', () => {
  assert.throws(
    () => subtractWallTime({ hour: 10, minute: 0 }, null),
    { name: 'TypeError' },
  );
});

test('normalizeWallTime of exactly 1440 returns 00:00', () => {
  assert.deepEqual(normalizeWallTime(1440), { hour: 0, minute: 0 });
});
