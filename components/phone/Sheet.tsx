"use client";

// Blatt von unten im Handy-Display: Aktionen zu einer Nachricht oder einem Chat.
export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/55" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-t-2xl border-t border-border-subtle bg-bg-surface-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {children}
      </div>
    </div>
  );
}

export function SheetList({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-xl bg-white/[0.04] text-[0.9375rem]">
      {children}
    </div>
  );
}

export function SheetButton({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-left hover:bg-white/[0.05] ${danger ? "text-red-300" : "text-text-primary"}`}
    >
      {children}
    </button>
  );
}
