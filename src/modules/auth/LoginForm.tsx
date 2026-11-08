"use client";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { PublicMember } from "@/lib/auth";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function LoginForm({ members, next = "/" }: { members: PublicMember[]; next?: string }) {
  const [selected, setSelected] = useState<PublicMember | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(value: string) {
    if (!selected || value.length < 4) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memberId: selected.id, pin: value }),
    });
    if (res.ok) {
      window.location.href = next;
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
    setPin("");
    setBusy(false);
  }

  function press(key: string) {
    if (busy) return;
    if (key === "⌫") return setPin((p) => p.slice(0, -1));
    if (!key || pin.length >= 6) return;
    setPin(pin + key);
  }

  if (!selected) {
    return (
      <ul className="mt-8 grid grid-cols-2 gap-3">
        {members.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => setSelected(m)}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-lg font-medium shadow-sm active:scale-95"
            >
              <Avatar name={m.name} color={m.color} size={56} />
              {m.name}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center">
      <button onClick={() => { setSelected(null); setPin(""); setError(""); }} className="flex flex-col items-center gap-2">
        <Avatar name={selected.name} color={selected.color} size={64} />
        <span className="text-lg font-medium">{selected.name}</span>
        <span className="text-sm text-[var(--muted)] underline">Not you?</span>
      </button>

      <div className="mt-6 flex h-6 gap-3" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-[var(--text)] ${i < pin.length ? "bg-[var(--text)]" : ""}`} />
        ))}
      </div>
      <p role="alert" className="mt-3 min-h-6 text-center text-sm text-red-500">{error}</p>

      <div className="mt-2 grid w-full max-w-xs grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k ? (
            <button
              key={i}
              onClick={() => press(k)}
              aria-label={k === "⌫" ? "Delete" : k}
              className="h-16 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-2xl font-medium active:scale-95"
            >
              {k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <button
        onClick={() => submit(pin)}
        disabled={busy || pin.length < 4}
        className="mt-5 w-full max-w-xs rounded-2xl bg-[var(--accent)] py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Checking…" : "Log in"}
      </button>
    </div>
  );
}
