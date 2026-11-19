"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg, type EventResizeDoneArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg, EventDropArg, EventInput, EventSourceFuncArg, DateSelectArg } from "@fullcalendar/core";
import type { PublicMember } from "@/lib/auth";
import type { TaskDTO } from "@/modules/tasks/repo";
import { TaskSheet, type SheetState } from "@/modules/tasks/TaskSheet";
import { Header } from "./Header";

type Filter = "all" | "mine" | number;

export function Dashboard({ me, members, homeUrl }: { me: PublicMember; members: PublicMember[]; homeUrl: string | null }) {
  const calendar = useRef<FullCalendar>(null);
  const [mounted, setMounted] = useState(false);
  const [isPhone, setIsPhone] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const filterRef = useRef<Filter>("all");
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // FullCalendar needs the browser, and phones get the day view by default.
  useEffect(() => {
    setIsPhone(window.innerWidth < 768);
    setMounted(true);
  }, []);

  const refresh = useCallback(() => calendar.current?.getApi().refetchEvents(), []);

  const openTask = useCallback(async (taskId: number) => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) setSheet({ mode: "view", task: await res.json() });
  }, []);

  // Open a task from a notification link (/?task=123) or from a push tap while the app is open.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("task"));
    if (id) {
      openTask(id);
      window.history.replaceState(null, "", "/");
    }
    const onMessage = (e: MessageEvent) => e.data?.type === "open-task" && openTask(Number(e.data.taskId));
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [openTask]);

  useEffect(() => {
    filterRef.current = filter;
    refresh();
  }, [filter, refresh]);

  // Refresh when coming back to the app, so tasks added by others show up.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const fetchEvents = useCallback(
    async (info: EventSourceFuncArg): Promise<EventInput[]> => {
      const q = new URLSearchParams({ start: info.start.toISOString(), end: info.end.toISOString() });
      const res = await fetch(`/api/tasks?${q}`, { cache: "no-store" });
      if (res.status === 401) window.location.href = "/login";
      if (!res.ok) return [];
      const tasks: TaskDTO[] = await res.json();
      const f = filterRef.current;
      return tasks
        .filter((t) => f === "all" || (f === "mine" ? t.assignedTo === me.id : t.assignedTo === f))
        .map((t) => ({
          id: String(t.id),
          title: t.title,
          start: t.startsAt,
          end: t.endsAt,
          allDay: t.allDay,
          backgroundColor: byId.get(t.assignedTo)?.color ?? "#64748b",
          textColor: "#ffffff",
          classNames: t.done ? ["task-done"] : [],
          editable: t.createdBy === me.id || t.assignedTo === me.id,
          extendedProps: { task: t },
        }));
    },
    [byId, me.id],
  );

  const renderEvent = useCallback(
    (arg: EventContentArg) => {
      const t = arg.event.extendedProps.task as TaskDTO;
      const from = byId.get(t.createdBy)?.name ?? "?";
      const to = byId.get(t.assignedTo)?.name ?? "?";
      // Short tasks (30 minutes or less) get one line so the text fits the small block.
      const minutes = (Date.parse(t.endsAt) - Date.parse(t.startsAt)) / 60_000;
      if (!t.allDay && minutes <= 30 && arg.view.type.startsWith("timeGrid")) {
        return (
          <div className="truncate leading-tight">
            <span className="task-title font-semibold">{t.done ? "✓ " : ""}{arg.event.title}</span>
            <span className="text-[0.7rem] opacity-90"> · {arg.timeText.split(" - ")[0]}</span>
          </div>
        );
      }
      return (
        <div className="overflow-hidden leading-tight">
          <div className="task-title truncate font-semibold">
            {t.done ? "✓ " : ""}
            {arg.event.title}
          </div>
          <div className="truncate text-[0.7rem] opacity-90">
            {arg.timeText && <span>{arg.timeText} · </span>}
            {t.createdBy === t.assignedTo ? from : `${from} → ${to}`}
          </div>
        </div>
      );
    },
    [byId],
  );

  async function move(arg: EventDropArg | EventResizeDoneArg) {
    const { event } = arg;
    const res = await fetch(`/api/tasks/${event.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        startsAt: event.start!.toISOString(),
        endsAt: (event.end ?? new Date(event.start!.getTime() + 30 * 60_000)).toISOString(),
        allDay: event.allDay,
      }),
    });
    if (!res.ok) {
      arg.revert();
      alert((await res.json().catch(() => ({}))).error ?? "Could not move the task");
    } else refresh();
  }

  const createAt = (start: Date, allDay: boolean, end?: Date) => {
    // Tapping a whole day (month view or the "All day" row) suggests 09:00.
    if (allDay) start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9);
    setSheet({ mode: "create", start, end });
  };

  const chips: { key: Filter; label: string; color?: string }[] = [
    { key: "all", label: "Everyone" },
    { key: "mine", label: "Only mine" },
    ...members.filter((m) => m.id !== me.id).map((m) => ({ key: m.id as Filter, label: m.name, color: m.color })),
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col">
      <Header me={me} onOpenTask={openTask} homeUrl={homeUrl} />

      <nav className="flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Show tasks for">
        {chips.map((c) => (
          <button
            key={String(c.key)}
            onClick={() => setFilter(c.key)}
            aria-pressed={filter === c.key}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
              filter === c.key ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            {c.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
            {c.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-2 pb-28 sm:px-4">
        <div className="rounded-2xl bg-[var(--card)] p-2 shadow-sm">
          {mounted && (
            <FullCalendar
              ref={calendar}
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView={isPhone ? "timeGridDay" : "timeGridWeek"}
              headerToolbar={{ left: "prev,next today", center: "title", right: isPhone ? "" : "timeGridDay,timeGridWeek,dayGridMonth" }}
              footerToolbar={isPhone ? { center: "timeGridDay,timeGridWeek,dayGridMonth" } : undefined}
              buttonText={{ today: "Today", day: "Day", week: "Week", month: "Month" }}
              locale="en-GB"
              firstDay={1}
              height="auto"
              slotDuration="00:30:00"
              snapDuration="00:15:00"
              slotLabelInterval="01:00:00"
              defaultTimedEventDuration="00:30:00"
              eventMinHeight={22}
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
              slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              dayHeaderFormat={isPhone ? { weekday: "short", day: "numeric" } : { weekday: "short", day: "numeric", month: "numeric" }}
              nowIndicator
              allDayText="All day"
              events={fetchEvents}
              eventContent={renderEvent}
              eventClick={(arg: EventClickArg) => setSheet({ mode: "view", task: arg.event.extendedProps.task as TaskDTO })}
              dateClick={(arg: DateClickArg) => createAt(arg.date, arg.allDay)}
              selectable
              selectLongPressDelay={400}
              select={(arg: DateSelectArg) => {
                // Dragging over several slots sets the length; a single tap uses the 30-minute default.
                if (!arg.allDay && arg.end.getTime() - arg.start.getTime() > 30 * 60_000) createAt(arg.start, false, arg.end);
              }}
              eventDrop={move}
              eventResize={move}
              eventLongPressDelay={400}
            />
          )}
        </div>
      </main>

      <button
        onClick={() => {
          const now = new Date();
          // Next half hour, e.g. 14:07 -> 14:30
          const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() < 30 ? 30 : 60);
          createAt(next, false);
        }}
        className="fixed bottom-6 right-5 z-30 rounded-full bg-[var(--accent)] px-6 py-4 text-lg font-semibold text-white shadow-lg active:scale-95"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        + Task
      </button>

      <TaskSheet
        state={sheet}
        me={me}
        members={members}
        onClose={() => setSheet({ mode: "closed" })}
        onChanged={() => {
          setSheet({ mode: "closed" });
          refresh();
        }}
        onEdit={(task) => setSheet({ mode: "edit", task })}
      />
    </div>
  );
}
