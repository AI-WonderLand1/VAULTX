import { useEffect, useRef } from 'react';
import { createInactivityTimer } from '../lib/inactivityTimer';

export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

interface UseInactivityLogoutOptions {
  enabled: boolean;
  onInactive: () => void | Promise<void>;
  timeoutMs?: number;
}

const ACTIVITY_EVENTS = [
  'pointerdown',
  'pointermove',
  'keydown',
  'touchstart',
  'scroll',
  'popstate',
  'hashchange',
] as const;

export function useInactivityLogout({
  enabled,
  onInactive,
  timeoutMs = INACTIVITY_TIMEOUT_MS,
}: UseInactivityLogoutOptions) {
  const onInactiveRef = useRef(onInactive);

  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  useEffect(() => {
    if (!enabled) return;

    const inactivityTimer = createInactivityTimer({
      timeoutMs,
      onInactive: () => onInactiveRef.current(),
    });
    const recordActivity = () => inactivityTimer.recordActivity();
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        inactivityTimer.check();
      }
    };

    inactivityTimer.start();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', checkWhenVisible);

    return () => {
      inactivityTimer.stop();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, [enabled, timeoutMs]);
}
