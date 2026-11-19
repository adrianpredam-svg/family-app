import { FAMILY_TIMEZONE } from "@/lib/time";

// Which banner tasks show right now: tasks ticked "Show in the banner" that happen
// tomorrow (shown all day today) or later today (shown until they start).

export type BannerTask = { id: number; startsAt: Date; endsAt: Date; allDay: boolean; done: boolean; banner: boolean; bannerText: string | null; title: string };
export type BannerTaskItem = { kind: "task"; id: number; text: string; startsAt: string; allDay: boolean; day: "today" | "tomorrow" };

/** "2026-11-19" in the family's timezone. */
export function localDay(d: Date, tz = FAMILY_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function bannerTaskItems(tasks: BannerTask[], now: Date, tz = FAMILY_TIMEZONE): BannerTaskItem[] {
  const today = localDay(now, tz), tomorrow = addDays(today, 1);
  return tasks
    .filter((t) => t.banner && !t.done)
    .map((t) => {
      // All-day tasks are stored from local midnight; their day is the local date of the start.
      const day = localDay(t.allDay ? new Date(t.startsAt.getTime() + 60 * 60_000) : t.startsAt, tz);
      return { t, day };
    })
    .filter(({ t, day }) => {
      if (day === tomorrow) return true;
      if (day === today) return t.allDay ? t.endsAt > now : t.startsAt > now;
      return false;
    })
    .sort((a, b) => +a.t.startsAt - +b.t.startsAt)
    .map(({ t, day }) => ({
      kind: "task" as const,
      id: t.id,
      text: t.bannerText?.trim() || t.title,
      startsAt: t.startsAt.toISOString(),
      allDay: t.allDay,
      day: day === today ? ("today" as const) : ("tomorrow" as const),
    }));
}
