// Standard-Avatar für Charaktere ohne eigenes Bild (v. a. NPCs): anonyme
// Silhouette im Avatar-Format 600×502.
const SILHOUETTE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 502">' +
  '<rect width="600" height="502" fill="#1c1c1f"/>' +
  '<circle cx="300" cy="190" r="88" fill="#3b3b42"/>' +
  '<path d="M110 502c0-118 85-200 190-200s190 82 190 200z" fill="#3b3b42"/>' +
  "</svg>";

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(SILHOUETTE_SVG)}`;

// Bild eines Charakters oder - ohne eigenes Bild - die Silhouette
export function characterImage(c: { faceclaim_image_url: string | null }): string {
  return c.faceclaim_image_url || DEFAULT_AVATAR;
}
