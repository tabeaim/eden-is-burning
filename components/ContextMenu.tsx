"use client";

import { useEffect, useRef, useState } from "react";

export interface MenuItem {
  label: string;
  onClick: () => void;
}

// Kleines Rechtsklick-Menü an der Mausposition (z.B. Szenenbox: „Als ungelesen
// markieren"). `useContextMenu` liefert den Handler und das Menü zum Einhängen.
export function useContextMenu(items: MenuItem[]) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const onContextMenu = (e: React.MouseEvent) => {
    if (items.length === 0) return;
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
  };
  const menu = pos ? <ContextMenu {...pos} items={items} onClose={() => setPos(null)} /> : null;
  return { onContextMenu, menu };
}

function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      if (e.type === "mousedown" && ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      // nicht über den rechten/unteren Bildschirmrand hinaus
      style={{
        left: `min(${x}px, calc(100vw - 15rem))`,
        top: `min(${y}px, calc(100vh - ${items.length * 2.25 + 1}rem))`,
      }}
      className="fixed z-[80] w-56 rounded-lg border border-border-subtle bg-bg-surface-2 p-1 shadow-2xl shadow-black/70"
    >
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="block w-full rounded-md px-2.5 py-1.5 text-left text-[0.8125rem] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
