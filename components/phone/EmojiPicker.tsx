"use client";

import { useState } from "react";
import { EMOJI_GROUPS } from "@/lib/emoji";

// Emoji-Tastatur: Reiter je Gruppe, darunter das Raster.
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [group, setGroup] = useState(EMOJI_GROUPS[0].key);
  const current = EMOJI_GROUPS.find((g) => g.key === group) ?? EMOJI_GROUPS[0];
  return (
    <div className="mt-2">
      <div className="flex gap-1 border-b border-border-subtle pb-1">
        {EMOJI_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            title={g.label}
            aria-label={g.label}
            onClick={() => setGroup(g.key)}
            className={`flex-1 rounded-md py-1 text-[1.125rem] leading-none ${
              g.key === group ? "bg-white/[0.08]" : "opacity-60 hover:opacity-100"
            }`}
          >
            {g.icon}
          </button>
        ))}
      </div>
      <div className="grid h-44 grid-cols-8 content-start gap-0.5 overflow-y-auto pt-1.5">
        {current.emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className="flex aspect-square items-center justify-center rounded-md text-[1.375rem] leading-none hover:bg-white/[0.08]"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
