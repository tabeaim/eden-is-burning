"use client";

import type { AreaKey } from "@/lib/world";

// Handgezeichnete (statische) SVG-Karte von Eden, Virginia.
// Klickbare Bezirke + Landmarken (Byron, Sutton) + externe Orte (D.C., Rest der Welt).

interface District {
  key: AreaKey;
  label: string;
  path: string;
  labelXY: [number, number];
}

// Geografie: Belle View hugt den Potomac (Ostseite), darunter ein Stück Rivers
// Edge bis zum Fluss; Westridge westlich neben Rivers Edge; Oak Hill nordöstlich;
// Orchid Valley großflächig nordwestlich. Downtown mittig als Landmarke.
const DISTRICTS: District[] = [
  {
    key: "orchid_valley",
    label: "Orchid Valley",
    path: "M40,46 L360,40 L350,212 L52,202 Z",
    labelXY: [195, 120],
  },
  {
    key: "oak_hill",
    label: "Oak Hill",
    path: "M360,40 L630,48 L632,205 L350,212 Z",
    labelXY: [495, 120],
  },
  {
    key: "westridge",
    label: "Westridge",
    path: "M52,202 L350,212 L340,432 L66,440 Z",
    labelXY: [195, 320],
  },
  {
    key: "belle_view",
    label: "Belle View",
    path: "M490,220 L632,205 L640,452 L495,432 Z",
    labelXY: [565, 320],
  },
  {
    key: "rivers_edge",
    label: "Rivers Edge",
    path: "M350,212 L490,220 L495,432 L640,452 L645,556 L356,560 L340,432 Z",
    labelXY: [430, 330],
  },
];

interface Marker {
  key: string;
  label: string;
  x: number;
  y: number;
  external?: boolean;
}

const MARKERS: Marker[] = [
  { key: "byron", label: "Byron University", x: 470, y: 165 },
  { key: "sutton", label: "Sutton Academy", x: 175, y: 250 },
  { key: "washington", label: "Washington D.C.", x: 360, y: 16, external: true },
  { key: "rest", label: "Rest der Welt", x: 86, y: 590, external: true },
];

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
    <svg
      viewBox="0 0 720 610"
      className="w-full h-auto select-none"
      style={{ maxHeight: 680 }}
    >
      {/* Hintergrund */}
      <rect x="0" y="0" width="720" height="610" rx="10" fill="var(--bg-surface)" />

      {/* Potomac River (Osten) */}
      <path
        d="M648,30 C668,120 636,210 660,320 C678,410 646,500 664,610 L720,610 L720,30 Z"
        fill="rgba(80,120,160,0.16)"
        stroke="rgba(120,160,200,0.28)"
        strokeWidth="1"
      />
      <text
        x="690"
        y="320"
        fill="var(--text-tertiary)"
        fontSize="11"
        textAnchor="middle"
        transform="rotate(90 690 320)"
        style={{ letterSpacing: "3px" }}
      >
        POTOMAC RIVER
      </text>

      {/* Bezirke */}
      {DISTRICTS.map((d) => {
        const isSel = selected === d.key;
        const stat = areaStats[d.key] ?? { active: 0, total: 0 };
        const played = stat.total > 0;
        const fill = isSel
          ? "rgba(232,154,60,0.14)"
          : played
            ? "rgba(163,163,128,0.08)"
            : "rgba(255,255,255,0.02)";
        return (
          <g key={d.key} onClick={() => onSelect(d.key)} className="cursor-pointer">
            <path
              d={d.path}
              fill={fill}
              stroke={
                isSel ? "var(--accent)" : played ? "rgba(163,163,128,0.4)" : "var(--border)"
              }
              strokeWidth={isSel ? 2 : 1}
              className="transition-all duration-150 hover:fill-white/[0.06]"
            />
            <text
              x={d.labelXY[0]}
              y={d.labelXY[1]}
              fill="var(--text-primary)"
              fontSize="15"
              fontFamily="var(--font-display), serif"
              textAnchor="middle"
              className="pointer-events-none"
            >
              {d.label}
            </text>
            {/* Flamme bei aktiven Szenen */}
            {stat.active > 0 && (
              <text
                x={d.labelXY[0]}
                y={d.labelXY[1] + 18}
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

      {/* Downtown — nur Landmarke, nicht klickbar */}
      <text
        x="430"
        y="250"
        fill="var(--text-tertiary)"
        fontSize="10"
        textAnchor="middle"
        style={{ letterSpacing: "2px" }}
        className="pointer-events-none uppercase"
      >
        · Downtown ·
      </text>

      {/* Landmarken + externe Orte */}
      {MARKERS.map((m) => {
        const isSel = selected === m.key;
        const stat = areaStats[m.key] ?? { active: 0, total: 0 };
        const w = m.label.length * 6.4 + 22;
        return (
          <g key={m.key} onClick={() => onSelect(m.key)} className="cursor-pointer">
            <rect
              x={m.x - w / 2}
              y={m.y - 11}
              width={w}
              height={22}
              rx={11}
              fill={isSel ? "rgba(232,154,60,0.18)" : "rgba(0,0,0,0.45)"}
              stroke={isSel ? "var(--accent)" : "var(--border-strong)"}
              strokeWidth="1"
              strokeDasharray={m.external ? "3 2" : "0"}
              className="transition-all hover:stroke-white/40"
            />
            <circle
              cx={m.x - w / 2 + 11}
              cy={m.y}
              r="2.5"
              fill={stat.active > 0 ? "var(--accent)" : "var(--text-tertiary)"}
            />
            <text
              x={m.x + 6}
              y={m.y + 3.5}
              fill={isSel ? "var(--accent)" : "var(--text-secondary)"}
              fontSize="10.5"
              textAnchor="middle"
              className="pointer-events-none"
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
