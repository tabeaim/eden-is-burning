"use client";

// Handgezeichnete (statische) SVG-Karte von Eden, Virginia.
// Eckige, aber unregelmäßige Bezirksformen (kleine Ecken & Kanten wie echte
// Stadtviertel), realistischer Stadtumriss, Downtown + Umland als Areas, der
// Potomac mündet in die Chesapeake Bay. Leicht rausgezoomt.

interface Shape {
  key: string;
  label: string;
  points: string;
  anchor: [number, number];
}

// Bezirke als unregelmäßige Polygone (viewBox 860x720). Belle View am Fluss,
// Oak Hill landeinwärts, Byron & Downtown zentral, Orchid Valley läuft ins Umland.
const DISTRICTS: Shape[] = [
  {
    key: "orchid_valley",
    label: "Orchid Valley",
    points: "176,182 196,150 244,138 286,150 308,140 312,196 300,236 250,254 206,250 184,232 168,210",
    anchor: [236, 198],
  },
  {
    key: "oak_hill",
    label: "Oak Hill",
    points: "312,140 362,128 404,138 432,128 460,168 452,206 392,222 332,212 314,192 308,162",
    anchor: [386, 178],
  },
  {
    key: "belle_view",
    label: "Belle View",
    points: "460,168 500,156 526,176 544,212 538,268 552,322 528,378 500,372 484,322 470,262 462,210",
    anchor: [508, 268],
  },
  {
    key: "byron",
    label: "Byron Univ.",
    points: "300,236 312,196 332,212 392,222 452,206 470,262 452,300 384,312 322,302 302,272",
    anchor: [388, 262],
  },
  {
    key: "downtown",
    label: "Downtown",
    points: "322,302 384,312 452,300 470,262 484,322 466,356 440,386 372,392 326,378 312,344",
    anchor: [392, 340],
  },
  {
    key: "rivers_edge",
    label: "Rivers Edge",
    points: "312,344 326,378 372,392 440,386 466,356 500,372 510,418 488,476 412,512 338,498 300,448 296,396",
    anchor: [396, 440],
  },
  {
    key: "westridge",
    label: "Westridge",
    points: "168,210 184,232 206,250 250,254 300,236 302,272 312,344 296,396 300,448 256,468 186,452 156,392 150,300 158,250",
    anchor: [212, 350],
  },
];

interface Marker {
  key: string;
  label: string;
  x: number;
  y: number;
}

const EXTERNAL: Marker[] = [
  { key: "washington", label: "Washington D.C.", x: 300, y: 44 },
  { key: "rest", label: "Rest der Welt", x: 120, y: 688 },
];

// Stadtumriss (grobe Außenkante der Bezirke) — für die Silhouette Edens
const CITY_OUTLINE =
  "176,182 196,150 244,138 286,150 308,140 312,140 362,128 404,138 432,128 460,168 500,156 526,176 544,212 538,268 552,322 528,378 510,418 488,476 412,512 338,498 256,468 186,452 156,392 150,300 158,250 168,210";

export function EdenMap({
  selected,
  onSelect,
  areaStats,
}: {
  selected: string | null;
  onSelect: (key: string) => void;
  areaStats: Record<string, { active: number; total: number }>;
}) {
  return (
    <svg viewBox="0 0 860 720" className="w-full h-auto select-none" style={{ maxHeight: 720 }}>
      <rect x="0" y="0" width="860" height="720" rx="10" fill="var(--bg-surface)" />

      {/* Umland (Natur) — klickbarer Hintergrund */}
      <g onClick={() => onSelect("umland")} className="cursor-pointer">
        <rect
          x="6"
          y="6"
          width="848"
          height="708"
          rx="8"
          fill={selected === "umland" ? "rgba(232,154,60,0.06)" : "rgba(120,135,90,0.06)"}
        />
        <text
          x="74"
          y="120"
          fill="var(--text-tertiary)"
          fontSize="13"
          fontFamily="var(--font-display), serif"
          transform="rotate(-16 74 120)"
        >
          Umland
        </text>
        <text x="700" y="150" fill="var(--text-tertiary)" fontSize="13" fontFamily="var(--font-display), serif">
          Umland
        </text>
      </g>

      {/* Potomac River, der in die Chesapeake Bay mündet (visuell) */}
      <path
        d="M500,156 L526,176 544,212 538,268 552,322 528,378 510,418 488,476 412,512 338,498 380,640 620,712 860,712 860,120 600,128 540,148 Z"
        fill="rgba(80,120,160,0.16)"
        stroke="rgba(120,160,200,0.24)"
        strokeWidth="1"
        style={{ pointerEvents: "none" }}
      />
      <text
        x="612"
        y="250"
        fill="var(--text-tertiary)"
        fontSize="11"
        textAnchor="middle"
        transform="rotate(58 612 250)"
        style={{ letterSpacing: "2px", pointerEvents: "none" }}
      >
        POTOMAC RIVER
      </text>
      <text
        x="640"
        y="560"
        fill="rgba(120,160,200,0.75)"
        fontSize="15"
        fontFamily="var(--font-display), serif"
        textAnchor="middle"
        style={{ pointerEvents: "none" }}
      >
        Chesapeake Bay
      </text>

      {/* Stadtumriss */}
      <polygon
        points={CITY_OUTLINE}
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="2"
        style={{ pointerEvents: "none" }}
      />

      {/* Bezirke */}
      {DISTRICTS.map((d) => {
        const isSel = selected === d.key;
        const stat = areaStats[d.key] ?? { active: 0, total: 0 };
        const played = stat.total > 0;
        const fill = isSel
          ? "rgba(232,154,60,0.18)"
          : played
            ? "rgba(163,163,128,0.12)"
            : "rgba(255,255,255,0.03)";
        return (
          <g key={d.key} onClick={() => onSelect(d.key)} className="cursor-pointer">
            <polygon
              points={d.points}
              fill={fill}
              stroke={isSel ? "var(--accent)" : played ? "rgba(163,163,128,0.5)" : "var(--border-strong)"}
              strokeWidth={isSel ? 2 : 1.2}
              strokeLinejoin="round"
              className="transition-all duration-150 hover:fill-white/[0.06]"
            />
            <text
              x={d.anchor[0]}
              y={d.anchor[1]}
              fill="var(--text-primary)"
              fontSize="13"
              fontFamily="var(--font-display), serif"
              textAnchor="middle"
              className="pointer-events-none"
            >
              {d.label}
            </text>
            {stat.active > 0 && (
              <text
                x={d.anchor[0]}
                y={d.anchor[1] + 16}
                fill="var(--accent)"
                fontSize="10"
                textAnchor="middle"
                className="pointer-events-none"
              >
                ▲ {stat.active}
              </text>
            )}
          </g>
        );
      })}

      {/* Washington D.C. — Nordpfeil + größerer Marker */}
      <g onClick={() => onSelect("washington")} className="cursor-pointer">
        <line x1={EXTERNAL[0].x} y1="30" x2={EXTERNAL[0].x} y2="8" stroke="var(--text-tertiary)" strokeWidth="1.4" />
        <path d={`M${EXTERNAL[0].x},4 L${EXTERNAL[0].x - 4},14 L${EXTERNAL[0].x + 4},14 Z`} fill="var(--text-tertiary)" />
        <ExternalPill m={EXTERNAL[0]} selected={selected === "washington"} active={(areaStats["washington"]?.active ?? 0) > 0} />
      </g>

      {/* Rest der Welt */}
      <g onClick={() => onSelect("rest")} className="cursor-pointer">
        <ExternalPill m={EXTERNAL[1]} selected={selected === "rest"} active={(areaStats["rest"]?.active ?? 0) > 0} />
      </g>
    </svg>
  );
}

function ExternalPill({
  m,
  selected,
  active,
}: {
  m: Marker;
  selected: boolean;
  active: boolean;
}) {
  const w = m.label.length * 7.4 + 32;
  return (
    <>
      <rect
        x={m.x - w / 2}
        y={m.y - 14}
        width={w}
        height={28}
        rx={14}
        fill={selected ? "rgba(232,154,60,0.2)" : "rgba(0,0,0,0.5)"}
        stroke={selected ? "var(--accent)" : "var(--border-strong)"}
        strokeWidth="1.2"
        strokeDasharray="4 2.5"
        className="transition-all hover:stroke-white/50"
      />
      <circle cx={m.x - w / 2 + 14} cy={m.y} r="3" fill={active ? "var(--accent)" : "var(--text-tertiary)"} />
      <text x={m.x + 8} y={m.y + 4} fill={selected ? "var(--accent)" : "var(--text-secondary)"} fontSize="12.5" textAnchor="middle" className="pointer-events-none">
        {m.label}
      </text>
    </>
  );
}
