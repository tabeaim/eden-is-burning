"use client";

import { useEffect } from "react";

// Nachfrage vor endgültigen Aktionen (statt des Browser-Popups): abgedunkelter
// Hintergrund, kurze Erklärung, klar benannter Bestätigen-Knopf.
export function ConfirmDialog({
  title,
  text,
  warning,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  text?: string;
  warning?: string; // fett und rot über dem Text – für wirklich Endgültiges
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-2xl shadow-black/70"
      >
        <div className="font-serif text-[1rem] text-text-primary">{title}</div>
        {warning && (
          <p className="mt-2 rounded-md border border-red-400/50 bg-red-500/15 px-3 py-2 text-[0.875rem] font-bold leading-snug text-red-200">
            {warning}
          </p>
        )}
        {text && <p className="mt-1.5 text-[0.875rem] leading-relaxed text-text-secondary">{text}</p>}
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            autoFocus
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md border border-red-400/50 bg-red-500/15 px-3 py-1.5 text-[0.8125rem] font-medium text-red-200 hover:bg-red-500/25"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
