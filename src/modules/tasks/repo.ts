import type { Task } from "@/lib/db/schema";

/** The shape the browser receives. */
export type TaskDTO = {
  id: number;
  title: string;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  createdBy: number;
  assignedTo: number;
  done: boolean;
  banner: boolean;
  bannerText: string | null;
};

export function toDTO(t: Task): TaskDTO {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    startsAt: t.startsAt.toISOString(),
    endsAt: t.endsAt.toISOString(),
    allDay: t.allDay,
    createdBy: t.createdBy,
    assignedTo: t.assignedTo,
    done: t.done,
    banner: t.banner,
    bannerText: t.bannerText,
  };
}
