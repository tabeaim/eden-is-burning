// Seitenspezifische Banner-Header. Statt eines einzigen Titelbilds bekommt jede
// Seite einen eigenen, dunkel gehaltenen Vektor-Header im Stil der Eden-Skyline.
// Alles wird als data:-URI erzeugt – keine externen Bilder, lädt garantiert.
// Quick&dirty: schnelle Silhouetten + Verläufe, deterministisch pro Seite.
//
// Szenen und Profile ohne eigenes Bild zeigen den Header ihrer Seite (defaultHeader).

import { areaPhoto } from "./world";

const W = 1600;
const H = 360;

// deterministischer Zufall (mulberry32) + einfacher String-Hash
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Motif = "skyline" | "spires" | "hills" | "moon" | "crowd" | "waves" | "arch" | "industry";

interface Theme {
  sky: [number, string][]; // [offset, color] von oben nach unten
  glow: string; // Farbe des Horizont-Glühens
  glowX: number; // 0..1 horizontale Position des Glühens
  silhouette: string; // Silhouetten-Farbe
  windows: string; // Fensterlicht-Farbe
  motif: Motif;
}

// ---- Silhouetten-Motive (unten verankert) --------------------------------

function stars(rand: () => number, n: number, color: string): string {
  let out = `<g fill="${color}">`;
  for (let i = 0; i < n; i++) {
    const x = Math.round(rand() * W);
    const y = Math.round(rand() * (H * 0.42));
    const r = (0.7 + rand() * 0.9).toFixed(1);
    const o = (0.4 + rand() * 0.45).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}"/>`;
  }
  return out + `</g>`;
}

function skyline(rand: () => number, t: Theme): string {
  let b = `<g fill="${t.silhouette}">`;
  let w = `<g fill="${t.windows}">`;
  let x = 30;
  while (x < W - 20) {
    const bw = 34 + Math.round(rand() * 70);
    const bh = 110 + Math.round(rand() * 190);
    const y = H - bh;
    b += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}"/>`;
    // ein paar erleuchtete Fenster
    for (let i = 0; i < 3; i++) {
      if (rand() > 0.55) {
        const wx = x + 6 + Math.round(rand() * Math.max(2, bw - 14));
        const wy = y + 12 + Math.round(rand() * Math.max(4, bh - 30));
        w += `<rect x="${wx}" y="${wy}" width="5" height="9" opacity="${(0.55 + rand() * 0.4).toFixed(2)}"/>`;
      }
    }
    x += bw + 6 + Math.round(rand() * 14);
  }
  return b + `</g>` + w + `</g>`;
}

function industry(rand: () => number, t: Theme): string {
  // niedrige Hallen, Kräne, Schornsteine – Hafen/Industrie
  let b = `<g fill="${t.silhouette}">`;
  let x = 20;
  while (x < W - 20) {
    const kind = rand();
    if (kind > 0.72) {
      // Schornstein
      const bw = 20 + Math.round(rand() * 16);
      const bh = 150 + Math.round(rand() * 150);
      b += `<rect x="${x}" y="${H - bh}" width="${bw}" height="${bh}"/>`;
      x += bw + 30;
    } else if (kind > 0.4) {
      // Kran (L-Ausleger)
      const px = x;
      const py = H - (120 + Math.round(rand() * 120));
      b += `<rect x="${px}" y="${py}" width="8" height="${H - py}"/>`;
      b += `<rect x="${px}" y="${py}" width="${90 + Math.round(rand() * 60)}" height="8"/>`;
      x += 130;
    } else {
      // Halle
      const bw = 90 + Math.round(rand() * 120);
      const bh = 70 + Math.round(rand() * 60);
      b += `<rect x="${x}" y="${H - bh}" width="${bw}" height="${bh}"/>`;
      x += bw + 18;
    }
  }
  return b + `</g>`;
}

function spires(rand: () => number, t: Theme): string {
  // spitze Türme / Giebel – erzählerisch, gotisch
  let b = `<g fill="${t.silhouette}">`;
  let x = 20;
  while (x < W - 20) {
    const bw = 60 + Math.round(rand() * 80);
    const bh = 120 + Math.round(rand() * 150);
    const y = H - bh;
    const midx = x + bw / 2;
    const peak = y - (30 + Math.round(rand() * 70));
    b += `<path d="M${x} ${H} L${x} ${y} L${midx} ${peak} L${x + bw} ${y} L${x + bw} ${H} Z"/>`;
    x += bw + 8 + Math.round(rand() * 20);
  }
  return b + `</g>`;
}

function hills(rand: () => number, t: Theme): string {
  // gestaffelte Hügelketten – Orte/Karte
  let out = "";
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    const base = H - l * 34;
    const amp = 40 + l * 18;
    const op = (0.5 + l * 0.22).toFixed(2);
    let d = `M0 ${base}`;
    let x = 0;
    let y = base - Math.round(rand() * amp);
    while (x <= W) {
      const nx = x + 160 + Math.round(rand() * 160);
      const ny = base - Math.round(rand() * amp);
      const cx = (x + nx) / 2;
      d += ` Q ${cx} ${(y + ny) / 2 - 30} ${nx} ${ny}`;
      x = nx;
      y = ny;
    }
    d += ` L${W} ${H} L0 ${H} Z`;
    out += `<path d="${d}" fill="${t.silhouette}" opacity="${op}"/>`;
  }
  return out;
}

function moon(rand: () => number, t: Theme): string {
  // Mondsichel + dichter Sternenhimmel – Kalender/Zeit
  const cx = 1250 + Math.round(rand() * 200);
  const cy = 120;
  const r = 66;
  let out = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.windows}" opacity="0.9"/>`;
  out += `<circle cx="${cx + 26}" cy="${cy - 14}" r="${r}" fill="${t.sky[0][1]}"/>`;
  // niedrige Hügel-Silhouette
  out += `<path d="M0 ${H} L0 ${H - 60} Q 400 ${H - 120} 800 ${H - 70} T 1600 ${H - 90} L1600 ${H} Z" fill="${t.silhouette}"/>`;
  return out;
}

function crowd(rand: () => number, t: Theme): string {
  // Reihe von Kopf-Schulter-Silhouetten – Einwohner*innen
  let out = "";
  const rows = 2;
  for (let r = 0; r < rows; r++) {
    const base = H - r * 26;
    const scale = 1 - r * 0.18;
    const op = (0.55 + (1 - r) * 0.35).toFixed(2);
    let x = 20 + r * 30;
    let g = `<g fill="${t.silhouette}" opacity="${op}">`;
    while (x < W) {
      const hr = Math.round((26 + rand() * 12) * scale); // Kopfradius
      const cyh = base - Math.round(70 * scale);
      g += `<circle cx="${x}" cy="${cyh}" r="${hr}"/>`;
      // Schultern
      const sw = hr * 3.2;
      g += `<path d="M${x - sw / 2} ${base} Q ${x} ${cyh + hr * 0.6} ${x + sw / 2} ${base} Z"/>`;
      g += `<rect x="${x - sw / 2}" y="${cyh + hr}" width="${sw}" height="${base - cyh}"/>`;
      x += Math.round(sw * 0.9 + rand() * 20);
    }
    out += g + `</g>`;
  }
  return out;
}

function waves(rand: () => number, t: Theme): string {
  // horizontale Wellenbänder – Info/ruhig
  let out = "";
  for (let l = 0; l < 5; l++) {
    const base = H - 30 - l * 46;
    const op = (0.2 + l * 0.14).toFixed(2);
    let d = `M0 ${base}`;
    for (let x = 0; x <= W; x += 80) {
      const y = base + Math.sin((x / 80 + l) * 0.9) * (10 + l * 4);
      d += ` L${x} ${Math.round(y)}`;
    }
    d += ` L${W} ${H} L0 ${H} Z`;
    out += `<path d="${d}" fill="${t.silhouette}" opacity="${op}"/>`;
  }
  return out;
}

function arch(rand: () => number, t: Theme): string {
  // Portal-Bögen – Profil/Charakter (Rahmen)
  let out = `<g fill="${t.silhouette}">`;
  let x = 60;
  while (x < W - 60) {
    const bw = 120 + Math.round(rand() * 60);
    const bh = 150 + Math.round(rand() * 120);
    const y = H - bh;
    const r = bw / 2;
    out += `<path d="M${x} ${H} L${x} ${y + r} A ${r} ${r} 0 0 1 ${x + bw} ${y + r} L${x + bw} ${H} Z"/>`;
    x += bw + 40 + Math.round(rand() * 40);
  }
  return out + `</g>`;
}

function drawMotif(t: Theme, rand: () => number): string {
  switch (t.motif) {
    case "skyline":
      return skyline(rand, t);
    case "industry":
      return industry(rand, t);
    case "spires":
      return spires(rand, t);
    case "hills":
      return hills(rand, t);
    case "moon":
      return moon(rand, t);
    case "crowd":
      return crowd(rand, t);
    case "waves":
      return waves(rand, t);
    case "arch":
      return arch(rand, t);
    default:
      return skyline(rand, t);
  }
}

function buildSvg(t: Theme, seed: number): string {
  const rand = mulberry32(seed);
  const skyStops = t.sky
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("");
  const gx = (t.glowX * W).toFixed(0);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1">${skyStops}</linearGradient>` +
    `<radialGradient id="g" cx="${(t.glowX * 100).toFixed(0)}%" cy="74%" r="60%">` +
    `<stop offset="0" stop-color="${t.glow}" stop-opacity="0.9"/>` +
    `<stop offset="0.45" stop-color="${t.glow}" stop-opacity="0.45"/>` +
    `<stop offset="1" stop-color="${t.glow}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
    stars(rand, 26, "#eef0ff") +
    `<ellipse cx="${gx}" cy="266" rx="900" ry="150" fill="url(#g)"/>` +
    drawMotif(t, rand) +
    `</svg>`;
  return svg;
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ---- Themen pro Seite -----------------------------------------------------

const PAGE_THEMES: Record<string, Theme> = {
  dashboard: {
    sky: [[0, "#1b2347"], [0.42, "#3a2c4a"], [0.72, "#8a4a2a"], [0.9, "#1a120e"], [1, "#0b0a0a"]],
    glow: "#e8903c",
    glowX: 0.26,
    silhouette: "#120d10",
    windows: "#ffcf7a",
    motif: "skyline",
  },
  szenen: {
    sky: [[0, "#241436"], [0.45, "#3c1d3f"], [0.75, "#7a2f4a"], [0.9, "#180d14"], [1, "#0a0709"]],
    glow: "#d24f7a",
    glowX: 0.6,
    silhouette: "#0f0810",
    windows: "#ffb3d1",
    motif: "spires",
  },
  orte: {
    sky: [[0, "#0f2a2b"], [0.45, "#173a34"], [0.72, "#3c5a34"], [0.9, "#101a12"], [1, "#080b09"]],
    glow: "#5fae5a",
    glowX: 0.7,
    silhouette: "#0a130d",
    windows: "#cfe9a8",
    motif: "hills",
  },
  kalender: {
    sky: [[0, "#0c1230"], [0.5, "#141a3e"], [0.8, "#2a2350"], [0.92, "#0e0f1e"], [1, "#07070f"]],
    glow: "#5b6bd0",
    glowX: 0.78,
    silhouette: "#0a0c1a",
    windows: "#eaf0ff",
    motif: "moon",
  },
  einwohnerinnen: {
    sky: [[0, "#2a1e14"], [0.45, "#3f2c1c"], [0.72, "#7a5230"], [0.9, "#1a120c"], [1, "#0b0806"]],
    glow: "#e0a34e",
    glowX: 0.4,
    silhouette: "#0f0a07",
    windows: "#ffdca0",
    motif: "crowd",
  },
  info: {
    sky: [[0, "#101826"], [0.5, "#182636"], [0.78, "#2f4a5e"], [0.92, "#0d141a"], [1, "#070b0e"]],
    glow: "#4f93b8",
    glowX: 0.5,
    silhouette: "#0a1016",
    windows: "#bfe4f5",
    motif: "waves",
  },
  einstellungen: {
    sky: [[0, "#1a1c22"], [0.5, "#24262e"], [0.8, "#3a3d47"], [0.92, "#131418"], [1, "#0a0a0c"]],
    glow: "#8a8f9c",
    glowX: 0.32,
    silhouette: "#0c0d10",
    windows: "#d7dbe6",
    motif: "skyline",
  },
  spieler: {
    sky: [[0, "#2a1020"], [0.45, "#3a1526"], [0.75, "#7a2a33"], [0.9, "#180a0d"], [1, "#0a0607"]],
    glow: "#d1584f",
    glowX: 0.5,
    silhouette: "#0f0709",
    windows: "#ffc2ae",
    motif: "arch",
  },
  charaktere: {
    sky: [[0, "#1e1430"], [0.45, "#2c1c3a"], [0.75, "#5a3a5c"], [0.9, "#130d16"], [1, "#08070a"]],
    glow: "#a06bc0",
    glowX: 0.56,
    silhouette: "#0d0812",
    windows: "#e6cff5",
    motif: "arch",
  },
};

// Heller Stil: dieselben Motive, aber Sand-/Orange-Himmel mit braunen Silhouetten
const LIGHT_SKY: [number, string][] = [[0, "#f6dfb4"], [0.5, "#f0c78a"], [0.8, "#e8a95a"], [0.93, "#d9b987"], [1, "#fbf5ea"]];
const lightOf = (t: Theme): Theme => ({ ...t, sky: LIGHT_SKY, glow: "#f2b564", silhouette: "#8a6a3c", windows: "#fff1cf" });

/** Generierter Header-Hintergrund für eine Seite (nur noch Rückfall, siehe `standardHeader`). */
function pageHeader(segment: string | undefined, mode: "dark" | "light" = "dark"): string {
  const t = PAGE_THEMES[segment ?? "dashboard"] ?? PAGE_THEMES.dashboard;
  return toDataUri(buildSvg(mode === "light" ? lightOf(t) : t, hashStr("page:" + (segment ?? "dashboard"))));
}

// --- Bildausschnitt eigener Header-Bilder ---
// Header sind flache Streifen; von hochformatigen Bildern ist nur ein Ausschnitt
// zu sehen. Welcher, steht als Anhang an der Bildadresse („…#y=30" = 30 % von
// oben, ohne Anhang die Mitte) – so braucht kein Header-Feld eine zweite Spalte.
const BANNER_Y = /#y=(\d{1,3})$/;

export function bannerY(url: string | null | undefined): number {
  const m = url?.match(BANNER_Y);
  return m ? Math.min(100, parseInt(m[1], 10)) : 50;
}

export function withBannerY(url: string, y: number): string {
  const src = url.replace(BANNER_Y, "");
  const v = Math.round(Math.min(100, Math.max(0, y)));
  return v === 50 ? src : `${src}#y=${v}`;
}

/** background-image + -position für ein Header-Bild samt gewähltem Ausschnitt. */
export function bannerStyle(url: string): { backgroundImage: string; backgroundPosition: string } {
  return {
    backgroundImage: `url("${url.replace(BANNER_Y, "")}")`,
    backgroundPosition: `center ${bannerY(url)}%`,
  };
}

/** Eigene Header-Bilder der Admins für diesen Stil (Seite -> Bildadresse). */
export function headersFor(
  settings: { headers?: unknown } | null | undefined,
  mode: "dark" | "light",
): Record<string, string> {
  const h = settings?.headers as Record<string, unknown> | undefined;
  if (!h) return {};
  // Altes Format (ohne Stil, flach): galt für den dunklen Stil
  if (!("dark" in h) && !("light" in h)) return mode === "dark" ? (h as Record<string, string>) : {};
  return (h[mode] as Record<string, string> | undefined) ?? {};
}

// Standard-Header der Seiten: ein gemeinsames Bild (public/headers/standard.webp),
// je Stil und Seite mit eigenem Ausschnitt (% von oben). Gilt, solange Admins unter
// Einstellungen → Admin → Design kein eigenes Bild hinterlegt haben.
const STANDARD_IMAGE = "/headers/standard.webp";
const STANDARD_Y: Record<"dark" | "light", Record<string, number>> = {
  dark: { dashboard: 98, szenen: 94, orte: 98, kalender: 96, charaktere: 98, spieler: 97, info: 96, einstellungen: 97 },
  light: { dashboard: 0, szenen: 0, orte: 0, kalender: 0, charaktere: 0, spieler: 0, info: 0, einstellungen: 0 },
};

/** Standard-Header einer Seite; für Seiten ohne festen Ausschnitt die generierte Vorlage. */
export function standardHeader(segment: string, mode: "dark" | "light"): string {
  const y = STANDARD_Y[mode][segment];
  return y === undefined ? pageHeader(segment, mode) : withBannerY(STANDARD_IMAGE, y);
}

/** Standard-Header für alles ohne eigenes Bild (Szene, Charakter-, Spieler*innen-Profil):
    der aktuelle Header der zugehörigen Seite – das Bild der Admins, sonst der Standard. */
export function defaultHeader(
  settings: { headers?: unknown } | null | undefined,
  segment: string,
  mode: "dark" | "light",
): string {
  return headersFor(settings, mode)[segment] || standardHeader(segment, mode);
}

/** Header eines Orts ohne eigenes Bild: das aktuelle Bild seiner Gegend, und solange
    die keins hat, der Header der Orte-Seite. */
export function locationHeader(
  settings: { headers?: unknown; areaImages?: Record<string, string> } | null | undefined,
  area: string,
  mode: "dark" | "light",
): string {
  return areaPhoto(area, settings) || defaultHeader(settings, "orte", mode);
}
