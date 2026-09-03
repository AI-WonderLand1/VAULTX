import assert from 'node:assert/strict';
import test from 'node:test';
import { createInactivityTimer } from '../src/lib/inactivityTimer.ts';

function createFakeClock() {
  let currentTime = 0;
  let nextId = 1;
  const timers = new Map<number, { callback: () => void; runAt: number }>();

  const runDueTimers = () => {
    let due = [...timers.entries()]
      .filter(([, timer]) => timer.runAt <= currentTime)
      .sort((a, b) => a[1].runAt - b[1].runAt);

    while (due.length > 0) {
      const [id, timer] = due[0];
      timers.delete(id);
      timer.callback();
      due = [...timers.entries()]
        .filter(([, scheduled]) => scheduled.runAt <= currentTime)
        .sort((a, b) => a[1].runAt - b[1].runAt);
    }
  };

  return {
    now: () => currentTime,
    schedule: (callback: () => void, delayMs: number) => {
      const id = nextId++;
      timers.set(id, { callback, runAt: currentTime + delayMs });
      return id;
    },
    cancel: (handle: unknown) => timers.delete(handle as number),
    advance: (milliseconds: number) => {
      currentTime += milliseconds;
      runDueTimers();
    },
  };
}

test('expires after the full inactivity period', () => {
  const clock = createFakeClock();
  let lockCount = 0;
  const timer = createInactivityTimer({
    timeoutMs: 600_000,
    onInactive: () => { lockCount += 1; },
    ...clock,
  });

  timer.start();
  clock.advance(599_999);
  assert.equal(lockCount, 0);
  clock.advance(1);
  assert.equal(lockCount, 1);
});

test('activity resets the inactivity period', () => {
  const clock = createFakeClock();
  let lockCount = 0;
  const timer = createInactivityTimer({
    timeoutMs: 600_000,
    onInactive: () => { lockCount += 1; },
    ...clock,
  });

  timer.start();
  clock.advance(500_000);
  timer.recordActivity();
  clock.advance(599_999);
  assert.equal(lockCount, 0);
  clock.advance(1);
  assert.equal(lockCount, 1);
});

test('a delayed visibility check expires an overdue session only once', () => {
  const clock = createFakeClock();
  let lockCount = 0;
  const timer = createInactivityTimer({
    timeoutMs: 600_000,
    onInactive: () => { lockCount += 1; },
    ...clock,
  });

  timer.start();
  clock.advance(600_000);
  timer.check();
  timer.check();
  assert.equal(lockCount, 1);
});

test('stopping the timer prevents expiration', () => {
  const clock = createFakeClock();
  let lockCount = 0;
  const timer = createInactivityTimer({
    timeoutMs: 600_000,
    onInactive: () => { lockCount += 1; },
    ...clock,
  });

  timer.start();
  timer.stop();
  clock.advance(600_000);
  assert.equal(lockCount, 0);
});
