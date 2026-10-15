# wall-time-arithmetic-utils

Adds and subtracts hours and minutes to a local wall-clock time, carrying across midnight and wrapping past 24 hours, with no date or timezone context.

```js
import { addWallTime, subtractWallTime, normalizeWallTime } from 'wall-time-arithmetic-utils';

addWallTime({ hour: 23, minute: 0 }, { hours: 2, minutes: 0 });
// => { hour: 1, minute: 0 }

subtractWallTime({ hour: 1, minute: 0 }, { hours: 2, minutes: 0 });
// => { hour: 23, minute: 0 }

normalizeWallTime(-60);
// => { hour: 23, minute: 0 }
```

## Why this exists

Some scheduling logic only cares about clock time — "shift starts at 22:00 and runs for 5 hours, what does the handoff clock say?" — without dragging in a full Date object, timezone tables, or DST rules. This library answers exactly that question and nothing else. The trade-off is that it cannot tell you which calendar day the result lands on; if you need that, you need a real datetime library.

## Edge cases

The library wraps around the 24-hour boundary in both directions. `01:00 − 02:00` returns `23:00`, not a negative time. Deltas may be arbitrarily large — `{ hours: 48 }` is treated as two full days and wraps to the same time. Input values must be integers; passing `{ hours: 1.5 }` throws a `TypeError` rather than silently coercing to 90 minutes. Hours and minutes in the input time are not required to be in range: `{ hour: 25, minute: 70 }` is valid and will be normalized by the arithmetic, which is how `addWallTime` keeps its internal model honest.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

