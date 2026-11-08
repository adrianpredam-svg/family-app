import { describe, expect, it } from "vitest";
import { afterFailure, isLocked, LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "./lockout";

const now = new Date("2026-11-04T12:00:00Z");

describe("PIN lockout", () => {
  it("is not locked without attempts", () => {
    expect(isLocked(undefined, now)).toBe(false);
  });

  it("counts wrong PINs and locks on the 5th", () => {
    let state = afterFailure(undefined, now);
    for (let i = 2; i < MAX_FAILED_ATTEMPTS; i++) state = afterFailure(state, now);
    expect(state.failedCount).toBe(MAX_FAILED_ATTEMPTS - 1);
    expect(isLocked(state, now)).toBe(false);
    state = afterFailure(state, now);
    expect(isLocked(state, now)).toBe(true);
    expect(state.lockedUntil!.getTime() - now.getTime()).toBe(LOCK_MINUTES * 60_000);
  });

  it("unlocks after the lock time and starts counting again", () => {
    const locked = { failedCount: 0, lockedUntil: new Date(now.getTime() + 60_000) };
    const later = new Date(now.getTime() + 2 * 60_000);
    expect(isLocked(locked, later)).toBe(false);
    expect(afterFailure(locked, later)).toEqual({ failedCount: 1, lockedUntil: null });
  });
});
