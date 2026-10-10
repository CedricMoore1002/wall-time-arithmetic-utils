/**
 * Wall Time Arithmetic — adding and subtracting hours/minutes to a local
 * wall-clock time, carrying across midnight and wrapping past 24 hours.
 *
 * Design decisions (pick one, test it):
 *
 * 1. Time representation.
 *    We use a plain object { hour: number, minute: number } where hour is
 *    0–23 and minute is 0–59. No seconds, no Date, no timezone. The brief
 *    explicitly excludes date/timezone context, so we keep the representation
 *    as small as the problem demands. Seconds would only add noise.
 *
 * 2. Total minutes and modular wrap.
 *    Internally we convert the whole computation to a signed integer count of
 *    minutes since 00:00. After adding or subtracting the delta we take
 *    `total % 1440` to wrap into a single day. We use the ((n % m) + m) % m
 *    idiom so that negative totals (e.g. 01:00 − 120 minutes = −60) still
 *    land in [0, 1440) rather than producing a negative hour. This is why
 *    `01:00 − 02:00` yields `23:00` rather than `-01:00`.
 *
 * 3. Rounding.
 *    The delta is given in whole hours and minutes. We do not round — we only
 *    accept integers. Passing 1.5 hours is a TypeError from the validate call,
 *    not a silent 90-minute interpretation. Refusing fractional input avoids
 *    surprising rounding behaviour and keeps the function signature honest.
 *
 * 4. Input validation.
 *    NaN, Infinity, booleans, strings, and non-integer numbers are all
 *    rejected with TypeError before any arithmetic. The check is explicit
 *    rather than relying on coercion, because `+true` silently becomes 1 and
 *    that is the kind of bug that ships.
 */

/**
 * Validate that `value` is a finite, safe integer.
 *
 * We refuse anything that is not `number`, finite, and an integer within
 * Number.MAX_SAFE_INTEGER. This rules out NaN, Infinity, booleans, strings,
 * and fractions. We do not coerce — `true` is not `1` here.
 *
 * @param {unknown} value
 * @param {string} name — field name for the error message
 * @returns {number}
 */
function assertSafeInt(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer, got ${String(value)}`);
  }
  return value;
}

/**
 * Validate a { hour, minute } wall-time object.
 *
 * We accept hours outside 0–23 and minutes outside 0–59 because the whole
 * point of this library is to normalize after arithmetic. If you pass in
 * { hour: 25, minute: 70 }, normalizeWallTime will carry it to 02:10 the
 * next day. What we DO reject is non-integer or non-number values — the
 * arithmetic idiom below assumes integers.
 *
 * @param {{hour: number, minute: number}} t
 * @returns {{hour: number, minute: number}}
 */
function validateTime(t) {
  if (t === null || typeof t !== 'object') {
    throw new TypeError('time must be an object with hour and minute');
  }
  const hour = assertSafeInt(t.hour, 'hour');
  const minute = assertSafeInt(t.minute, 'minute');
  return { hour, minute };
}

/**
 * Validate a { hours, minutes } delta object.
 *
 * Like validateTime we allow any integer magnitude — deltas can be huge
 * (add 3000 hours) and the modular wrap handles it. We only refuse
 * non-integers so the `total % 1440` step is well defined.
 *
 * @param {{hours?: number, minutes?: number}} d
 * @returns {{hours: number, minutes: number}}
 */
function validateDelta(d) {
  if (d === null || typeof d !== 'object') {
    throw new TypeError('delta must be an object with hours and/or minutes');
  }
  const hours = assertSafeInt(d.hours ?? 0, 'hours');
  const minutes = assertSafeInt(d.minutes ?? 0, 'minutes');
  return { hours, minutes };
}

/**
 * Convert a wall-time object to a signed integer minute count since 00:00.
 * We deliberately do NOT wrap here — wrapping happens once, at the end of
 * an operation, so that intermediate values can be inspected and composed.
 *
 * @param {{hour: number, minute: number}} t
 * @returns {number}
 */
function toMinutes(t) {
  return t.hour * 60 + t.minute;
}

/**
 * Normalize a signed minute count into a { hour, minute } object in [0, 1440).
 *
 * The double-modulo idiom `((n % m) + m) % m` is used because JavaScript's
 * `%` preserves the sign of the dividend: `-1 % 10 === -1`, not `9`. Wrapping
 * the result with `+ m` then `% m` fixes that, so `total = -60` (one hour
 * before midnight) becomes `1380` minutes = 23:00.
 *
 * @param {number} total
 * @returns {{hour: number, minute: number}}
 */
export function normalizeWallTime(total) {
  const m = 1440;
  const wrapped = ((total % m) + m) % m;
  return {
    hour: Math.floor(wrapped / 60),
    minute: wrapped % 60,
  };
}

/**
 * Add a delta of hours and minutes to a wall-clock time.
 *
 * The delta may be negative or arbitrarily large; it is folded into the total
 * minute count and then normalized with the modular-wrap idiom described in
 * normalizeWallTime. This means `addWallTime(23:00, { hours: 2 })` returns
 * `01:00` and `addWallTime(00:00, { minutes: -30 })` returns `23:30`.
 *
 * @param {{hour: number, minute: number}} time
 * @param {{hours?: number, minutes?: number}} delta
 * @returns {{hour: number, minute: number}}
 */
export function addWallTime(time, delta) {
  const t = validateTime(time);
  const d = validateDelta(delta);
  const total = toMinutes(t) + d.hours * 60 + d.minutes;
  return normalizeWallTime(total);
}

/**
 * Subtract a delta of hours and minutes from a wall-clock time.
 *
 * Implemented in terms of addWallTime by negating the delta. This guarantees
 * `subtractWallTime(t, d)` and `addWallTime(t, { hours: -d.hours, minutes: -d.minutes })`
 * give identical results, so we only have to reason about one code path for
 * wrapping and validation.
 *
 * @param {{hour: number, minute: number}} time
 * @param {{hours?: number, minutes?: number}} delta
 * @returns {{hour: number, minute: number}}
 */
export function subtractWallTime(time, delta) {
  const d = validateDelta(delta);
  return addWallTime(time, { hours: -d.hours, minutes: -d.minutes });
}
