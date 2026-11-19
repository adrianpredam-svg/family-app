"use client";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import type { PublicMember } from "@/lib/auth";
import type { TaskDTO } from "./repo";

export type SheetState =
  | { mode: "closed" }
  | { mode: "create"; start: Date; end?: Date; allDay?: boolean }
  | { mode: "view"; task: TaskDTO }
  | { mode: "edit"; task: TaskDTO };

type Props = {
  state: SheetState;
  me: PublicMember;
  members: PublicMember[];
  onClose: () => void;
  onChanged: () => void;
  onEdit: (task: TaskDTO) => void;
};

// Duration in minutes; 0 = all day. New tasks last 30 minutes unless you pick something else.
export const MIN_MINUTES = 15;
export const DEFAULT_MINUTES = 30;
const DURATIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 h", minutes: 60 },
  { label: "1½ h", minutes: 90 },
  { label: "2 h", minutes: 120 },
  { label: "All day", minutes: 0 },
];
const MINUTE = 60_000;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const minutesBetween = (a: Date, b: Date) => Math.max(MIN_MINUTES, Math.round((+b - +a) / MINUTE));
const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Something went wrong");
  return res.json();
}

export function TaskSheet({ state, me, members, onClose, onChanged, onEdit }: Props) {
  const byId = new Map(members.map((m) => [m.id, m]));

  if (state.mode === "view") {
    return <TaskDetails task={state.task} me={me} byId={byId} onClose={onClose} onChanged={onChanged} onEdit={onEdit} />;
  }
  return (
    <Sheet open={state.mode !== "closed"} onClose={onClose} title={state.mode === "edit" ? "Edit task" : "New task"}>
      {state.mode !== "closed" && <TaskForm key={JSON.stringify(state)} state={state} me={me} members={members} onDone={onChanged} />}
    </Sheet>
  );
}

function TaskForm({
  state,
  me,
  members,
  onDone,
}: {
  state: Extract<SheetState, { mode: "create" | "edit" }>;
  me: PublicMember;
  members: PublicMember[];
  onDone: () => void;
}) {
  const initial = state.mode === "edit"
    ? {
        title: state.task.title,
        notes: state.task.notes ?? "",
        start: new Date(state.task.startsAt),
        minutes: state.task.allDay ? 0 : minutesBetween(new Date(state.task.startsAt), new Date(state.task.endsAt)),
        assignedTo: state.task.assignedTo,
      }
    : {
        title: "",
        notes: "",
        start: state.start,
        minutes: state.allDay ? 0 : state.end ? minutesBetween(state.start, state.end) : DEFAULT_MINUTES,
        assignedTo: me.id,
      };

  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);
  const [date, setDate] = useState(toDateInput(initial.start));
  const [time, setTime] = useState(initial.minutes === 0 ? "09:00" : toTimeInput(initial.start));
  const [minutes, setMinutes] = useState(initial.minutes);
  // Custom length in minutes, shown when it isn't one of the quick buttons.
  const [custom, setCustom] = useState(DURATIONS.some((d) => d.minutes === initial.minutes) ? "" : String(initial.minutes));
  const [assignedTo, setAssignedTo] = useState(initial.assignedTo);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const allDay = minutes === 0;
    const length = custom ? Number(custom) : minutes;
    if (!allDay && (!Number.isFinite(length) || length < MIN_MINUTES)) {
      setError(`A task needs at least ${MIN_MINUTES} minutes`);
      setBusy(false);
      return;
    }
    const start = allDay ? new Date(y, m - 1, d, 0) : new Date(y, m - 1, d, hh || 0, mm || 0);
    const end = allDay ? new Date(y, m - 1, d + 1, 0) : new Date(start.getTime() + length * MINUTE);
    const body = { title, notes: notes || null, startsAt: start.toISOString(), endsAt: end.toISOString(), allDay, assignedTo };
    try {
      if (state.mode === "edit") await api(`/api/tasks/${state.task.id}`, "PATCH", body);
      else await api("/api/tasks", "POST", body);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-base";
  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">What?</span>
        <input autoFocus required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Buy milk" className={input} />
      </label>

      <div>
        <span className="text-sm font-medium">For whom?</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setAssignedTo(m.id)}
              aria-pressed={assignedTo === m.id}
              className="flex items-center gap-2 rounded-full border-2 px-3 py-1.5"
              style={{ borderColor: assignedTo === m.id ? m.color : "var(--border)", background: assignedTo === m.id ? `${m.color}22` : undefined }}
            >
              <Avatar name={m.name} color={m.color} size={24} />
              {m.id === me.id ? "Me" : m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Day</span>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Time</span>
          <input
            type="time"
            required={minutes !== 0}
            step={60}
            value={time}
            disabled={minutes === 0}
            onChange={(e) => setTime(e.target.value)}
            className={`${input} disabled:opacity-40`}
          />
        </label>
      </div>

      <div>
        <span className="text-sm font-medium">How long?</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {DURATIONS.map((d) => {
            const on = !custom && minutes === d.minutes;
            return (
              <button
                type="button"
                key={d.label}
                onClick={() => { setMinutes(d.minutes); setCustom(""); }}
                aria-pressed={on}
                className={`rounded-full border px-4 py-1.5 ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]"}`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <span>Or exactly</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_MINUTES}
            max={24 * 60}
            step={5}
            placeholder="e.g. 40"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); if (minutes === 0) setMinutes(DEFAULT_MINUTES); }}
            className="w-24 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-base"
            aria-label="Length in minutes"
          />
          <span>minutes</span>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={input} />
      </label>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <button disabled={busy} className="rounded-2xl bg-[var(--accent)] py-4 text-lg font-semibold text-white disabled:opacity-50">
        {busy ? "Saving…" : state.mode === "edit" ? "Save changes" : "Add task"}
      </button>
    </form>
  );
}

function TaskDetails({
  task,
  me,
  byId,
  onClose,
  onChanged,
  onEdit,
}: {
  task: TaskDTO;
  me: PublicMember;
  byId: Map<number, PublicMember>;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (task: TaskDTO) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setConfirmDelete(false), [task.id]);

  const creator = byId.get(task.createdBy);
  const target = byId.get(task.assignedTo);
  const mayChange = task.createdBy === me.id || task.assignedTo === me.id;
  const start = new Date(task.startsAt);
  const end = new Date(task.endsAt);
  const when = task.allDay
    ? start.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }) + " · all day"
    : `${start.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })} · ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}–${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const name = (m?: PublicMember) => (m ? (m.id === me.id ? "you" : m.name) : "someone");
  return (
    <Sheet open onClose={onClose} title={task.title}>
      <div className="flex flex-col gap-3">
        <p className="text-[var(--muted)]">{when}</p>
        <div className="flex items-center gap-2 rounded-xl bg-[var(--bg)] p-3">
          {creator && <Avatar name={creator.name} color={creator.color} size={28} />}
          <span>
            Created by <b>{name(creator)}</b> for <b>{name(target)}</b>
          </span>
          {target && <Avatar name={target.name} color={target.color} size={28} />}
        </div>
        {task.notes && <p className="whitespace-pre-wrap">{task.notes}</p>}
        {task.done && <p className="font-medium text-green-600">✓ Done</p>}
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

        {mayChange ? (
          <div className="mt-2 flex flex-col gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => api(`/api/tasks/${task.id}`, "PATCH", { done: !task.done }))}
              className="rounded-2xl bg-green-600 py-3.5 text-lg font-semibold text-white disabled:opacity-50"
            >
              {task.done ? "Mark as not done" : "✓ Mark done"}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={() => onEdit(task)} className="rounded-2xl border border-[var(--border)] py-3 font-medium">
                Edit
              </button>
              {confirmDelete ? (
                <button
                  disabled={busy}
                  onClick={() => run(() => api(`/api/tasks/${task.id}`, "DELETE"))}
                  className="rounded-2xl bg-red-600 py-3 font-semibold text-white"
                >
                  Yes, delete
                </button>
              ) : (
                <button disabled={busy} onClick={() => setConfirmDelete(true)} className="rounded-2xl border border-red-300 py-3 font-medium text-red-600">
                  Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Only {name(creator)} or {name(target)} can change this task.</p>
        )}
      </div>
    </Sheet>
  );
}
