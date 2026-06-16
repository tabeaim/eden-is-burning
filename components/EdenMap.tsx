"use client";

import type { AreaKey } from "@/lib/world";

// Handgezeichnete (statische) SVG-Karte von Eden, Virginia.
// 5 klickbare Bezirke + Potomac River. Keine Tiles, kein Leaflet.

interface District {
  key: AreaKey;
  label: string;
  path: string;
  labelXY: [number, number];
}

const DISTRICTS: District[] = [
  {
    key: "orchid_valley",
    label: "Orchid Valley",
    path: "M30,30 L300,30 L290,150 L150,180 L40,150 Z",
    labelXY: [150, 95],
  },
  {
    key: "westridge",
    label: "Westridge",
    path: "M40,150 L150,180 L160,280 L40,290 Z",
    labelXY: [95, 225],
  },
  {
    key: "oak_hill",
    label: "Oak Hill",
    path: "M300,30 L420,40 L430,200 L290,210 L290,150 Z",
    labelXY: [360, 120],
  },
  {
    key: "rivers_edge",
    label: "Rivers Edge",
    path: "M150,180 L290,150 L290,210 L300,320 L160,330 L160,280 Z",
    labelXY: [225, 250],
  },
  {
    key: "belle_view",
    label: "Belle View",
    path: "M290,210 L430,200 L440,360 L300,360 L300,320 Z",
    labelXY: [365, 290],
  },
];

export function EdenMap({
  selected,
  onSelect,
  activeCounts,
}: {
  selected: AreaKey | null;
  onSelect: (key: AreaKey) => void;
  activeCounts: Record<string, number>;
}) {
  return (
    <svg
      viewBox="0 0 500 400"
      className="w-full h-auto select-none"
      style={{ maxHeight: 520 }}
    >
      {/* Hintergrund */}
      <rect x="0" y="0" width="500" height="400" fill="var(--bg-surface)" />

      {/* Potomac River (Osten) */}
      <path
        d="M455,10 C470,80 440,150 460,230 C475,300 445,360 460,400 L500,400 L500,0 Z"
        fill="rgba(80,120,160,0.18)"
        stroke="rgba(120,160,200,0.3)"
        strokeWidth="1"
      />
      <text
        x="478"
        y="200"
        fill="var(--text-tertiary)"
        fontSize="9"
        textAnchor="middle"
        transform="rotate(90 478 200)"
        style={{ letterSpacing: "2px" }}
      >
        POTOMAC RIVER
      </text>

      {DISTRICTS.map((d) => {
        const isSel = selected === d.key;
        const count = activeCounts[d.key] ?? 0;
        return (
          <g
            key={d.key}
            onClick={() => onSelect(d.key)}
            className="cursor-pointer"
          >
            <path
              d={d.path}
              fill={isSel ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)"}
              stroke={isSel ? "rgba(255,255,255,0.45)" : "var(--border)"}
              strokeWidth={isSel ? 1.5 : 1}
              className="transition-all duration-150 hover:fill-white/[0.07]"
            />
            <text
              x={d.labelXY[0]}
              y={d.labelXY[1]}
              fill="var(--text-primary)"
              fontSize="12"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              className="pointer-events-none"
            >
              {d.label}
            </text>
            {count > 0 && (
              <text
                x={d.labelXY[0]}
                y={d.labelXY[1] + 15}
                fill="var(--text-tertiary)"
                fontSize="9"
                textAnchor="middle"
                className="pointer-events-none"
              >
                {count} aktive {count === 1 ? "Szene" : "Szenen"}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
