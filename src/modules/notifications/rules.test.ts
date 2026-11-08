import { describe, expect, it } from "vitest";
import { recipientsFor } from "./rules";

describe("notification rules", () => {
  it("tells the target when someone adds a task for them", () => {
    expect(recipientsFor({ kind: "created", actorId: 1, task: { createdBy: 1, assignedTo: 2 } })).toEqual([
      { memberId: 2, type: "assigned" },
    ]);
  });

  it("never notifies you about your own task", () => {
    expect(recipientsFor({ kind: "created", actorId: 1, task: { createdBy: 1, assignedTo: 1 } })).toEqual([]);
  });

  it("tells the creator when the target marks it done", () => {
    expect(recipientsFor({ kind: "done", actorId: 2, task: { createdBy: 1, assignedTo: 2 } })).toEqual([
      { memberId: 1, type: "done" },
    ]);
  });

  it("tells a new target they were assigned, and the creator it changed", () => {
    expect(
      recipientsFor({ kind: "updated", actorId: 2, before: { createdBy: 1, assignedTo: 2 }, after: { createdBy: 1, assignedTo: 3 } }),
    ).toEqual([
      { memberId: 3, type: "assigned" },
      { memberId: 1, type: "updated" },
    ]);
  });

  it("tells the other person when a task is moved", () => {
    expect(
      recipientsFor({ kind: "updated", actorId: 1, before: { createdBy: 1, assignedTo: 2 }, after: { createdBy: 1, assignedTo: 2 } }),
    ).toEqual([{ memberId: 2, type: "updated" }]);
  });
});
