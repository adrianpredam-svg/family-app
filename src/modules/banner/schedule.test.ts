import { describe, expect, it } from "vitest";
import { bannerTaskItems, localDay } from "./schedule";

const base = { done: false, banner: true, bannerText: null, title: "Dentist", allDay: false };
// 19 Nov 2026, 14:00 in Copenhagen (UTC+1)
const now = new Date("2026-11-19T13:00:00Z");
const task = (id: number, start: string, mins = 30, extra = {}) => ({
  ...base, id, startsAt: new Date(start), endsAt: new Date(Date.parse(start) + mins * 60_000), ...extra,
});

describe("banner tasks", () => {
  it("uses the Copenhagen calendar day", () => {
    expect(localDay(new Date("2026-11-19T23:30:00Z"))).toBe("2026-11-20"); // 00:30 local next day
  });

  it("shows tomorrow's banner tasks today, and today's until they start", () => {
    const items = bannerTaskItems([
      task(1, "2026-11-20T07:00:00Z"),                     // tomorrow 08:00 -> yes
      task(2, "2026-11-19T16:00:00Z"),                     // today 17:00, not started -> yes
      task(3, "2026-11-19T10:00:00Z"),                     // today 11:00, already started -> no
      task(4, "2026-11-21T07:00:00Z"),                     // in two days -> no
      task(5, "2026-11-20T07:00:00Z", 30, { banner: false }), // not a banner task
      task(6, "2026-11-20T08:00:00Z", 30, { done: true }),    // done -> no
    ], now);
    expect(items.map((i) => [i.id, i.day])).toEqual([[2, "today"], [1, "tomorrow"]]);
  });

  it("uses the banner text, or the title when it is empty", () => {
    const items = bannerTaskItems([
      task(1, "2026-11-20T07:00:00Z", 30, { bannerText: "Bring the blue folder!" }),
      task(2, "2026-11-20T09:00:00Z", 30, { bannerText: "  " }),
    ], now);
    expect(items.map((i) => i.text)).toEqual(["Bring the blue folder!", "Dentist"]);
  });

  it("handles all-day tasks for today and tomorrow", () => {
    // all-day tasks start at local midnight (23:00 UTC the day before)
    const items = bannerTaskItems([
      task(1, "2026-11-18T23:00:00Z", 24 * 60, { allDay: true }), // today all day -> yes
      task(2, "2026-11-19T23:00:00Z", 24 * 60, { allDay: true }), // tomorrow all day -> yes
    ], now);
    expect(items.map((i) => [i.id, i.day])).toEqual([[1, "today"], [2, "tomorrow"]]);
  });
});
