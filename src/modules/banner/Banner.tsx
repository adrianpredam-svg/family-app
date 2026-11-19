"use client";
import { useCallback, useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import type { PublicMember } from "@/lib/auth";

type TaskItem = { kind: "task"; id: number; text: string; startsAt: string; allDay: boolean; day: "today" | "tomorrow" };
type MessageItem = { kind: "message"; id: number; text: string; from: number; to: number | null; expiresAt: string; canRemove: boolean };
type Item = TaskItem | MessageItem;

const DURATIONS = [
  { label: "4 hours", hours: 4 },
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
];
const REFRESH_MS = 60_000;

type Props = { me: PublicMember; members: PublicMember[]; refreshKey: number; onOpenTask: (id: number) => void };

/** One-row banner above the calendar. The text scrolls and loops. Tap it to see everything or write a message. */
export function Banner({ me, members, refreshKey, onOpenTask }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const byId = new Map(members.map((m) => [m.id, m]));

  const load = useCallback(async () => {
    const res = await fetch("/api/banner", { cache: "no-store" });
    if (res.ok) setItems((await res.json()).items);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    // A push about a banner message opens the app at /?banner=1
    if (new URLSearchParams(window.location.search).get("banner")) { setOpen(true); window.history.replaceState(null, "", "/"); }
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  const label = (i: Item) => {
    if (i.kind === "task") {
      const time = i.allDay ? "" : ` ${new Date(i.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
      return `📅 ${i.day === "today" ? "Today" : "Tomorrow"}${time} · ${i.text}`;
    }
    const from = byId.get(i.from)?.name ?? "Someone";
    const to = i.to === null ? "" : ` → ${i.to === me.id ? "you" : byId.get(i.to)?.name ?? "?"}`;
    return `📣 ${from}${to}: ${i.text}`;
  };

  const line = items.map(label).join("     ✦     ");
  // Longer text scrolls for longer, so the speed stays the same (about 7 letters a second).
  const seconds = Math.max(12, Math.round((line.length + 10) / 7));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-4 mb-3 flex h-11 items-center gap-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-left"
        aria-label={items.length ? `Banner: ${items.map(label).join(". ")}. Tap to see all or write a message.` : "Write a banner message"}
      >
        {items.length === 0 ? (
          <span className="truncate text-sm text-[var(--muted)]">📣 Tap to put a message in the family banner</span>
        ) : (
          <span className="banner-track relative block flex-1 overflow-hidden whitespace-nowrap">
            {/* The text twice in a row, moved left by one copy: it loops without a gap. */}
            <span className="banner-scroll inline-block font-medium" style={{ animationDuration: `${seconds}s` }} aria-hidden>
              <span className="pr-16">{line}</span>
              <span className="pr-16">{line}</span>
            </span>
          </span>
        )}
      </button>
      <BannerSheet
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        label={label}
        me={me}
        members={members}
        onChanged={load}
        onOpenTask={(id) => { setOpen(false); onOpenTask(id); }}
      />
    </>
  );
}

function BannerSheet({
  open, onClose, items, label, me, members, onChanged, onOpenTask,
}: {
  open: boolean; onClose: () => void; items: Item[]; label: (i: Item) => string; me: PublicMember; members: PublicMember[];
  onChanged: () => void; onOpenTask: (id: number) => void;
}) {
  const [text, setText] = useState("");
  const [to, setTo] = useState<number | null>(null);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/banner", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, to, hours }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
    setText(""); onChanged();
  }
  async function remove(id: number) {
    await fetch(`/api/banner/${id}`, { method: "DELETE" });
    onChanged();
  }

  const chip = (on: boolean) => `flex items-center gap-2 rounded-full border-2 px-3 py-1.5 ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]"}`;
  return (
    <Sheet open={open} onClose={onClose} title="📣 Family banner">
      <div className="flex flex-col gap-4">
        {items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {items.map((i) => (
              <li key={`${i.kind}-${i.id}`} className="flex items-start gap-2 rounded-xl bg-[var(--bg)] p-3">
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => i.kind === "task" && onOpenTask(i.id)}
                  disabled={i.kind !== "task"}
                >
                  {label(i)}
                  {i.kind === "message" && (
                    <span className="mt-1 block text-xs text-[var(--muted)]">
                      Until {new Date(i.expiresAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </span>
                  )}
                </button>
                {i.kind === "message" && i.canRemove && (
                  <button type="button" onClick={() => remove(i.id)} className="rounded-full px-2 text-lg text-[var(--muted)]" aria-label="Remove message">🗑</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--muted)]">Nothing in the banner right now.</p>
        )}

        <form onSubmit={send} className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
          <span className="font-semibold">Write a banner message</span>
          <input
            required
            maxLength={140}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Pizza for dinner tonight! 🍕"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-base"
            aria-label="Banner message"
          />
          <div>
            <span className="text-sm font-medium">For whom?</span>
            <div className="mt-1 flex flex-wrap gap-2">
              <button type="button" className={chip(to === null)} aria-pressed={to === null} onClick={() => setTo(null)}>👪 Everyone</button>
              {members.filter((m) => m.id !== me.id).map((m) => (
                <button type="button" key={m.id} className={chip(to === m.id)} aria-pressed={to === m.id} onClick={() => setTo(m.id)}>
                  <Avatar name={m.name} color={m.color} size={22} /> {m.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Show it for</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button type="button" key={d.hours} className={chip(hours === d.hours)} aria-pressed={hours === d.hours} onClick={() => setHours(d.hours)}>{d.label}</button>
              ))}
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <button disabled={busy} className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-semibold text-white disabled:opacity-50">
            {busy ? "Sending…" : "📣 Put it in the banner"}
          </button>
          <p className="text-xs text-[var(--muted)]">{to === null ? "Everyone" : members.find((m) => m.id === to)?.name} gets a notification.</p>
        </form>
      </div>
    </Sheet>
  );
}
