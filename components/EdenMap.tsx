"use client";

import { AREAS } from "@/lib/world";

// Handgezeichnete (statische) SVG-Karte von Eden, Virginia — organische Formen.
// Klickbare Bezirke + Byron-Area + Umland + externe Orte (D.C., Rest der Welt).
// Beim Klick poppt eine Kurzbeschreibung auf.

interface Shape {
  key: string;
  label: string;
  path: string;
  anchor: [number, number];
}

// Bezirke (organische Bezier-Flächen). Belle View am Fluss, Oak Hill landeinwärts,
// Byron zentral, Orchid Valley läuft nordwestlich in die Natur aus.
const DISTRICTS: Shape[] = [
  {
    key: "orchid_valley",
    label: "Orchid Valley",
    path: "M60,100 C40,66 96,52 150,58 C232,66 322,56 334,112 C344,160 312,198 244,208 C160,216 84,206 58,176 C42,154 50,120 60,100 Z",
    anchor: [188, 132],
  },
  {
    key: "oak_hill",
    label: "Oak Hill",
    path: "M350,104 C366,80 436,72 506,86 C550,96 562,134 538,168 C512,198 432,202 372,190 C336,180 332,132 350,104 Z",
    anchor: [444, 138],
  },
  {
    key: "byron",
    label: "Byron University",
    path: "M306,248 C330,222 424,226 482,244 C522,258 526,316 484,346 C432,376 350,368 316,338 C288,314 286,270 306,248 Z",
    anchor: [398, 296],
  },
  {
    key: "westridge",
    label: "Westridge",
    path: "M60,258 C44,296 50,366 98,402 C154,432 234,420 274,380 C298,350 288,292 246,264 C190,238 100,236 60,258 Z",
    anchor: [165, 334],
  },
  {
    key: "belle_view",
    label: "Belle View",
    path: "M528,200 C580,190 634,208 638,270 C642,342 630,418 588,460 C560,428 526,408 516,360 C506,304 510,242 528,200 Z",
    anchor: [576, 330],
  },
  {
    key: "rivers_edge",
    label: "Rivers Edge",
    path: "M300,360 C362,348 474,358 524,398 C580,440 604,502 564,562 C512,608 400,602 330,582 C286,568 272,504 284,448 C290,402 294,376 300,360 Z",
    anchor: [398, 480],
  },
];

interface Marker {
  key: string;
  label: string;
  x: number;
  y: number;
}

const EXTERNAL: Marker[] = [
  { key: "washington", label: "Washington D.C.", x: 392, y: 40 },
  { key: "rest", label: "Rest der Welt", x: 108, y: 632 },
];

const POPUP_EXTRA: Record<string, { name: string; text: string }> = {
  rest: {
    name: "Rest der Welt",
    text:
      "Alles jenseits von Eden und D.C. — Reisen, Rückblenden, ferne Orte. Für Szenen, die nirgendwo sonst hingehören.",
  },
};

function describe(key: string): { name: string; text: string } | null {
  const a = AREAS[key as keyof typeof AREAS];
  if (a) return { name: a.name, text: a.character };
  return POPUP_EXTRA[key] ?? null;
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
  const popup = selected ? describe(selected) : null;
  const selShape = DISTRICTS.find((d) => d.key === selected);
  const selMarker = EXTERNAL.find((m) => m.key === selected);
  const popAnchor: [number, number] | null = selShape
    ? selShape.anchor
    : selMarker
      ? [selMarker.x, selMarker.y + 16]
      : selected === "umland"
        ? [120, 250]
        : null;

  const PW = 230;
  const PH = 96;
  const px = popAnchor ? Math.min(Math.max(popAnchor[0] - PW / 2, 8), 760 - PW - 8) : 0;
  const py = popAnchor ? Math.min(Math.max(popAnchor[1] + 10, 8), 660 - PH - 8) : 0;

  return (
    <svg viewBox="0 0 760 660" className="w-full h-auto select-none" style={{ maxHeight: 720 }}>
      <rect x="0" y="0" width="760" height="660" rx="10" fill="var(--bg-surface)" />

      {/* Umland (Natur) — klickbare Hintergrundfläche */}
      <g onClick={() => onSelect("umland")} className="cursor-pointer">
        <path
          d="M34,130 C22,64 130,40 270,44 C410,48 520,40 596,78 C642,102 646,168 642,240 C638,330 648,408 636,478 C626,552 596,606 512,620 C372,636 228,632 128,602 C58,580 38,502 36,402 C34,302 40,200 34,130 Z"
          fill={selected === "umland" ? "rgba(232,154,60,0.08)" : "rgba(120,135,90,0.07)"}
          stroke={selected === "umland" ? "var(--accent)" : "rgba(120,135,90,0.28)"}
          strokeWidth="1"
        />
        <text
          x="96"
          y="250"
          fill="var(--text-tertiary)"
          fontSize="12"
          fontFamily="var(--font-display), serif"
          className="pointer-events-none"
          transform="rotate(-18 96 250)"
        >
          Umland
        </text>
      </g>

      {/* Potomac River + Bucht */}
      <path
        d="M596,30 L596,78 C642,102 646,168 642,240 C638,330 648,408 636,478 C626,552 596,606 512,620 L760,660 L760,30 Z"
        fill="rgba(80,120,160,0.16)"
        stroke="rgba(120,160,200,0.26)"
        strokeWidth="1"
      />
      <text
        x="700"
        y="300"
        fill="var(--text-tertiary)"
        fontSize="11"
        textAnchor="middle"
        transform="rotate(90 700 300)"
        style={{ letterSpacing: "3px" }}
        className="pointer-events-none"
      >
        POTOMAC RIVER
      </text>
      <text
        x="648"
        y="606"
        fill="rgba(120,160,200,0.7)"
        fontSize="11"
        fontFamily="var(--font-display), serif"
        className="pointer-events-none"
      >
        Die Bucht
      </text>

      {/* Bezirke */}
      {DISTRICTS.map((d) => {
        const isSel = selected === d.key;
        const stat = areaStats[d.key] ?? { active: 0, total: 0 };
        const played = stat.total > 0;
        const fill = isSel
          ? "rgba(232,154,60,0.16)"
          : played
            ? "rgba(163,163,128,0.10)"
            : "rgba(255,255,255,0.025)";
        return (
          <g key={d.key} onClick={() => onSelect(d.key)} className="cursor-pointer">
            <path
              d={d.path}
              fill={fill}
              stroke={isSel ? "var(--accent)" : played ? "rgba(163,163,128,0.45)" : "var(--border-strong)"}
              strokeWidth={isSel ? 2 : 1.2}
              className="transition-all duration-150 hover:fill-white/[0.06]"
            />
            <text
              x={d.anchor[0]}
              y={d.anchor[1]}
              fill="var(--text-primary)"
              fontSize="14"
              fontFamily="var(--font-display), serif"
              textAnchor="middle"
              className="pointer-events-none"
            >
              {d.label}
            </text>
            {stat.active > 0 && (
              <text
                x={d.anchor[0]}
                y={d.anchor[1] + 17}
                fill="var(--accent)"
                fontSize="10"
                textAnchor="middle"
                className="pointer-events-none"
              >
                ▲ {stat.active} aktiv
              </text>
            )}
          </g>
        );
      })}

      {/* Downtown — Landmarke */}
      <text
        x="430"
        y="234"
        fill="var(--text-tertiary)"
        fontSize="9"
        textAnchor="middle"
        style={{ letterSpacing: "2px" }}
        className="pointer-events-none uppercase"
      >
        · Downtown ·
      </text>

      {/* Washington D.C. — Pfeil nach Norden + größerer Marker */}
      <g onClick={() => onSelect("washington")} className="cursor-pointer">
        <line x1="392" y1="30" x2="392" y2="6" stroke="var(--text-tertiary)" strokeWidth="1.4" />
        <path d="M392,2 L388,12 L396,12 Z" fill="var(--text-tertiary)" />
        <ExternalPill x={EXTERNAL[0].x} y={EXTERNAL[0].y} label={EXTERNAL[0].label} selected={selected === "washington"} active={(areaStats["washington"]?.active ?? 0) > 0} />
      </g>

      {/* Rest der Welt — größerer Marker */}
      <g onClick={() => onSelect("rest")} className="cursor-pointer">
        <ExternalPill x={EXTERNAL[1].x} y={EXTERNAL[1].y} label={EXTERNAL[1].label} selected={selected === "rest"} active={(areaStats["rest"]?.active ?? 0) > 0} />
      </g>

      {/* Popup mit Kurzbeschreibung */}
      {popup && popAnchor && (
        <foreignObject x={px} y={py} width={PW} height={PH}>
          <div
            style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--accent)",
              borderRadius: 10,
              padding: "10px 12px",
              boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: 16,
                color: "var(--accent)",
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              {popup.name}
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.45, color: "var(--text-secondary)" }}>
              {popup.text}
            </div>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

function ExternalPill({
  x,
  y,
  label,
  selected,
  active,
}: {
  x: number;
  y: number;
  label: string;
  selected: boolean;
  active: boolean;
}) {
  const w = label.length * 7.2 + 30;
  return (
    <>
      <rect
        x={x - w / 2}
        y={y - 13}
        width={w}
        height={26}
        rx={13}
        fill={selected ? "rgba(232,154,60,0.2)" : "rgba(0,0,0,0.5)"}
        stroke={selected ? "var(--accent)" : "var(--border-strong)"}
        strokeWidth="1.2"
        strokeDasharray="4 2.5"
        className="transition-all hover:stroke-white/50"
      />
      <circle cx={x - w / 2 + 13} cy={y} r="3" fill={active ? "var(--accent)" : "var(--text-tertiary)"} />
      <text
        x={x + 7}
        y={y + 4}
        fill={selected ? "var(--accent)" : "var(--text-secondary)"}
        fontSize="12"
        textAnchor="middle"
        className="pointer-events-none"
      >
        {label}
      </text>
    </>
  );
}
