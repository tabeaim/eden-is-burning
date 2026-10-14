"use client";

import { createContext, useContext } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { characterImage } from "@/lib/avatar";
import { canSeeCaptic } from "@/lib/captic";

// Profilbild in Captic: das eigene Captic-Bild, sonst das Handy-Profilbild, sonst
// das Charakterbild.
export function capticAvatarUrl(c: Pick<Character, "faceclaim_image_url" | "phone">): string {
  return c.phone?.captic?.avatar || c.phone?.avatar || characterImage(c);
}

// Öffnet die Story eines Charakters (stellt `CapticApp` bereit) – damit führt
// jedes Profilbild mit Ring auf die Story, egal wo es steht.
export const CapticStoryContext = createContext<((characterId: string) => void) | null>(null);

// Aus wessen Sicht man gerade in Captic ist (stellt `CapticApp` bereit): Stories
// privater Profile zeigen sich nur, wenn dieser Charakter sie sehen darf.
export const CapticViewerContext = createContext<Pick<Character, "id" | "phone"> | null>(null);

// Avatar überall in Captic. Hat der Charakter eine Story, liegt ein Ring darum:
// grün und langsam pulsierend, solange man sie nicht angesehen hat, danach grau.
// Ein Klick auf einen Avatar mit Ring öffnet die Story; `onOpen` legt stattdessen
// eine eigene Aktion fest.
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
  const { capticStoryState, canWriteAs } = useStore();
  const openStory = useContext(CapticStoryContext);
  const viewer = useContext(CapticViewerContext);
  const visible = !viewer || canSeeCaptic(viewer, character, canWriteAs(character.id));
  const state = ring && visible ? capticStoryState(character.id) : "none";
  const story = state !== "none" && openStory ? () => openStory(character.id) : undefined;
  const action = onOpen ?? story;
  const hint = label ?? (action ? "Story ansehen" : undefined);
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
  return action ? (
    <button type="button" onClick={action} aria-label={hint} title={hint} style={style} className={shell}>
      {img}
    </button>
  ) : (
    <span style={style} className={shell}>
      {img}
    </span>
  );
}
