// Who may change a task: the person who created it and the person it is for.
type TaskPeople = { createdBy: number; assignedTo: number };

export function canEditTask(task: TaskPeople, memberId: number): boolean {
  return task.createdBy === memberId || task.assignedTo === memberId;
}

export const canDeleteTask = canEditTask;
export const canMarkDone = canEditTask;
