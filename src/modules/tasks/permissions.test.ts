import { describe, expect, it } from "vitest";
import { canDeleteTask, canEditTask } from "./permissions";

const task = { createdBy: 1, assignedTo: 2 };

describe("task permissions", () => {
  it("lets the creator and the target change the task", () => {
    expect(canEditTask(task, 1)).toBe(true);
    expect(canEditTask(task, 2)).toBe(true);
    expect(canDeleteTask(task, 2)).toBe(true);
  });
  it("blocks everyone else", () => {
    expect(canEditTask(task, 3)).toBe(false);
    expect(canDeleteTask(task, 3)).toBe(false);
  });
});
