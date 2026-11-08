"use client";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { PublicMember } from "@/lib/auth";
import { Bell } from "@/modules/notifications/Bell";
import { isIos, isStandalone, usePush } from "@/modules/notifications/usePush";

const HINT_KEY = "install-hint-dismissed";

export function Header({ me, onOpenTask }: { me: PublicMember; onOpenTask: (id: number) => void }) {
  const [menu, setMenu] = useState(false);
  const [today, setToday] = useState("");
  const [showInstallHint, setShowInstallHint] = useState(false);
  const push = usePush();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToday(new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }));
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(HINT_KEY) === "1";
    } catch {}
    setShowInstallHint(isIos() && !isStandalone() && !dismissed);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function dismissHint() {
    setShowInstallHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }

  const pushLabel =
    push.state === "granted" && push.subscribed
      ? "🔔 Notifications are on"
      : push.state === "denied"
        ? "Notifications blocked in phone settings"
        : push.state === "needs-install"
          ? "Add to Home Screen to get notifications"
          : push.state === "unsupported"
            ? "This browser can't show notifications"
            : push.state === "unconfigured"
              ? "Notifications not set up on the server"
              : "🔔 Turn on notifications";
  const canEnable = push.state === "default" || (push.state === "granted" && !push.subscribed);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-[var(--bg)]/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">Preda Family</h1>
          <p className="truncate text-sm text-[var(--muted)]">{today}</p>
        </div>
        <Bell onOpenTask={onOpenTask} />
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenu((m) => !m)} aria-label={`Menu for ${me.name}`} className="rounded-full">
            <Avatar name={me.name} color={me.color} size={38} />
          </button>
          {menu && (
            <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
              <p className="border-b border-[var(--border)] px-4 py-3 font-semibold">Hi {me.name}!</p>
              <button
                disabled={!canEnable}
                onClick={() => push.enable().then((ok) => !ok && alert("Notifications were not turned on."))}
                className="block w-full border-b border-[var(--border)] px-4 py-3 text-left disabled:text-[var(--muted)]"
              >
                {pushLabel}
              </button>
              <button onClick={logout} className="block w-full px-4 py-3 text-left text-red-600">
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {showInstallHint && (
        <div className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
          <span className="text-xl" aria-hidden>📲</span>
          <p className="flex-1">
            To get notifications on iPhone: tap <b>Share</b> → <b>Add to Home Screen</b>, then open the app from your home screen.
          </p>
          <button onClick={dismissHint} aria-label="Hide tip" className="px-1 text-lg text-[var(--muted)]">
            ×
          </button>
        </div>
      )}
      {!showInstallHint && push.state === "default" && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
          <p className="flex-1">Get a message when someone adds a task for you.</p>
          <button onClick={() => push.enable()} className="rounded-xl bg-[var(--accent)] px-3 py-2 font-semibold text-white">
            Turn on
          </button>
        </div>
      )}
    </>
  );
}
