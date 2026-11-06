// Bild-Uploads: im Browser verkleinern, als WebP in Supabase Storage (Bucket
// "images") ablegen und nur die öffentliche Adresse in der Datenbank speichern.
import { supabase } from "./supabase";

export const IMAGE_BUCKET = "images";

// Zielgrößen (längste Kante in Pixeln)
export const IMAGE_SIZES = {
  avatar: 400,
  portrait: 900, // Charakterfoto
  banner: 1800, // Szenen-/Orts-/Dashboard-Header
  gallery: 1400, // Vibes-Fotos
  signature: 1000, // Signatur unter den Posts
  captic: 1440, // Captic-Beitrag
  capticPoster: 640, // Standbild fürs Captic-Raster
} as const;

function loadImage(file: File): Promise<HTMLImageElement> {
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

// Verkleinert auf maxSide und kodiert als WebP (Safari älter: JPEG als Ersatz).
// `crop` (Anteile des Originals) schneidet vorher zu.
type CropRect = { x: number; y: number; w: number; h: number };
type Drawable = HTMLImageElement | HTMLVideoElement;
async function encode(
  source: Drawable,
  width: number,
  height: number,
  maxSide: number,
  crop?: CropRect | null,
): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  const sx = (crop?.x ?? 0) * width;
  const sy = (crop?.y ?? 0) * height;
  const sw = (crop?.w ?? 1) * width;
  const sh = (crop?.h ?? 1) * height;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bild konnte nicht verarbeitet werden");
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.85);
  if (!blob) throw new Error("Bild konnte nicht verarbeitet werden");
  return { blob, canvas };
}

async function compress(file: File, maxSide: number, crop?: CropRect | null) {
  const img = await loadImage(file);
  return encode(img, img.width, img.height, maxSide, crop);
}

async function store(blob: Blob, folder: string, ext: string): Promise<string> {
  const path = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000", // ein Jahr – Dateinamen sind eindeutig
  });
  if (error) throw new Error(`Hochladen fehlgeschlagen: ${error.message}`);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Lädt ein Bild hoch und gibt seine öffentliche Adresse zurück.
 * `folder` gruppiert die Dateien im Bucket (z.B. "avatars", "scenes").
 * Falls der Speicher (noch) nicht eingerichtet ist, fällt die Funktion auf eine
 * verkleinerte Data-URL zurück, damit Uploads nicht ins Leere laufen.
 */
export async function uploadImage(
  file: File,
  folder: string,
  maxSide: number,
  crop?: CropRect | null, // nur diesen Ausschnitt hochladen
): Promise<string> {
  const { blob, canvas } = await compress(file, maxSide, crop);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const path = `${folder}/${name}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000", // ein Jahr – Dateinamen sind eindeutig
  });
  if (error) {
    console.warn("[images] Upload in den Speicher fehlgeschlagen, nutze Data-URL:", error.message);
    return canvas.toDataURL("image/jpeg", 0.82);
  }
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Animierte Bilder (GIF, animiertes WebP) dürfen nicht neu kodiert werden – sonst
// bleibt nur das erste Bild. Sie gehen unverändert in den Speicher.
export const MAX_GIF_BYTES = 8 * 1024 * 1024;
export async function uploadAnimation(file: File, folder: string): Promise<string> {
  if (!/^image\/(gif|webp)$/.test(file.type)) throw new Error("Bitte ein GIF auswählen.");
  if (file.size > MAX_GIF_BYTES) throw new Error("Das GIF ist zu groß (höchstens 8 MB).");
  const ext = file.type === "image/webp" ? "webp" : "gif";
  const path = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`Hochladen fehlgeschlagen: ${error.message}`);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// GIF oder animiertes WebP? (Animiertes WebP: VP8X-Block mit gesetztem Animations-Bit.)
export async function isAnimated(file: File): Promise<boolean> {
  if (file.type === "image/gif") return true;
  if (file.type !== "image/webp") return false;
  const head = new Uint8Array(await file.slice(0, 21).arrayBuffer());
  const chunk = String.fromCharCode(...head.slice(12, 16));
  return chunk === "VP8X" && (head[20] & 0x02) !== 0;
}

// Für Bildfelder, die auch GIFs erlauben (z.B. Avatar): Animationen unverändert,
// alles andere wie gewohnt verkleinert.
export async function uploadImageOrAnimation(file: File, folder: string, maxSide: number): Promise<string> {
  return (await isAnimated(file)) ? uploadAnimation(file, folder) : uploadImage(file, folder, maxSide);
}

// Kurze Videos (mit Ton) gehen unverändert in den Speicher – im Browser lässt sich
// ein Video nicht sinnvoll neu kodieren. Deshalb die Grenzen bei Größe und Länge.
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;
const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

// Lädt das Video samt Standbild (fürs Raster) hoch.
export async function uploadVideo(
  file: File,
  folder: string,
): Promise<{ url: string; poster: string | null; ar: number }> {
  const ext = VIDEO_TYPES[file.type];
  if (!ext) throw new Error("Bitte ein Video als MP4, MOV oder WebM auswählen.");
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Das Video ist zu groß (höchstens ${MAX_VIDEO_BYTES / 1024 / 1024} MB).`);
  }
  const src = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Das Video konnte nicht gelesen werden."));
      video.src = src;
    });
    if (video.duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error(`Das Video ist zu lang (höchstens ${MAX_VIDEO_SECONDS} Sekunden).`);
    }
    // Standbild kurz nach dem Anfang (das allererste Bild ist oft schwarz)
    let poster: string | null = null;
    try {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        setTimeout(resolve, 1500);
        video.currentTime = Math.min(0.3, video.duration / 2);
      });
      const { blob } = await encode(video, video.videoWidth, video.videoHeight, IMAGE_SIZES.capticPoster);
      poster = await store(blob, folder, blob.type === "image/webp" ? "webp" : "jpg");
    } catch (err) {
      console.warn("[images] Standbild fehlgeschlagen:", err);
    }
    const url = await store(file, folder, ext);
    return { url, poster, ar: video.videoWidth / Math.max(1, video.videoHeight) };
  } finally {
    URL.revokeObjectURL(src);
  }
}

// Seitenverhältnis einer Bild-Adresse (für GIFs aus der Suche)
export function imageRatio(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / Math.max(1, img.naturalHeight));
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
