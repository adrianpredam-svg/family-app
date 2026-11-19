import { describe, expect, it } from "vitest";
import { createTaskSchema } from "./validation";

describe("task validation", () => {
  const base = { title: "Buy milk", startsAt: "2026-11-04T15:00:00.000Z", endsAt: "2026-11-04T16:00:00.000Z", assignedTo: 2 };
  it("accepts a normal task", () => {
    expect(createTaskSchema.safeParse(base).success).toBe(true);
  });
  it("accepts 15 and 30 minute tasks at any minute, rejects shorter ones", () => {
    const at = (min: number) => new Date(Date.UTC(2026, 10, 4, 15, 7 + min)).toISOString();
    expect(createTaskSchema.safeParse({ ...base, startsAt: at(0), endsAt: at(15) }).success).toBe(true);
    expect(createTaskSchema.safeParse({ ...base, startsAt: at(0), endsAt: at(30) }).success).toBe(true);
    expect(createTaskSchema.safeParse({ ...base, startsAt: at(0), endsAt: at(10) }).success).toBe(false);
  });
  it("rejects an empty title and end before start", () => {
    expect(createTaskSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(false);
  });
});
