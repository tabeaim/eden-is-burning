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
async function compress(file: File, maxSide: number): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bild konnte nicht verarbeitet werden");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.85);
  if (!blob) throw new Error("Bild konnte nicht verarbeitet werden");
  return { blob, canvas };
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
): Promise<string> {
  const { blob, canvas } = await compress(file, maxSide);
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
