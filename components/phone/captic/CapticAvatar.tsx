"use client";

import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { characterImage } from "@/lib/avatar";

// Profilbild in Captic: das eigene Captic-Bild, sonst das Handy-Profilbild, sonst
// das Charakterbild.
export function capticAvatarUrl(c: Pick<Character, "faceclaim_image_url" | "phone">): string {
  return c.phone?.captic?.avatar || c.phone?.avatar || characterImage(c);
}

// Avatar überall in Captic. Hat der Charakter eine Story, liegt ein Ring darum:
// orange und langsam pulsierend, solange man sie nicht angesehen hat, danach grau.
// Mit `onOpen` ist der Avatar ein Knopf (z.B. Story öffnen).
export function CapticAvatar({
  character,
  size = 40,
  ring = true,
  className = "",
  onOpen,
  label,
}: {
  character: Pick<Character, "id" | "faceclaim_image_url" | "phone">;
  size?: number;
  ring?: boolean; // false: nie ein Story-Ring (z.B. in der Story selbst)
  className?: string;
  onOpen?: () => void;
  label?: string;
}) {
  const { capticStoryState } = useStore();
  const state = ring ? capticStoryState(character.id) : "none";
  const gap = size >= 56 ? 3 : 2; // Abstand zwischen Bild und Ring
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={capticAvatarUrl(character)}
      alt=""
      style={{ width: size, height: size }}
      className="block rounded-full bg-bg-surface-2 object-cover"
    />
  );
  const shell = `inline-block shrink-0 rounded-full ${
    state === "new" ? "captic-ring" : state === "seen" ? "captic-ring-seen" : ""
  } ${className}`;
  // der Abstand bleibt auch ohne Ring, damit nichts springt, wenn eine Story dazukommt
  const style = { padding: gap, margin: 2 };
  return onOpen ? (
    <button type="button" onClick={onOpen} aria-label={label} title={label} style={style} className={shell}>
      {img}
    </button>
  ) : (
    <span style={style} className={shell}>
      {img}
    </span>
  );
}
