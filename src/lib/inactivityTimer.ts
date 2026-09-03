export interface InactivityTimerOptions {
  timeoutMs: number;
  onInactive: () => void | Promise<void>;
  now?: () => number;
  schedule?: (callback: () => void, delayMs: number) => unknown;
  cancel?: (handle: unknown) => void;
}

export interface InactivityTimer {
  start: () => void;
  recordActivity: () => void;
  check: () => void;
  stop: () => void;
}

export function createInactivityTimer({
  timeoutMs,
  onInactive,
  now = Date.now,
  schedule = (callback, delayMs) => window.setTimeout(callback, delayMs),
  cancel = (handle) => window.clearTimeout(handle as number),
}: InactivityTimerOptions): InactivityTimer {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('The inactivity timeout must be greater than zero.');
  }

  let timerHandle: unknown = null;
  let lastActivityAt = 0;
  let started = false;
  let inactive = false;

  const clearScheduledCheck = () => {
    if (timerHandle !== null) {
      cancel(timerHandle);
      timerHandle = null;
    }
  };

  const scheduleCheck = (delayMs: number) => {
    clearScheduledCheck();
    timerHandle = schedule(check, delayMs);
  };

  function check() {
    if (!started || inactive) return;

    const remainingMs = timeoutMs - (now() - lastActivityAt);
    if (remainingMs > 0) {
      scheduleCheck(remainingMs);
      return;
    }

    inactive = true;
    clearScheduledCheck();
    void onInactive();
  }

  const start = () => {
    started = true;
    inactive = false;
    lastActivityAt = now();
    scheduleCheck(timeoutMs);
  };

  const recordActivity = () => {
    if (!started || inactive) return;

    lastActivityAt = now();
    scheduleCheck(timeoutMs);
  };

  const stop = () => {
    started = false;
    clearScheduledCheck();
  };

  return { start, recordActivity, check, stop };
}
