"use client";

// Statische SVG-Karte von Eden, Virginia — 1:1 aus der aktualisierten Figma-Vorlage
// "Stadtbezirks-Karte" (Frame 608×654) übernommen. Die exakten Vektorpfade sind aus
// den Figma-Exporten transkribiert und per <g transform> an ihre Frame-Position
// gesetzt; Orchid Valley und die Küsten-Splitter sind rotiert wie im Original.
// Neu ggü. der alten Karte: eigener Bezirk "Central" (Downtown-Fläche), abgesetzter
// "Industrial District & Eden Port", Byron University als Highlight in Rivers Edge.
// Die Auswahl-, Bespielt- und Aktive-Szenen-Logik der App liegt darüber.

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
    d: "M110.34 16.38L150.34 0.880016L196.84 49.38L199.34 81.88L186.84 135.88L160.34 130.38L150.34 145.88L141.84 140.38L138.34 145.88L130.84 149.38L118.645 135.88H92.1448L94.34 150.88L85.84 152.38L79.84 159.38L69.84 142.88L48.84 150.88L36.34 135.88L11.84 117.88L0.839969 81.88L23.84 55.88L59.34 30.88L69.84 16.38H110.34Z",
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

// Wasser (Potomac → Chesapeake Bay) und Küsten-Splitter — rein dekorativ.
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
  // Küsten-Splitter (rotiert -90.32° um AABB-Zentrum)
  {
    d: "M26.7021 28.5566L26.6572 28.96L27.042 29.0869L38.5078 32.8789L26.6514 59.5283L26.3896 60.1182L27.0254 60.2246L46.4717 63.498L39.1103 66.667L33.3769 63.6455L33.0254 63.4609L32.7656 63.7617L29.6435 67.375L29.4765 67.5684L29.5351 67.8174L32.5254 80.4717L24.0439 85.5791L23.9892 85.6123L23.9443 85.6582L18.9717 90.749L18.7881 90.9375L18.8389 91.1953L20.75 100.948L0.982405 100.839L14.7558 82.0625L21.792 76.9043L22.3008 76.5312L21.8213 76.1211L12.9199 68.5049L17.7285 57.6826L27.5293 46.1807L27.8603 45.792L27.4648 45.4688L22.2715 41.2275L27.5976 33.499L28.1738 32.6621L27.1592 32.7158L17.5439 33.2266L1.28807 19.3896L29.7812 0.991211L26.7021 28.5566Z",
    transform: "translate(455.858 426.394) rotate(-90.32) translate(-24.1142 -50.726)",
    fill: "#192438",
    stroke: "#445130",
  },
  {
    d: "M27.1416 28.918L27.0967 29.3213L27.4824 29.4482L39.1396 33.29L27.0898 60.2812L26.8262 60.8711L27.4638 60.9785L47.2461 64.2959L39.7422 67.5146L33.9121 64.4541L33.5615 64.2695L33.3017 64.5693L30.1289 68.2285L29.9619 68.4219L30.0205 68.6719L33.0596 81.4893L24.4375 86.6631L24.3828 86.6963L24.3379 86.7422L19.2842 91.8975L19.0996 92.0859L19.1513 92.3447L21.0957 102.228L0.983381 102.117L14.9863 83.0947L22.1387 77.8701L22.6504 77.4961L22.168 77.085L13.1191 69.3701L18.0078 58.4082L27.9678 46.7598L28.3008 46.3701L27.9033 46.0469L22.6221 41.748L28.0361 33.9189L28.6152 33.0811L27.5986 33.1348L17.8232 33.6523L1.29783 19.6348L30.2715 0.990234L27.1416 28.918Z",
    transform: "translate(456.5 426.777) rotate(-90.32) translate(-24.5039 -51.3655)",
    fill: "#192438",
    stroke: "#445130",
  },
  {
    d: "M26.752 19.5059L26.8447 19.6914L27.042 19.7568L38.5078 23.5479L26.6514 50.1982L26.3896 50.7871L27.0254 50.8945L46.4717 54.167L39.1094 57.3359L33.377 54.3154L33.0254 54.1299L32.7656 54.4307L29.6436 58.0449L29.4766 58.2383L29.5352 58.4863L32.5244 71.1406L24.0439 76.248L23.9893 76.2812L23.9443 76.3271L18.9717 81.4189L18.7881 81.6064L18.8389 81.8643L20.75 91.6172L0.982422 91.5078L14.7559 72.7324L21.792 67.5732L22.3008 67.2002L21.8213 66.79L12.9199 59.1748L17.7285 48.3516L27.5293 36.8496L27.8604 36.4609L27.4648 36.1387L22.2715 31.8965L27.5977 24.168L28.1738 23.3311L27.1592 23.3857L17.6807 23.8877L9.81348 7.09082L17.3428 0.788086L26.752 19.5059Z",
    transform: "translate(520.523 560.368) rotate(-90.32) translate(-24.1142 -46.0605)",
    fill: "#192438",
    stroke: "#445130",
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
  { key: "rest", label: "Rest der Welt", x: 436, y: 613, w: 158, h: 32 },
];

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

  return (
    <svg viewBox="0 0 608 654" className="w-full h-auto select-none" style={{ maxHeight: 760 }}>
      {/* Frame-Hintergrund — zugleich klickbares "Umland" (deckt die dunklen Ränder) */}
      <g onClick={() => onSelect("umland")} className="cursor-pointer">
        <rect x="0" y="0" width="608" height="654" rx="10" fill="#18181b" />
      </g>

      {/* Wasser: Potomac → Chesapeake Bay (dekorativ) */}
      {WATER.map((w, i) => (
        <g key={`water-${i}`} transform={w.transform} style={{ pointerEvents: "none" }}>
          <path d={w.d} fill={w.fill} stroke={w.stroke} strokeWidth={w.stroke ? 1 : undefined} />
        </g>
      ))}

      {/* Fluss-/Bay-Beschriftung */}
      <text
        x="559"
        y="79"
        fill="#4a6080"
        fontSize="10"
        textAnchor="middle"
        transform="rotate(-91.02 559 79)"
        style={{ letterSpacing: "2.5px", pointerEvents: "none" }}
      >
        POTOMAC RIVER
      </text>
      <text
        x="576"
        y="440"
        fill="#4a6080"
        fontSize="10"
        textAnchor="middle"
        transform="rotate(-90 576 440)"
        style={{ letterSpacing: "2.5px", pointerEvents: "none" }}
      >
        CHESAPEAKE BAY
      </text>

      {/* Umland-Labels (Bereich = Frame-Hintergrund) */}
      <text x="63" y="408" fill="#808080" fontSize="10" className="pointer-events-none">
        Umland
      </text>
      <text x="419" y="71" fill="#808080" fontSize="10" className="pointer-events-none">
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
            <text
              x={d.lx}
              y={d.ly}
              fill={isSel ? "var(--text-primary)" : "#b8c4a0"}
              fontSize="11"
              className="pointer-events-none"
            >
              {d.label}
            </text>
            {d.label2 && (
              <text
                x={d.lx}
                y={d.ly + 13}
                fill={isSel ? "var(--text-primary)" : "#b8c4a0"}
                fontSize="11"
                className="pointer-events-none"
              >
                {d.label2}
              </text>
            )}
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
        <text x={BYRON.lx} y={BYRON.ly} fill="#b8c4a0" fontSize="11" className="pointer-events-none">
          Byron
        </text>
        <text x={BYRON.lx} y={BYRON.ly + 13} fill="#b8c4a0" fontSize="11" className="pointer-events-none">
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
        <ExternalPill p={PILLS[0]} selected={selected === "washington"} active={(areaStats["washington"]?.active ?? 0) > 0} />
      </g>

      {/* Rest der Welt */}
      <g onClick={() => onSelect("rest")} className="cursor-pointer">
        <ExternalPill p={PILLS[1]} selected={selected === "rest"} active={(areaStats["rest"]?.active ?? 0) > 0} />
      </g>
    </svg>
  );
}

function ExternalPill({ p, selected, active }: { p: Pill; selected: boolean; active: boolean }) {
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
      <circle cx={p.x + 16} cy={p.y + p.h / 2} r="3" fill={active ? "var(--accent)" : "#9E9E9E"} />
      <text x={p.x + 27} y={p.y + p.h / 2 + 4} fill={selected ? "var(--accent)" : "#dedede"} fontSize="12" className="pointer-events-none">
        {p.label}
      </text>
    </>
  );
}
