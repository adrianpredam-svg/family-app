"use client";
import { useEffect } from "react";

type Props = { open: boolean; onClose: () => void; title: string; children: React.ReactNode };

/** Bottom sheet on phones, centred dialog on bigger screens. */
export function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="safe-bottom relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-[var(--card)] p-5 shadow-xl sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--border)] sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-2xl leading-none text-[var(--muted)]" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
