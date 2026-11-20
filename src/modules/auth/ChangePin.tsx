"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";

/** Sheet where a logged-in family member changes their own PIN. */
export function ChangePin({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function close() {
    setCurrent(""); setNext(""); setConfirm(""); setError(""); setDone(false);
    onClose();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) return setError("The two new PINs are not the same");
    setBusy(true);
    const res = await fetch("/api/auth/pin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current, next, confirm }) });
    setBusy(false);
    if (res.ok) { setDone(true); return; }
    setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
  }

  const digits = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/\D/g, "").slice(0, 6));
  const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-center text-2xl tracking-[0.5em]";
  return (
    <Sheet open={open} onClose={close} title="🔑 Change my PIN">
      {done ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-lg">✅ Your new PIN is saved.</p>
          <p className="text-sm text-[var(--muted)]">Use it next time you log in, on every phone. Tip: save it in a safe place.</p>
          <button onClick={close} className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-semibold text-white">Done</button>
        </div>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Current PIN</span>
            <input type="password" inputMode="numeric" autoComplete="current-password" required minLength={4} maxLength={6} value={current} onChange={digits(setCurrent)} className={input} aria-label="Current PIN" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">New PIN (4 to 6 numbers)</span>
            <input type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={6} value={next} onChange={digits(setNext)} className={input} aria-label="New PIN" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">New PIN again</span>
            <input type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={6} value={confirm} onChange={digits(setConfirm)} className={input} aria-label="New PIN again" />
          </label>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <button disabled={busy} className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save new PIN"}
          </button>
          <p className="text-xs text-[var(--muted)]">Forgot your PIN? Ask Adrian — he can reset it.</p>
        </form>
      )}
    </Sheet>
  );
}
