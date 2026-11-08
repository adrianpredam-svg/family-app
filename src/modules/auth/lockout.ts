// Pure rules for wrong-PIN lockout, kept separate so they are easy to test.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 10;

export type AttemptState = { failedCount: number; lockedUntil: Date | null };

export function isLocked(state: AttemptState | undefined, now: Date): boolean {
  return !!state?.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}

/** State after a wrong PIN. Locks the member once MAX_FAILED_ATTEMPTS is reached. */
export function afterFailure(state: AttemptState | undefined, now: Date): AttemptState {
  // A lock that has expired starts a fresh count.
  const previous = state && !(state.lockedUntil && state.lockedUntil <= now) ? state.failedCount : 0;
  const failedCount = previous + 1;
  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    return { failedCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) };
  }
  return { failedCount, lockedUntil: null };
}

export function minutesLeft(state: AttemptState, now: Date): number {
  return Math.max(1, Math.ceil(((state.lockedUntil?.getTime() ?? 0) - now.getTime()) / 60_000));
}
