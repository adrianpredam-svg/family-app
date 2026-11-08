import { describe, expect, it } from "vitest";
import { createTaskSchema } from "./validation";

describe("task validation", () => {
  const base = { title: "Buy milk", startsAt: "2026-11-04T15:00:00.000Z", endsAt: "2026-11-04T16:00:00.000Z", assignedTo: 2 };
  it("accepts a normal task", () => {
    expect(createTaskSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty title and end before start", () => {
    expect(createTaskSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(false);
  });
});
