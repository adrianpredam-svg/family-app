export const FAMILY_TIMEZONE = "Europe/Copenhagen";

/** "Tue 17:00" in the family's timezone. */
export function shortWhen(date: Date, allDay = false): string {
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: FAMILY_TIMEZONE }).format(date);
  if (allDay) return day;
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: FAMILY_TIMEZONE }).format(date);
  return `${day} ${time}`;
}
