"use client";

// Statische SVG-Karte von Eden, Virginia — 1:1 aus der Figma-Vorlage
// "Stadtbezirks-Karte" (Frame 608×560) übernommen: exakte Vektorpfade, Farben und
// Beschriftungen. Byron University als abgesetzter Campus (gestricheltes Orange),
// rechts der Potomac, der sich unten zur Chesapeake Bay weitet. Die Auswahl-,
// Bespielt- und Aktive-Szenen-Logik der App liegt darüber.

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
    points:
      "-8.5,139.5 12.5,20.0 111.0,-10.5 311.0,-18.0 355.0,75.0 320.0,133.0 261.0,161.0 140.0,187.5 78.0,177.0",
    anchor: [98, 112],
  },
  {
    key: "oak_hill",
    label: "Oak Hill",
    points:
      "355.1,75.0 387.6,89.5 355.1,260.0 275.1,280.0 214.6,268.5 104.1,229.5 82.1,178.5 179.6,168.5",
    anchor: [244, 215],
  },
  {
    key: "belle_view",
    label: "Belle View",
    points:
      "386.5,88.1 453.0,98.6 515.0,139.6 515.0,255.1 515.0,381.6 430.5,381.6 420.0,338.6 356.0,260.6",
    anchor: [409, 253],
  },
  {
    key: "downtown",
    label: "Downtown",
    points: "272.4,281.0 357.4,260.5 421.4,339.0 430.9,383.5 284.9,377.0",
    anchor: [315, 319],
  },
  {
    key: "rivers_edge",
    label: "Rivers Edge",
    points:
      "283.0,377.1 425.5,383.6 514.0,383.6 514.0,464.6 402.5,490.1 287.5,470.6 201.0,406.6 190.0,358.1 201.0,323.1 216.0,268.1 274.0,282.1",
    anchor: [312, 430],
  },
  {
    key: "westridge",
    label: "Westridge",
    points:
      "188.4,360.0 200.4,404.0 399.4,489.0 264.4,537.5 161.9,544.5 14.4,480.5 6.9,404.0 65.4,334.5",
    anchor: [98, 461],
  },
];

// Byron University — abgesetzter Campus (gestricheltes Rechteck, keine Füllung)
const BYRON_POINTS = "104.0,232.1 214.0,272.1 201.0,315.6 188.0,355.6 70.0,332.2";
const BYRON_LABEL: [number, number] = [108, 294]; // zweizeilig: 294 / 307

interface Marker {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const EXTERNAL: Marker[] = [
  { key: "washington", label: "Washington D.C.", x: 179, y: 27, w: 192, h: 32 },
  { key: "rest", label: "Rest der Welt", x: 436, y: 613, w: 158, h: 32 },
];

// Wasser: Potomac (oben) und Chesapeake Bay (unten), beide #192438
const POTOMAC = "515.0,0.0 558.0,0.0 588.0,244.0 515.0,290.0";
const BAY = "515.0,290.0 564.5,136.0 648.5,189.0 672.0,275.0 690.0,671.0 515.0,660.0 515.0,430.0";

function fillFor(isSel: boolean) {
  return isSel ? "#2e2411" : "#1e2415";
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

  return (
    <svg viewBox="0 0 608 660" className="w-full h-auto select-none" style={{ maxHeight: 760 }}>
      {/* Frame-Hintergrund — zugleich klickbares "Umland" (deckt die dunklen Ränder) */}
      <g onClick={() => onSelect("umland")} className="cursor-pointer">
        <rect x="0" y="0" width="608" height="660" rx="10" fill="#18181b" />
      </g>

      {/* Wasser: Potomac → Chesapeake Bay */}
      <polygon points={POTOMAC} fill="#192438" style={{ pointerEvents: "none" }} />
      <polygon points={BAY} fill="#192438" style={{ pointerEvents: "none" }} />
      <text
        x="546"
        y="129.5"
        fill="#4a6080"
        fontSize="10"
        textAnchor="middle"
        transform="rotate(-90 546 129.5)"
        style={{ letterSpacing: "2.5px", pointerEvents: "none" }}
      >
        POTOMAC RIVER
      </text>
      <text
        x="571"
        y="398"
        fill="#4a6080"
        fontSize="10"
        textAnchor="middle"
        transform="rotate(-90 571 398)"
        style={{ letterSpacing: "2.5px", pointerEvents: "none" }}
      >
        CHESAPEAKE BAY
      </text>

      {/* Umland-Label (Bereich = Frame-Hintergrund) */}
      <text x="16" y="257" fill="#808080" fontSize="10" className="pointer-events-none">
        Umland
      </text>

      {/* Bezirke */}
      {ordered.map((d) => {
        const isSel = selected === d.key;
        return (
          <g key={d.key} onClick={() => onSelect(d.key)} className="cursor-pointer">
            <polygon
              points={d.points}
              fill={fillFor(isSel)}
              stroke={strokeFor(isSel)}
              strokeWidth={isSel ? 2 : 1.5}
              strokeLinejoin="round"
              className="transition-all duration-150"
            />
            <text
              x={d.anchor[0]}
              y={d.anchor[1]}
              fill={isSel ? "var(--text-primary)" : "#b8c4a0"}
              fontSize="11"
              className="pointer-events-none"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Byron University — gestrichelter Campus */}
      <g onClick={() => onSelect("byron")} className="cursor-pointer">
        <polygon
          points={BYRON_POINTS}
          fill={byronSel ? "rgba(232,117,32,0.12)" : "transparent"}
          stroke="#e87520"
          strokeWidth={byronSel ? 2.6 : 2}
          strokeDasharray="7 4"
          strokeLinejoin="round"
          className="transition-all duration-150"
        />
        <text x={BYRON_LABEL[0]} y={BYRON_LABEL[1]} fill="#b8c4a0" fontSize="11" className="pointer-events-none">
          Byron
        </text>
        <text x={BYRON_LABEL[0]} y={BYRON_LABEL[1] + 13} fill="#b8c4a0" fontSize="11" className="pointer-events-none">
          University
        </text>
      </g>

      {/* Washington D.C. — Nordpfeil + Pille */}
      <g onClick={() => onSelect("washington")} className="cursor-pointer">
        <line x1="275" y1="23" x2="275" y2="9" stroke="#dedede" strokeWidth="1.5" />
        <path d="M275,4 L270.5,13 L279.5,13 Z" fill="#dedede" />
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
  return (
    <>
      <rect
        x={m.x}
        y={m.y}
        width={m.w}
        height={m.h}
        rx={16}
        fill={selected ? "rgba(232,154,60,0.18)" : "#1e1e23"}
        stroke={selected ? "var(--accent)" : "#4f4f54"}
        strokeWidth="1"
        className="transition-all hover:stroke-white/60"
      />
      <circle cx={m.x + 16} cy={m.y + m.h / 2} r="3" fill={active ? "var(--accent)" : "#dedede"} />
      <text x={m.x + 27} y={m.y + m.h / 2 + 4} fill={selected ? "var(--accent)" : "#dedede"} fontSize="12" className="pointer-events-none">
        {m.label}
      </text>
    </>
  );
}
