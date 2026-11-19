import { z } from "zod";

/** Timed tasks last at least 15 minutes (all-day tasks are a whole day anyway). */
export const MIN_TASK_MS = 15 * 60_000;

const isoDate = z.string().datetime({ offset: true }).transform((s) => new Date(s));

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, "Please write a title").max(120),
    notes: z.string().trim().max(2000).optional().nullable(),
    startsAt: isoDate,
    endsAt: isoDate,
    allDay: z.boolean().optional().default(false),
    assignedTo: z.number().int().positive(),
    banner: z.boolean().optional().default(false),
    bannerText: z.string().trim().max(140).optional().nullable(),
  })
  .refine((t) => t.endsAt > t.startsAt, { message: "End must be after start", path: ["endsAt"] })
  .refine((t) => t.allDay || +t.endsAt - +t.startsAt >= MIN_TASK_MS, { message: "A task needs at least 15 minutes", path: ["endsAt"] });

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    startsAt: isoDate.optional(),
    endsAt: isoDate.optional(),
    allDay: z.boolean().optional(),
    assignedTo: z.number().int().positive().optional(),
    done: z.boolean().optional(),
    banner: z.boolean().optional(),
    bannerText: z.string().trim().max(140).optional().nullable(),
  })
  .refine((t) => !(t.startsAt && t.endsAt) || t.endsAt > t.startsAt, {
    message: "End must be after start",
    path: ["endsAt"],
  });

export const rangeSchema = z.object({ start: isoDate, end: isoDate });

/** Banner text defaults to the task title when the box is ticked but the text is empty. */
export function bannerTextFor(banner: boolean, bannerText: string | null | undefined, title: string): string | null {
  if (!banner) return bannerText?.trim() || null;
  return bannerText?.trim() || title.slice(0, 140);
}
