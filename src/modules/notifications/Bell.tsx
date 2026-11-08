"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Item = { id: number; taskId: number | null; message: string; readAt: string | null; createdAt: string };

const POLL_MS = 30_000;

export function Bell({ onOpenTask }: { onOpenTask: (taskId: number) => void }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setUnread(data.unread);
    setItems(data.items);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function markRead(body: object) {
    await fetch("/api/notifications/read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    load();
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-xl"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-500 px-1 text-center text-xs font-bold leading-5 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && (
              <button className="text-sm text-[var(--accent)]" onClick={() => markRead({ all: true })}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-[var(--muted)]">Nothing yet</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  className={`block w-full border-b border-[var(--border)] px-4 py-3 text-left text-sm ${n.readAt ? "text-[var(--muted)]" : "font-medium"}`}
                  onClick={() => {
                    if (!n.readAt) markRead({ ids: [n.id] });
                    setOpen(false);
                    if (n.taskId) onOpenTask(n.taskId);
                  }}
                >
                  {!n.readAt && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />}
                  {n.message}
                  <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                    {new Date(n.createdAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
