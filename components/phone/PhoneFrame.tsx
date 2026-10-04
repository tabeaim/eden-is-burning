"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { characterImage } from "@/lib/avatar";
import { PHONE_OWNER_KEY, resolvePhone, type PhoneModel } from "@/lib/phone";
import { Icon } from "@/components/Icon";

// Das „Handy" (siehe DESIGN.md). Über dem Gerät - nicht auf dem Display - sitzt
// die Leiste, in der man das Handy wechselt. Auf dem Handy füllt das Display den
// Rest des Bildschirms; ab `sm` steht das Gerät mit Gehäuse mittig auf der Seite.
// Modell, Gehäusefarbe und Kratzer kommen aus den Einstellungen des Charakters.
export function PhoneFrame({
  owner,
  options = [],
  onOwner,
  tone = "app",
  callBanner = true,
  children,
}: {
  owner: string | null; // Charakter-ID (null: neutrales Handy)
  options?: string[]; // wählbare Handys (Charakter-IDs)
  onOwner?: (id: string) => void;
  tone?: "app" | "home"; // "home": Hintergrundbild füllt das Display
  callBanner?: boolean; // eingehenden Anruf oben im Display melden
  children: React.ReactNode;
}) {
  const { character, calls } = useStore();
  const ownerChar = owner ? character(owner) : undefined;
  const phone = resolvePhone(ownerChar);
  const ringing = callBanner
    ? calls.find((c) => c.status === "ringing" && c.callee_id === owner)
    : undefined;
  const classic = phone.model === "classic";
  const burner = phone.burner;

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

  const radius = burner
    ? "sm:rounded-[2.75rem_2.75rem_4rem_4rem]"
    : classic
    ? "sm:rounded-[2.25rem]"
    : phone.model === "punch"
      ? "sm:rounded-[1.75rem]"
      : "sm:rounded-[2.75rem]";
  const screenRadius = burner
    ? "sm:rounded-[8px] sm:border-[5px] sm:border-black/70"
    : classic
    ? "sm:rounded-[3px]"
    : phone.model === "punch"
      ? "sm:rounded-[1.4rem]"
      : "sm:rounded-[2.3rem]";

  return (
    <div
      ref={ref}
      className="flex h-[var(--phone-h,100dvh)] flex-col sm:h-auto sm:items-center sm:py-4"
    >
      <OwnerBar owner={owner} options={options} onOwner={onOwner} />
      {/* Gehäuse (nur ab sm sichtbar) */}
      <div
        style={{ ["--frame" as string]: phone.frame }}
        className={`relative z-10 flex min-h-0 flex-1 flex-col sm:h-[min(800px,calc(100dvh-6.5rem))] sm:flex-none ${burner ? "sm:w-[330px]" : "sm:w-[390px]"} sm:bg-[var(--frame)] sm:shadow-2xl sm:shadow-black/70 sm:ring-1 sm:ring-white/10 ${radius} ${
          burner ? "sm:px-[20px]" : classic ? "sm:px-[9px]" : phone.model === "punch" ? "sm:p-[5px]" : "sm:p-[8px]"
        }`}
      >
        {classic && (
          <div className="hidden h-11 shrink-0 items-center justify-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-black/45" />
            <span className="h-1.5 w-12 rounded-full bg-black/45" />
          </div>
        )}
        {burner && (
          <div className="hidden h-14 shrink-0 flex-col items-center justify-center gap-1.5 sm:flex">
            <span className="h-1.5 w-14 rounded-full bg-black/45" />
            <span className="text-[0.625rem] font-bold tracking-[0.3em] text-black/45">EDEN</span>
          </div>
        )}
        {/* Display */}
        <div
          style={tone === "home" ? { background: phone.wallpaper } : undefined}
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--phone-screen,#0c0c0e)] ${screenRadius} ${
            burner ? "phone-burner" : ""
          }`}
        >
          <StatusBar model={phone.model} tone={tone} />
          {ringing && (
            <Link
              href="/handy"
              className="flex shrink-0 items-center gap-2 bg-green-500/90 px-3 py-2 text-[0.8125rem] font-semibold text-black"
            >
              <Icon name="phone" size={18} className="phone-ring shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {character(ringing.caller_id)?.name ?? "Jemand"} ruft an
              </span>
              <span className="shrink-0">Reagieren ›</span>
            </Link>
          )}
          <div className="burner-content relative flex min-h-0 flex-1 flex-col">{children}</div>
          {/* Home-Leiste: zurück zum Startbildschirm (altes Modell ab sm: Home-Button) */}
          <Link
            href="/handy"
            aria-label="Startbildschirm"
            title="Startbildschirm"
            className={`flex h-5 shrink-0 items-center justify-center ${
              tone === "home" ? "" : "bg-bg-surface"
            } ${classic || burner ? "sm:hidden" : ""}`}
          >
            <span className="h-1 w-28 rounded-full bg-text-primary/45" />
          </Link>
          {/* Burner: grünliches LCD über dem (entsättigten) Inhalt */}
          {burner && (
            <div className="pointer-events-none absolute inset-0 z-40 bg-[#a9c48f] mix-blend-multiply" />
          )}
          <WearOverlay level={phone.wear} seed={owner ?? "phone"} dark={burner} />
        </div>
        {classic && (
          <div className="hidden h-[3.75rem] shrink-0 items-center justify-center sm:flex">
            <Link
              href="/handy"
              aria-label="Startbildschirm"
              title="Startbildschirm"
              className="h-10 w-10 rounded-full border-2 border-black/35 bg-black/10 hover:bg-black/20"
            />
          </div>
        )}
        {burner && <BurnerKeypad />}
      </div>
    </div>
  );
}

// Tastenfeld des Burner Phones (nur ab sm; reine Deko bis auf die Menü-Taste).
function BurnerKeypad() {
  const key =
    "flex h-8 items-center justify-center rounded-[0.6rem] bg-black/25 text-[0.8125rem] font-semibold text-white/75 shadow-inner shadow-black/30";
  return (
    <div className="hidden shrink-0 flex-col gap-2 px-3 pb-7 pt-3 sm:flex">
      <div className="flex items-center justify-between gap-3">
        <span className="h-6 flex-1 rounded-full bg-black/25" />
        <Link
          href="/handy"
          aria-label="Menü"
          title="Menü"
          className="flex h-11 w-20 items-center justify-center rounded-full border-2 border-black/40 bg-black/15 text-[0.625rem] font-bold tracking-widest text-white/75 hover:bg-black/30"
        >
          MENÜ
        </Link>
        <span className="h-6 flex-1 rounded-full bg-black/25" />
      </div>
      <div aria-hidden className="grid grid-cols-3 gap-x-3 gap-y-1.5">
        {["1", "2 abc", "3 def", "4 ghi", "5 jkl", "6 mno", "7 pqrs", "8 tuv", "9 wxyz", "*", "0", "#"].map((k) => (
          <span key={k} className={key}>
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

// Leiste über dem Gerät: wessen Handy man gerade in der Hand hat. Mit mehreren
// Möglichkeiten ein Aufklappmenü, sonst nur die Angabe.
function OwnerBar({
  owner,
  options,
  onOwner,
}: {
  owner: string | null;
  options: string[];
  onOwner?: (id: string) => void;
}) {
  const { character } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const entry = (id: string | null) => {
    const c = id ? character(id) : undefined;
    return (
      <>
        {c ? (
          <PhoneAvatar character={c} size={26} />
        ) : (
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary">
            <Icon name="phone" size={14} />
          </span>
        )}
        <span className="min-w-0 truncate">
          {c ? `Handy von ${c.name}` : "Handy"}
        </span>
      </>
    );
  };
  const choosable = options.length > 1 && !!onOwner;

  return (
    // Rechts bleibt auf schmalen Bildschirmen Platz für die Menü-Taste der App.
    <div
      ref={ref}
      className="relative z-20 flex h-12 shrink-0 items-center border-b border-border-subtle bg-bg-sidebar pl-2 pr-14 sm:mb-3 sm:h-auto sm:w-[390px] sm:justify-center sm:border-0 sm:bg-transparent sm:px-0"
    >
      <button
        disabled={!choosable}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border-subtle bg-bg-surface py-1 pl-1 pr-3 text-[0.8125rem] text-text-primary disabled:border-transparent disabled:bg-transparent"
      >
        {entry(owner)}
        {choosable && (
          <Icon
            name="chevron-right"
            size={14}
            className={`shrink-0 text-text-tertiary transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
          />
        )}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-2 top-full mt-1 w-[min(18rem,calc(100vw-1rem))] rounded-xl border border-border-subtle bg-bg-surface-2 p-1 shadow-2xl shadow-black/70 sm:left-1/2 sm:-translate-x-1/2"
        >
          {options.map((id) => (
            <button
              key={id}
              role="option"
              aria-selected={id === owner}
              onClick={() => {
                onOwner?.(id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[0.875rem] hover:bg-white/[0.06] ${
                id === owner ? "text-accent" : "text-text-primary"
              }`}
            >
              {entry(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Statusleiste des Displays: Uhrzeit, Kamera je nach Modell, Empfang und Akku.
function StatusBar({ model, tone }: { model: PhoneModel; tone: "app" | "home" }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(t);
  }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <div
      className={`relative flex shrink-0 items-center justify-between px-6 text-[0.75rem] font-semibold text-text-primary ${
        model === "island" ? "h-9" : "h-7"
      } ${tone === "home" ? "" : "bg-bg-surface"}`}
    >
      <span>
        {p(now.getHours())}:{p(now.getMinutes())}
      </span>
      {model === "island" && (
        <span className="absolute left-1/2 top-1.5 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
      )}
      {model === "punch" && (
        <span className="absolute left-1/2 top-1.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />
      )}
      <span className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="0.8" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.8" opacity="0.35" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.45" />
          <rect x="2" y="2" width="13" height="8" rx="1.6" fill="currentColor" />
          <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

// Kleiner Zufallsgenerator mit festem Startwert: jedes Handy hat immer dieselben Kratzer.
function seeded(seed: string) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Kratzer und Sprünge über dem Display (nimmt keine Klicks an).
function WearOverlay({ level, seed, dark = false }: { level: number; seed: string; dark?: boolean }) {
  const { scratches, cracks } = useMemo(() => {
    const rnd = seeded(seed);
    const scratches: { d: string; o: number }[] = [];
    const count = [0, 5, 16, 16][level] ?? 0;
    for (let i = 0; i < count; i++) {
      const x = rnd() * 100;
      const y = rnd() * 200;
      const len = 6 + rnd() * (level === 1 ? 22 : 45);
      const a = rnd() * Math.PI;
      const bend = (rnd() - 0.5) * 6;
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      scratches.push({
        d: `M${x.toFixed(1)} ${y.toFixed(1)} Q${((x + x2) / 2 + bend).toFixed(1)} ${((y + y2) / 2 - bend).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        o: 0.05 + rnd() * (level === 1 ? 0.07 : 0.13),
      });
    }
    const cracks: string[] = [];
    if (level >= 3) {
      // Einschlag nahe einer Ecke, von dort laufen gezackte Sprünge übers Glas
      const cx = rnd() < 0.5 ? 8 + rnd() * 18 : 74 + rnd() * 18;
      const cy = rnd() < 0.5 ? 10 + rnd() * 30 : 160 + rnd() * 30;
      const rays = 8;
      const tips: [number, number][][] = [];
      for (let r = 0; r < rays; r++) {
        const a = (r / rays) * Math.PI * 2 + rnd() * 0.5;
        const steps = 3 + Math.floor(rnd() * 4);
        let x = cx;
        let y = cy;
        const pts: [number, number][] = [[x, y]];
        for (let s = 0; s < steps; s++) {
          const l = 10 + rnd() * 22;
          const aa = a + (rnd() - 0.5) * 0.7;
          x += Math.cos(aa) * l;
          y += Math.sin(aa) * l;
          pts.push([x, y]);
        }
        tips.push(pts);
        cracks.push("M" + pts.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join(" L"));
      }
      // Querverbindungen zwischen benachbarten Sprüngen (Spinnennetz)
      for (let r = 0; r < rays; r++) {
        const a = tips[r];
        const b = tips[(r + 1) % rays];
        for (let k = 1; k < Math.min(a.length, b.length, 3); k++) {
          if (rnd() < 0.3) continue;
          cracks.push(
            `M${a[k][0].toFixed(1)} ${a[k][1].toFixed(1)} L${b[k][0].toFixed(1)} ${b[k][1].toFixed(1)}`,
          );
        }
      }
    }
    return { scratches, cracks };
  }, [level, seed]);

  if (level <= 0) return null;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {scratches.map((s, i) => (
        <path key={i} d={s.d} stroke={dark ? "#000" : "#fff"} strokeOpacity={dark ? s.o * 2 : s.o} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {cracks.map((d, i) => (
        <g key={i}>
          <path d={d} stroke="#000" strokeOpacity={0.35} strokeWidth={2.2} vectorEffect="non-scaling-stroke" />
          <path d={d} stroke="#fff" strokeOpacity={0.42} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  );
}

// Kopfzeile einer App im Handy
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
    <div className="flex min-h-[52px] shrink-0 items-center gap-1.5 border-b border-border-subtle bg-bg-surface px-2 py-1.5">
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

// Wessen Handy zuletzt offen war (pro Gerät gemerkt).
const KEY = PHONE_OWNER_KEY;
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

// Das eigene Handy: der zuletzt gewählte eigene Charakter (sonst der erste).
// Startbildschirm, Captic und „Neue SMS" sind immer aus dessen Sicht.
export function useMyPhone() {
  const { currentPlayer, charactersOf } = useStore();
  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];
  const [stored, setOwner] = usePhoneOwner();
  const me = myChars.find((c) => c.id === stored) ?? myChars[0];
  return { myChars, me: me as Character | undefined, stored, setOwner };
}
