// Pure rules: who gets notified about what. Nobody is ever notified about their own action.
export type NotificationKind = "assigned" | "updated" | "done";
export type TaskPeople = { createdBy: number; assignedTo: number };

export type TaskEvent =
  | { kind: "created"; actorId: number; task: TaskPeople }
  | { kind: "updated"; actorId: number; before: TaskPeople; after: TaskPeople }
  | { kind: "done"; actorId: number; task: TaskPeople };

export type Recipient = { memberId: number; type: NotificationKind };

export function recipientsFor(event: TaskEvent): Recipient[] {
  const out = new Map<number, NotificationKind>();
  const add = (memberId: number, type: NotificationKind) => {
    if (memberId !== event.actorId && !out.has(memberId)) out.set(memberId, type);
  };

  switch (event.kind) {
    case "created":
      add(event.task.assignedTo, "assigned");
      break;
    case "updated":
      // A new target person hears "assigned"; the other people involved hear "updated".
      if (event.after.assignedTo !== event.before.assignedTo) add(event.after.assignedTo, "assigned");
      add(event.after.assignedTo, "updated");
      add(event.after.createdBy, "updated");
      break;
    case "done":
      add(event.task.createdBy, "done");
      add(event.task.assignedTo, "done");
      break;
  }
  return [...out].map(([memberId, type]) => ({ memberId, type }));
}
