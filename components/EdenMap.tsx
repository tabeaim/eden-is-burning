"use client";

import { useEffect, useRef, useState } from "react";

// Statische SVG-Karte von Eden, Virginia — 1:1 aus der aktualisierten Figma-Vorlage
// "Stadtbezirks-Karte" (Frame 608×654) übernommen. Die exakten Vektorpfade sind aus
// den Figma-Exporten transkribiert und per <g transform> an ihre Frame-Position
// gesetzt; Orchid Valley ist rotiert wie im Original.
// Neu ggü. der alten Karte: eigener Bezirk "Central" (Downtown-Fläche), abgesetzter
// "Industrial District & Eden Port", Byron University als Highlight in Rivers Edge.
// Die Auswahl-, Bespielt- und Aktive-Szenen-Logik der App liegt darüber.
// Pro Bereich zeigt ein oranger Ticker die Zahl der aktiven Szenen:
// zentriert unter dem Bezirksnamen bzw. rechts neben dem Label in den Pills.

interface District {
  key: string; // onSelect-Key (muss zu lib/world.ts bzw. EXTRA passen)
  label: string; // Beschriftung auf der Karte
  label2?: string; // zweite Zeile
  d: string; // exakter Pfad aus dem Figma-Export
  transform: string; // Positionierung im Frame-Koordinatensystem (0 0 608 654)
  lx: number;
  ly: number;
}

// Bezirke — Pfad-Koordinaten stammen aus dem jeweiligen Asset-viewBox (Ursprung
// nahe 0), transform verschiebt sie an die Frame-Position (left/top aus Figma).
const DISTRICTS: District[] = [
  {
    key: "orchid_valley",
    label: "Orchid Valley",
    // rotiert -40.25° um das AABB-Zentrum (Figma: gedrehter Frame)
    transform: "translate(149.0115 185.787) rotate(-40.25) translate(-111.7935 -87.1655)",
    lx: 114,
    ly: 176,
    d: "M8.03552 36.4573L49.0119 24.1835L72.9666 28.3285L96.0589 1.05226L123.849 24.1835L179.15 7.6612L203.053 48.259L222.782 76.1109L204.772 156.052L170.301 152.661L151.762 130.241L119.312 131.179L106.556 162.24L81.1625 147.293L72.318 173.217L39.1159 153.624L22.3015 117.77L41.6532 107.293L0.826713 67.0216L8.03552 36.4573Z",
  },
  {
    key: "oak_hill",
    label: "Oak Hill",
    transform: "translate(212 144)",
    lx: 290,
    ly: 238,
    d: "M110.34 16.38L150.34 0.880016L196.84 49.38L199.34 81.88L186.84 135.88L160.34 130.38L150.34 145.88L141.84 140.38L138.34 145.88L130.84 149.38L118.645 135.88H92.1448L94.34 150.88L85.84 152.38L79.84 159.38L69.84 142.88L48.84 150.88L36.34 135.88L11.84 117.88L0.839969 81.88L24 54L59.3 29.6L69.84 16.38H110.34Z",
  },
  {
    key: "belle_view",
    label: "Belle View",
    transform: "translate(398 190)",
    lx: 419,
    ly: 332,
    d: "M13.25 32.5823L35.25 8.58225H74.25L94.25 1.08225V89.4904L85.25 98.0823L79.25 108.582L77.75 124.082L85.25 119.582L87.25 108.582L90.75 100.582H96.25L97.75 118.101L94.25 142.082L87.25 154.582L77.75 160.582L87.25 166.582L92.25 160.582L97.75 185.862L92.25 213.082L110.25 241.582L66.75 232.082L35.25 243.082L5.75 228.582L13.25 181.582L5.75 119.582L10.75 110.582L0.75 100.582V89.4904L13.25 32.5823Z",
  },
  {
    key: "downtown",
    label: "Central",
    transform: "translate(272 309)",
    lx: 329,
    ly: 373,
    d: "M11.2832 16.75L23.2832 26.8351H38.7832L45.7832 16.75L65.7832 26.8351L76.7832 20.75L82.2832 10.75L90.7832 7.75L97.2832 16.75L106.283 10.75V0.75H132.783L139.283 63.2148L132.783 109.75L31.7832 87.2065L4.78322 61.25L0.783219 44.75L11.2832 16.75Z",
  },
  {
    key: "rivers_edge",
    label: "Rivers Edge",
    transform: "translate(182 357.5)",
    lx: 290,
    ly: 450,
    d: "M120.815 38.2176L220.315 61.2176L249.815 75.7176L233.315 133.718L207.815 156.218L172.815 128.218L115.315 133.718H87.3146L53.3146 106.718L33.3146 83.2176L7.81465 75.7176L0.814647 38.2176L29.8146 12.2176L45.8146 21.7176L67.3146 1.21761L73.3146 12.2176H93.3146L120.815 38.2176Z",
  },
  {
    key: "industrial",
    label: "Industrial District",
    label2: "& Eden Port",
    transform: "translate(388.5 421)",
    lx: 408,
    ly: 520,
    d: "M0.891562 91.7807L26.8916 69.7807L43.3916 12.2807L74.8916 0.780712L118.392 10.7807L127.892 91.7807L111.892 99.7807L118.392 112.781L127.892 126.281L118.392 156.281V181.281L26.8916 159.281L0.891562 91.7807Z",
  },
  {
    key: "westridge",
    label: "Westridge",
    transform: "translate(192.5 484.5)",
    lx: 279,
    ly: 552,
    d: "M74.4381 6.27724H107.563L163.563 0.777269L198.063 29.7773L221.063 92.2772L169.563 105.777H135.063H138.563L102.563 118.277L100.751 130.277L76.2506 124.277L61.5631 100.777L41.0631 78.7772L21.5631 71.2772L1.06306 53.7772L14.5631 38.2772L27.5631 33.2772L58.0631 29.7773L74.4381 6.27724Z",
  },
];

// Wasser (Potomac → Chesapeake Bay) — rein dekorativ.
const WATER: { d: string; transform: string; fill: string; stroke?: string }[] = [
  {
    d: "M156.562 18.3516L177.5 117.053V214.5L170.501 363.477L170.498 363.521L170.504 363.564L177.458 417.211L137.853 437.014L43.3555 448.453L14.9785 355.354L0.52832 301.041L43.4561 205.204L43.5 205.106V165.039L54.4922 101.585L54.5059 101.51L54.4961 101.435L43.5537 18.3789L116.95 0.525391L156.562 18.3516Z",
    transform: "translate(448 -18)",
    fill: "#192438",
    stroke: "#4A6080",
  },
  {
    d: "M0 97.5286L8.5 41.0083L69.5 0L155.5 9.24933L178 72.7673L196 499.091L21 487.249L28.5 359.675L0 297.673L8.5 241.251L13.5 180.992L0 97.5286Z",
    transform: "translate(493 378.51)",
    fill: "#192438",
  },
  {
    d: "M4 25.9112L12.9477 0L64 13.5L69.5 84.1824L25.3707 86.6955L0 40.3624L4 25.9112Z",
    transform: "translate(512.5 523)",
    fill: "#192438",
  },
];

// Belle View Beach — schmaler Sandstreifen an der Küste
const BEACH = {
  d: "M10 0L5.3125 1.43278L1.62947 4.19209L0 22.5902L1.62947 40.9872L3.97322 47.6102L9.66518 53V36.2992L10 0Z",
  transform: "translate(483 207)",
};

// Byron University — gestricheltes Highlight (Campus in Rivers Edge)
const BYRON = {
  d: "M23.1445 1.31364L35.3564 9.25253L54.3485 9.74645L57.5766 9.8304L65.1445 43.0766L48.1069 57.3136L29.1995 47.4429L7.51257 46.8789L1.14447 21.3136L11.5915 14.6712L23.1445 1.31364Z",
  transform: "translate(188.85 377.68)",
  lx: 201,
  ly: 404,
};

interface Pill {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const PILLS: Pill[] = [
  { key: "washington", label: "Washington D.C.", x: 179, y: 27, w: 192, h: 32 },
  { key: "rest", label: "Rest der Welt", x: 372, y: 613, w: 158, h: 32 },
];

// Byron: Ticker an der Campus-Ecke (unter dem Label läge er auf der Strichellinie)
const BYRON_TICKER = { x: 250, y: 386 };

// Bereiche, deren Ticker neben statt unter dem Label sitzt (innerhalb der Pill)
const PILL_BY_KEY = new Map(PILLS.map((p) => [p.key, p]));

type LabelBox = { x: number; y: number; width: number; height: number };

function fillFor(isSel: boolean) {
  return isSel ? "#2e2411" : "#2B2E27";
}
function strokeFor(isSel: boolean) {
  return isSel ? "var(--accent)" : "#445130";
}

export function EdenMap({
  selected,
  onSelect,
  areaStats,
}: {
  selected: string | null;
  onSelect: (key: string) => void;
  areaStats: Record<string, { active: number; total: number }>;
}) {
  // Ausgewählten Bezirk zuletzt zeichnen (Akzentrand vollständig sichtbar)
  const ordered = [...DISTRICTS].sort((a, b) =>
    a.key === selected ? 1 : b.key === selected ? -1 : 0,
  );
  const byronSel = selected === "byron";

  // Label-Maße (hängen von der geladenen Schrift ab) für die Ticker-Position messen
  const labelEls = useRef(new Map<string, SVGGraphicsElement>());
  const [boxes, setBoxes] = useState<Record<string, LabelBox>>({});
  const labelRef = (key: string) => (el: SVGGraphicsElement | null) => {
    if (el) labelEls.current.set(key, el);
    else labelEls.current.delete(key);
  };
  useEffect(() => {
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const next: Record<string, LabelBox> = {};
      labelEls.current.forEach((el, key) => {
        const b = el.getBBox();
        next[key] = { x: b.x, y: b.y, width: b.width, height: b.height };
      });
      setBoxes(next);
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <svg viewBox="0 0 608 654" className="map-free w-full h-auto select-none">
      {/* Unsichtbarer Hintergrund — die Karte liegt frei auf der Seite; die Fläche
          bleibt als klickbares "Umland" erhalten. */}
      <g onClick={() => onSelect("umland")} className="cursor-pointer">
        <rect x="0" y="0" width="608" height="654" fill="transparent" />
      </g>

      {/* Wasser: Potomac → Chesapeake Bay (dekorativ) */}
      {WATER.map((w, i) => (
        <g key={`water-${i}`} transform={w.transform} style={{ pointerEvents: "none" }}>
          <path d={w.d} fill={w.fill} stroke={w.stroke} strokeWidth={w.stroke ? 1 : undefined} />
        </g>
      ))}

      {/* Fluss-/Bay-Beschriftung */}
      <text
        x="530"
        y="92"
        fill="#4a6080"
        fontSize="12"
        textAnchor="middle"
        transform="rotate(-91.02 530 92)"
        style={{ letterSpacing: "2.5px", pointerEvents: "none" }}
      >
        POTOMAC RIVER
      </text>
      <text
        x="540"
        y="470"
        fill="#4a6080"
        fontSize="12"
        textAnchor="middle"
        transform="rotate(-90 540 470)"
        style={{ letterSpacing: "2.5px", pointerEvents: "none" }}
      >
        CHESAPEAKE BAY
      </text>

      {/* Umland-Label (Bereich = Frame-Hintergrund) */}
      <text ref={labelRef("umland")} x="63" y="408" fill="#808080" fontSize="12" className="pointer-events-none">
        Umland
      </text>

      {/* Bezirke */}
      {ordered.map((d) => {
        const isSel = selected === d.key;
        return (
          <g key={d.key} onClick={() => onSelect(d.key)} className="cursor-pointer">
            <g transform={d.transform}>
              <path
                d={d.d}
                fill={fillFor(isSel)}
                stroke={strokeFor(isSel)}
                strokeWidth={isSel ? 2 : 1.5}
                strokeLinejoin="round"
                className="transition-all duration-150"
              />
            </g>
            <g
              ref={labelRef(d.key)}
              fill={isSel ? "var(--text-primary)" : "#b8c4a0"}
              fontSize="12"
              className="pointer-events-none"
            >
              <text x={d.lx} y={d.ly}>
                {d.label}
              </text>
              {d.label2 && (
                <text x={d.lx} y={d.ly + 14}>
                  {d.label2}
                </text>
              )}
            </g>
          </g>
        );
      })}

      {/* Belle View Beach — Sandstreifen */}
      <g transform={BEACH.transform} style={{ pointerEvents: "none" }}>
        <path d={BEACH.d} fill="#7F8263" />
      </g>

      {/* Byron University — gestrichelter Campus (klickbar) */}
      <g onClick={() => onSelect("byron")} className="cursor-pointer">
        <g transform={BYRON.transform}>
          <path
            d={BYRON.d}
            fill={byronSel ? "rgba(232,117,32,0.12)" : "transparent"}
            stroke="#e87520"
            strokeWidth={byronSel ? 2.6 : 2}
            strokeDasharray="7 4"
            strokeLinejoin="round"
            className="transition-all duration-150"
          />
        </g>
        <text x={BYRON.lx} y={BYRON.ly} fill="#b8c4a0" fontSize="12" className="pointer-events-none">
          Byron
        </text>
        <text x={BYRON.lx} y={BYRON.ly + 14} fill="#b8c4a0" fontSize="12" className="pointer-events-none">
          University
        </text>
      </g>

      {/* Washington D.C. — Nordpfeil */}
      <g onClick={() => onSelect("washington")} className="cursor-pointer">
        <path
          d="M4.65118 18.5117V1.51167M8.65118 8.51167L4.65118 1.51167L0.651182 8.51167"
          transform="translate(270.35 4.36)"
          stroke="#9E9E9E"
          strokeWidth="1.5"
          fill="none"
          style={{ pointerEvents: "none" }}
        />
        <ExternalPill p={PILLS[0]} selected={selected === "washington"} labelRef={labelRef("washington")} />
      </g>

      {/* Rest der Welt */}
      <g onClick={() => onSelect("rest")} className="cursor-pointer">
        <ExternalPill p={PILLS[1]} selected={selected === "rest"} labelRef={labelRef("rest")} />
      </g>

      {/* Aktive Szenen pro Bereich — zuletzt gezeichnet, damit nichts sie verdeckt */}
      {Object.entries(boxes).map(([key, b]) => {
        const pill = PILL_BY_KEY.get(key);
        const count = areaStats[key]?.active ?? 0;
        return pill ? (
          <Ticker key={key} x={b.x + b.width + 16} y={pill.y + pill.h / 2} count={count} />
        ) : (
          <Ticker key={key} x={b.x + b.width / 2} y={b.y + b.height + 12} count={count} />
        );
      })}
      <Ticker x={BYRON_TICKER.x} y={BYRON_TICKER.y} count={areaStats["byron"]?.active ?? 0} />
    </svg>
  );
}

// Runder oranger Zähler aktiver Szenen; der Ring dahinter pulsiert langsam (globals.css).
function Ticker({ x, y, count }: { x: number; y: number; count: number }) {
  if (count <= 0) return null;
  return (
    <g className="pointer-events-none">
      <title>{`${count} aktive ${count === 1 ? "Szene" : "Szenen"}`}</title>
      <circle cx={x} cy={y} r="9" fill="var(--accent)" className="map-ticker-pulse" />
      <circle cx={x} cy={y} r="9" fill="var(--accent)" />
      <text x={x} y={y + 3.8} textAnchor="middle" fontSize="11" fontWeight="700" fill="#14100a">
        {count}
      </text>
    </g>
  );
}

function ExternalPill({
  p,
  selected,
  labelRef,
}: {
  p: Pill;
  selected: boolean;
  labelRef: (el: SVGGraphicsElement | null) => void;
}) {
  return (
    <>
      <rect
        x={p.x}
        y={p.y}
        width={p.w}
        height={p.h}
        rx={16}
        fill={selected ? "rgba(232,154,60,0.18)" : "#1e1e23"}
        stroke={selected ? "var(--accent)" : "#4f4f54"}
        strokeWidth="1"
        className="transition-all hover:stroke-white/60"
      />
      <circle cx={p.x + 16} cy={p.y + p.h / 2} r="3" fill="#9E9E9E" />
      <text ref={labelRef} x={p.x + 27} y={p.y + p.h / 2 + 4} fill={selected ? "var(--accent)" : "#dedede"} fontSize="12" className="pointer-events-none">
        {p.label}
      </text>
    </>
  );
}
