// Bilder für die „Personal Things"-Collage: auf eine handliche Größe bringen,
// auf Wunsch den Hintergrund entfernen und mit Transparenz hochladen.
import { supabase } from "./supabase";
import { IMAGE_BUCKET } from "./images";

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht gelesen werden"));
    };
    img.src = url;
  });
}

// Zeichnet das Bild verkleinert (längste Kante `maxSide`) auf eine Zeichenfläche.
export function toCanvas(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Entfernt einen (halbwegs) einfarbigen Hintergrund: Ausgehend vom Bildrand wird
 * alles durchsichtig, was der Randfarbe ähnelt und mit dem Rand zusammenhängt –
 * Flächen derselben Farbe IM Motiv bleiben also stehen. `tolerance` (0–100)
 * bestimmt, wie ähnlich „ähnlich" ist. Funktioniert gut bei Produktfotos auf
 * hellem oder dunklem Grund, nicht bei unruhigen Hintergründen.
 * Das Ergebnis ist auf das Motiv zugeschnitten.
 */
export function removeBackground(source: HTMLCanvasElement, tolerance: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const ctx = source.getContext("2d");
  if (!ctx) return source;
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;

  // Hintergrundfarben: die häufigsten Farben am Bildrand (grob gruppiert). Nicht
  // der Mittelwert – bei z.B. weißem Grund mit schwarzem Streifen unten ergäbe
  // der ein Grau, das es im Bild gar nicht gibt.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let borderCount = 0;
  const addBorder = (i: number) => {
    if (px[i * 4 + 3] === 0) return;
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(key, e);
    borderCount++;
  };
  for (let x = 0; x < w; x++) {
    addBorder(x);
    addBorder((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    addBorder(y * w);
    addBorder(y * w + w - 1);
  }
  const bgs = [...buckets.values()]
    .filter((e) => e.n >= borderCount * 0.05)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map((e) => [e.r / e.n, e.g / e.n, e.b / e.n]);
  if (!bgs.length) return source;
  // Abstand im RGB-Raum (max. ~441) zur nächsten Hintergrundfarbe. Quadratisch,
  // damit der Regler im unteren Bereich fein arbeitet.
  const limit = 2 + (tolerance / 100) ** 2 * 260;
  const dist = (i: number) => {
    let best = Infinity;
    for (const bg of bgs) {
      const d = Math.hypot(px[i * 4] - bg[0], px[i * 4 + 1] - bg[1], px[i * 4 + 2] - bg[2]);
      if (d < best) best = d;
    }
    return best;
  };

  // Füllen vom Rand her
  const gone = new Uint8Array(w * h);
  const stack: number[] = [];
  const visit = (i: number) => {
    if (gone[i] || px[i * 4 + 3] === 0 || dist(i) > limit) return;
    gone[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    visit(x);
    visit((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w);
    visit(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    if (x > 0) visit(i - 1);
    if (x < w - 1) visit(i + 1);
    if (i >= w) visit(i - w);
    if (i < w * (h - 1)) visit(i + w);
  }

  // Durchsichtig machen; die Kante zum Motiv leicht weichzeichnen
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < w * h; i++) {
    if (gone[i]) {
      px[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    const edge =
      (x > 0 && gone[i - 1]) || (x < w - 1 && gone[i + 1]) || (y > 0 && gone[i - w]) || (y < h - 1 && gone[i + w]);
    if (edge) px[i * 4 + 3] = Math.round(px[i * 4 + 3] * 0.6);
    if (px[i * 4 + 3] > 0) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return source; // alles entfernt: lieber das Original behalten

  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  tmp.getContext("2d")?.putImageData(image, 0, 0);
  out.getContext("2d")?.drawImage(tmp, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// Lädt eine Zeichenfläche MIT Transparenz hoch (WebP, sonst PNG – nie JPEG, das
// keine Transparenz kennt) und gibt die Adresse zurück.
export async function uploadCanvas(canvas: HTMLCanvasElement, folder: string): Promise<string> {
  const toBlob = (type: string, quality?: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp", 0.9);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/png");
  if (!blob) throw new Error("Bild konnte nicht verarbeitet werden");
  const ext = blob.type === "image/webp" ? "webp" : "png";
  const path = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
  });
  if (error) {
    console.warn("[cutout] Upload in den Speicher fehlgeschlagen, nutze Data-URL:", error.message);
    return canvas.toDataURL("image/png");
  }
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
