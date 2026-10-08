// Standard-Avatar für Charaktere und Spieler*innen ohne eigenes Bild: anonyme
// Silhouette im Avatar-Format 600×502. Admins können je ein eigenes Standardbild
// hinterlegen (Einstellungen → Admin → Design).
const SILHOUETTE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 502">' +
  '<rect width="600" height="502" fill="#1c1c1f"/>' +
  '<circle cx="300" cy="190" r="88" fill="#3b3b42"/>' +
  '<path d="M110 502c0-118 85-200 190-200s190 82 190 200z" fill="#3b3b42"/>' +
  "</svg>";

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(SILHOUETTE_SVG)}`;

// Von Admins gewählte Standardbilder (aus den App-Einstellungen; der Store trägt
// sie hier ein, damit `characterImage`/`playerImage` überall ohne Umweg gelten)
let custom: { character?: string | null; player?: string | null } = {};
export function setDefaultAvatars(next: { character?: string | null; player?: string | null } | null | undefined) {
  custom = next ?? {};
}

// Bild eines Charakters oder – ohne eigenes Bild – das Standardbild
export function characterImage(c: { faceclaim_image_url: string | null }): string {
  return c.faceclaim_image_url || custom.character || DEFAULT_AVATAR;
}

// Avatar einer Spieler*in oder – ohne eigenen – das Standardbild
export function playerImage(p: { avatar_url: string | null } | null | undefined): string {
  return p?.avatar_url || custom.player || DEFAULT_AVATAR;
}
