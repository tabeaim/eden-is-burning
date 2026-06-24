"use client";

// Handgezeichnete (statische) SVG-Karte von Eden, Virginia.
// Eckige, unregelmäßige Bezirke (an echten Stadtvierteln orientiert), die sich
// leicht überlappen -> keine Lücken. Deckende Füllungen. Der Potomac kommt von
// oben und weitet sich unten zur angedeuteten Chesapeake Bay.

interface Shape {
  key: string;
  label: string;
  points: string;
  anchor: [number, number];
}

const DISTRICTS: Shape[] = [
  {
    key: "orchid_valley",
    label: "Orchid Valley",
    points: "95,150 200,95 300,100 308,200 250,238 150,232 100,250",
    anchor: [196, 168],
  },
  {
    key: "oak_hill",
    label: "Oak Hill",
    points: "300,100 395,110 470,160 458,228 360,238 305,200",
    anchor: [378, 174],
  },
  {
    key: "belle_view",
    label: "Belle View",
    points: "458,224 470,160 486,262 460,348 410,360 398,268 412,222",
    anchor: [438, 268],
  },
  {
    key: "byron",
    label: "Byron",
    points: "300,250 312,205 362,232 408,288 360,322 310,300",
    anchor: [344, 266],
  },
  {
    key: "downtown",
    label: "Downtown",
    points: "270,348 300,255 312,300 362,322 410,360 365,402 300,398",
    anchor: [336, 344],
  },
  {
    key: "westridge",
    label: "Westridge",
    points: "98,262 100,248 150,232 250,238 300,252 270,348 300,398 252,430 150,418 126,360",
    anchor: [186, 330],
  },
  {
    key: "rivers_edge",
    label: "Rivers Edge",
    points: "268,442 270,346 300,398 365,402 412,360 460,348 416,422 360,458",
    anchor: [352, 412],
  },
];

interface Marker {
  key: string;
  label: string;
  x: number;
  y: number;
}

const EXTERNAL: Marker[] = [
  { key: "washington", label: "Washington D.C.", x: 232, y: 40 },
  { key: "rest", label: "Rest der Welt", x: 96, y: 474 },
];

const CITY_OUTLINE =
  "95,150 200,95 300,100 395,110 470,160 486,262 460,348 416,422 360,458 268,442 150,418 126,360 98,262";

function fillFor(isSel: boolean, played: boolean) {
  if (isSel) return "#241a10";
  if (played) return "#1c1d17";
  return "#15151c";
}
function strokeFor(isSel: boolean, played: boolean) {
  if (isSel) return "var(--accent)";
  if (played) return "rgba(163,163,128,0.5)";
  return "rgba(255,255,255,0.14)";
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

  return (
    <svg viewBox="0 0 580 500" className="w-full h-auto select-none" style={{ maxHeight: 640 }}>
      <rect x="0" y="0" width="580" height="500" rx="10" fill="var(--bg-surface)" />

      {/* Umland (Natur) — klickbarer Hintergrund, nur rund um die Stadt */}
      <g onClick={() => onSelect("umland")} className="cursor-pointer">
        <rect
          x="6"
          y="6"
          width="568"
          height="488"
          rx="8"
          fill={selected === "umland" ? "rgba(232,154,60,0.06)" : "rgba(120,135,90,0.07)"}
        />
        <text x="34" y="80" fill="var(--text-tertiary)" fontSize="13" fontFamily="var(--font-display), serif" transform="rotate(-14 34 80)">
          Umland
        </text>
      </g>

      {/* Potomac -> Chesapeake Bay (schmal, nur angedeutet) */}
      <path
        d="M468,60 L470,160 486,262 460,348 420,420 404,500 580,500 580,60 Z"
        fill="rgba(80,120,160,0.16)"
        stroke="rgba(120,160,200,0.22)"
        strokeWidth="1"
        style={{ pointerEvents: "none" }}
      />
      <text
        x="528"
        y="180"
        fill="var(--text-tertiary)"
        fontSize="10"
        textAnchor="middle"
        transform="rotate(74 528 180)"
        style={{ letterSpacing: "2px", pointerEvents: "none" }}
      >
        POTOMAC
      </text>
      <text x="510" y="450" fill="rgba(120,160,200,0.75)" fontSize="12" fontFamily="var(--font-display), serif" textAnchor="middle" style={{ pointerEvents: "none" }}>
        Chesapeake Bay
      </text>

      {/* Stadt-Silhouette: deckt das Umland unter der Stadt ab, sodass Lücken
          zwischen Bezirken dunkel statt grün erscheinen */}
      <polygon points={CITY_OUTLINE} fill="var(--bg-primary)" stroke="rgba(255,255,255,0.16)" strokeWidth="2" strokeLinejoin="round" style={{ pointerEvents: "none" }} />

      {/* Bezirke (deckend, leicht überlappend) */}
      {ordered.map((d) => {
        const isSel = selected === d.key;
        const stat = areaStats[d.key] ?? { active: 0, total: 0 };
        const played = stat.total > 0;
        return (
          <g key={d.key} onClick={() => onSelect(d.key)} className="cursor-pointer">
            <polygon
              points={d.points}
              fill={fillFor(isSel, played)}
              stroke={strokeFor(isSel, played)}
              strokeWidth={isSel ? 2 : 1.2}
              strokeLinejoin="round"
              className="transition-all duration-150"
            />
            <text x={d.anchor[0]} y={d.anchor[1]} fill="var(--text-primary)" fontSize="13" fontFamily="var(--font-display), serif" textAnchor="middle" className="pointer-events-none">
              {d.label}
            </text>
            {stat.active > 0 && (
              <text x={d.anchor[0]} y={d.anchor[1] + 16} fill="var(--accent)" fontSize="10" textAnchor="middle" className="pointer-events-none">
                ▲ {stat.active}
              </text>
            )}
          </g>
        );
      })}

      {/* Washington D.C. — Nordpfeil + präsenter Marker */}
      <g onClick={() => onSelect("washington")} className="cursor-pointer">
        <line x1={EXTERNAL[0].x} y1="28" x2={EXTERNAL[0].x} y2="8" stroke="var(--text-secondary)" strokeWidth="1.6" />
        <path d={`M${EXTERNAL[0].x},3 L${EXTERNAL[0].x - 5},14 L${EXTERNAL[0].x + 5},14 Z`} fill="var(--text-secondary)" />
        <ExternalPill m={EXTERNAL[0]} selected={selected === "washington"} active={(areaStats["washington"]?.active ?? 0) > 0} />
      </g>

      {/* Rest der Welt */}
      <g onClick={() => onSelect("rest")} className="cursor-pointer">
        <ExternalPill m={EXTERNAL[1]} selected={selected === "rest"} active={(areaStats["rest"]?.active ?? 0) > 0} />
      </g>
    </svg>
  );
}

function ExternalPill({ m, selected, active }: { m: Marker; selected: boolean; active: boolean }) {
  const w = m.label.length * 8 + 38;
  return (
    <>
      <rect
        x={m.x - w / 2}
        y={m.y - 16}
        width={w}
        height={32}
        rx={9}
        fill={selected ? "rgba(232,154,60,0.22)" : "rgba(12,12,16,0.82)"}
        stroke={selected ? "var(--accent)" : "var(--border-strong)"}
        strokeWidth="1.5"
        className="transition-all hover:stroke-white/60"
      />
      <circle cx={m.x - w / 2 + 16} cy={m.y} r="3.5" fill={active ? "var(--accent)" : "var(--text-secondary)"} />
      <text x={m.x + 9} y={m.y + 4.5} fill={selected ? "var(--accent)" : "var(--text-primary)"} fontSize="13.5" textAnchor="middle" className="pointer-events-none">
        {m.label}
      </text>
    </>
  );
}
