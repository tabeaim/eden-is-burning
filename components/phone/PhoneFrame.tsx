"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/types";
import { characterImage } from "@/lib/avatar";
import { Icon } from "@/components/Icon";

// Das „Handy" des Messengers (siehe DESIGN.md): auf dem Handy füllt es den ganzen
// Bildschirm, ab `sm` steht es als Gerät mit Rahmen mittig auf der Seite.
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Höhe an den sichtbaren Bereich koppeln, damit die Eingabezeile über der
  // Bildschirmtastatur bleibt (iOS verkleinert 100dvh dafür nicht).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => {
      ref.current?.style.setProperty("--phone-h", `${Math.round(vv.height)}px`);
      if (window.innerWidth < 640) window.scrollTo(0, 0);
    };
    fit();
    vv.addEventListener("resize", fit);
    return () => vv.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="flex justify-center sm:py-6">
      <div
        ref={ref}
        className="relative flex h-[var(--phone-h,100dvh)] w-full flex-col overflow-hidden bg-[#0c0c0e] sm:h-[min(820px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-[2.5rem] sm:border-[7px] sm:border-[#232327] sm:shadow-2xl sm:shadow-black/70"
      >
        {children}
      </div>
    </div>
  );
}

// Kopfzeile im Handy. Rechts bleibt auf schmalen Bildschirmen Platz für die
// Menü-Taste der App.
export function PhoneHeader({
  back,
  children,
  actions,
}: {
  back?: string; // Ziel des Zurück-Pfeils
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[56px] shrink-0 items-center gap-1.5 border-b border-border-subtle bg-bg-surface px-2 py-2 pr-14 sm:pr-3">
      {back && (
        <Link
          href={back}
          aria-label="Zurück"
          className="flex h-9 w-7 shrink-0 items-center justify-center text-accent"
        >
          <Icon name="chevron-right" size={22} className="rotate-180" />
        </Link>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {actions}
    </div>
  );
}

export function PhoneAvatar({
  character,
  size = 40,
  className = "",
}: {
  character: Pick<Character, "faceclaim_image_url">;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={characterImage(character)}
      alt=""
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full bg-bg-surface-2 object-cover ${className}`}
    />
  );
}

// Runde Icon-Taste in Kopfzeile und Eingabezeile
export const phoneIconBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-accent hover:bg-white/[0.06] disabled:opacity-40";

// Wessen Handy zuletzt offen war (pro Gerät gemerkt). "all" = alle Chats.
const KEY = "eden:phone";
export function usePhoneOwner(): [string | null, (id: string) => void] {
  const [owner, setOwner] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });
  const set = (id: string) => {
    setOwner(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  };
  return [owner, set];
}
