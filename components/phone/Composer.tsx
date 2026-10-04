"use client";

import { useRef, useState } from "react";
import type { ChatMessageKind } from "@/lib/types";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import { Icon } from "@/components/Icon";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { phoneIconBtn } from "./PhoneFrame";
import { addMinutes } from "@/lib/phone";

// Eingabezeile des Messengers: Inplay-Uhrzeit, Text, Emoji-Tastatur und im
// Plus-Menü GIF/Foto (`media`) und Tagestrenner (`onDate`). Die Auswahlfelder
// klappen wie eine Tastatur darunter auf.
export function Composer({
  onSend,
  onDate,
  media = true,
  time,
  onTime,
  placeholder = "Nachricht",
  above,
}: {
  onSend: (kind: ChatMessageKind, content: string) => void;
  onDate?: () => void; // „Inplay-Datum" im Plus-Menü
  media?: boolean; // GIFs und Fotos (das Burner Phone kann nur Text)
  time?: string; // Inplay-Uhrzeit der nächsten Nachricht („23:41")
  onTime?: (time: string) => void;
  placeholder?: string;
  above?: React.ReactNode; // z.B. die Vorschau der Nachricht, auf die geantwortet wird
}) {
  const [text, setText] = useState("");
  const [panel, setPanel] = useState<null | "emoji" | "gif" | "plus">(null);
  const [uploading, setUploading] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);

  function resize() {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function send() {
    if (!text.trim()) return;
    onSend("text", text);
    setText("");
    requestAnimationFrame(resize);
  }

  function insertEmoji(emoji: string) {
    const el = area.current;
    const at = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    setText(text.slice(0, at) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      el?.setSelectionRange(at + emoji.length, at + emoji.length);
      resize();
    });
  }

  async function sendPhoto(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    try {
      onSend("image", await uploadImage(f, "chat", IMAGE_SIZES.gallery));
    } finally {
      setUploading(false);
      setPanel(null);
    }
  }

  const toggle = (p: "emoji" | "gif" | "plus") => setPanel((cur) => (cur === p ? null : p));
  const menuBtn =
    "flex flex-1 flex-col items-center gap-1 rounded-xl bg-white/[0.05] px-2 py-3 text-[0.8125rem] text-text-secondary hover:bg-white/[0.09] disabled:opacity-50";

  return (
    <div className="shrink-0 border-t border-border-subtle bg-bg-surface px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {above}
      {time !== undefined && onTime && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[0.75rem] text-text-tertiary">
          <label className="flex items-center gap-1.5 rounded-full bg-white/[0.06] py-0.5 pl-2.5 pr-1.5">
            Uhrzeit
            <input
              type="time"
              value={time}
              onChange={(e) => e.target.value && onTime(e.target.value)}
              className="bg-transparent text-[16px] font-semibold text-text-primary outline-none [color-scheme:dark] sm:text-[0.8125rem]"
            />
          </label>
          {[1, 5, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onTime(addMinutes(time, n))}
              className="rounded-full bg-white/[0.06] px-2.5 py-1.5 font-semibold text-text-secondary hover:bg-white/[0.12]"
            >
              +{n}
            </button>
          ))}
          <span>Min</span>
        </div>
      )}
      <div className="flex items-end gap-1">
        {(media || onDate) && (
          <button
            type="button"
            onClick={() => toggle("plus")}
            aria-label="Anhängen"
            className={phoneIconBtn}
          >
            <Icon
              name="plus"
              size={22}
              className={`transition-transform ${panel === "plus" ? "rotate-45" : ""}`}
            />
          </button>
        )}
        <div className="flex min-w-0 flex-1 items-end rounded-[1.25rem] border border-border-subtle bg-bg-primary pl-3.5 pr-0.5">
          <textarea
            ref={area}
            value={text}
            rows={1}
            placeholder={placeholder}
            onChange={(e) => {
              setText(e.target.value);
              resize();
            }}
            onKeyDown={(e) => {
              // Am Rechner schickt Enter ab; auf dem Handy macht es eine neue Zeile
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
              if (window.matchMedia("(pointer: coarse)").matches) return;
              e.preventDefault();
              send();
            }}
            className="max-h-[120px] min-w-0 flex-1 resize-none bg-transparent py-2 text-[16px] leading-snug text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.9375rem]"
          />
          <button
            type="button"
            onClick={() => toggle("emoji")}
            aria-label="Emojis"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[1.25rem] leading-none ${
              panel === "emoji" ? "" : "opacity-70 grayscale hover:opacity-100"
            }`}
          >
            😊
          </button>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={!text.trim()}
          aria-label="Senden"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-black disabled:bg-white/[0.08] disabled:text-text-tertiary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5m-6 6 6-6 6 6" />
          </svg>
        </button>
      </div>

      {panel === "plus" && (
        <div className="mt-2 flex gap-1.5">
          {media && (
            <>
              <button type="button" onClick={() => setPanel("gif")} className={menuBtn}>
                <span className="rounded-md border border-current px-1 text-[0.6875rem] font-bold leading-[1.1rem]">
                  GIF
                </span>
                GIF
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => file.current?.click()}
                className={menuBtn}
              >
                <Icon name="photo" size={20} />
                {uploading ? "Lädt…" : "Foto"}
              </button>
            </>
          )}
          {onDate && (
            <button
              type="button"
              onClick={() => {
                setPanel(null);
                onDate();
              }}
              className={menuBtn}
            >
              <Icon name="calendar" size={20} />
              Inplay-Datum
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void sendPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}
      {panel === "emoji" && <EmojiPicker onPick={insertEmoji} />}
      {panel === "gif" && (
        <GifPicker
          onPick={(url) => {
            onSend("gif", url);
            setPanel(null);
          }}
        />
      )}
    </div>
  );
}
