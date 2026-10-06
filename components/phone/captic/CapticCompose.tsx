"use client";

import { useRef, useState } from "react";
import type { CapticKind, CapticPost, Character, ThingCrop } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  IMAGE_SIZES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  imageRatio,
  uploadAnimation,
  uploadImage,
  uploadVideo,
} from "@/lib/images";
import { parseCount } from "@/lib/captic";
import { Icon } from "@/components/Icon";
import { CropDialog } from "@/components/CropDialog";
import { DatePicker } from "@/components/DatePicker";
import { EmojiPicker } from "../EmojiPicker";
import { GifPicker } from "../GifPicker";
import { CapticMedia } from "./CapticPost";
import { MentionSuggest, normalizeMentions, useCapticProfiles } from "./CapticMentions";

type Media = Pick<CapticPost, "kind" | "url" | "poster_url" | "ar">;

// Videos sind abgeschaltet: Sie gehen unverkleinert in den Speicher (bis 25 MB je
// Video) und würden das gemeinsame Kontingent schnell füllen. Auf `true` stellen
// schaltet den Upload wieder frei – Anzeige und Speichern sind weiter vorhanden.
const VIDEO_UPLOAD = false;

const CROP_RATIOS = [
  { label: "Quadrat", value: 1 },
  { label: "Hoch 4:5", value: 4 / 5 },
  { label: "Quer", value: 1.91 },
];

const STORY_RATIOS = [
  { label: "Story 9:16", value: 9 / 16 },
  ...CROP_RATIOS.slice(0, 2),
];

export const capticField =
  "w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] text-text-primary outline-none focus:border-white/25 sm:text-[0.875rem]";

// Neuer Beitrag (Foto mit Zuschnitt oder GIF; Videos siehe VIDEO_UPLOAD) bzw. einen
// vorhandenen bearbeiten – dann bleibt das Medium, wie es ist.
export function CapticCompose({
  me,
  post,
  story = false,
  onDone,
  onCancel,
}: {
  me: Character;
  post?: CapticPost; // vorhanden: bearbeiten
  story?: boolean; // Story statt Beitrag: nur Medium und Text
  onDone: (postId: string) => void;
  onCancel: () => void;
}) {
  const { addCapticPost, updateCapticPost, addCapticStory } = useStore();
  const [media, setMedia] = useState<Media | null>(post ?? null);
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [likes, setLikes] = useState(post ? String(post.likes) : "");
  const [date, setDate] = useState(post?.inplay_date ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | "gif" | "emoji">(null);
  const [cropping, setCropping] = useState<{ file: File; src: string } | null>(
    null,
  );
  const file = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const profiles = useCapticProfiles().list;

  async function run(label: string, work: () => Promise<Media>) {
    setBusy(label);
    setError(null);
    try {
      setMedia(await work());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Das hat nicht geklappt.");
    } finally {
      setBusy(null);
    }
  }

  function pick(f: File | undefined) {
    if (!f) return;
    setPanel(null);
    if (f.type.startsWith("video/") && !VIDEO_UPLOAD) {
      setError("Videos gehen hier nicht – bitte ein Bild oder GIF auswählen.");
    } else if (f.type.startsWith("video/")) {
      void run("Video wird hochgeladen …", async () => {
        const v = await uploadVideo(f, "captic");
        return { kind: "video", url: v.url, poster_url: v.poster, ar: v.ar };
      });
    } else if (f.type === "image/gif") {
      // Animationen bleiben unverändert (sonst bliebe nur das erste Bild)
      void run("GIF wird hochgeladen …", async () => {
        const url = await uploadAnimation(f, "captic");
        const poster = await uploadImage(f, "captic", IMAGE_SIZES.capticPoster);
        return {
          kind: "gif",
          url,
          poster_url: poster,
          ar: await imageRatio(url),
        };
      });
    } else if (f.type.startsWith("image/")) {
      setCropping({ file: f, src: URL.createObjectURL(f) });
    } else {
      setError("Bitte ein Bild, GIF oder Video auswählen.");
    }
  }

  function cropped(crop: ThingCrop | null) {
    const c = cropping;
    if (!c) return;
    setCropping(null);
    void run("Bild wird hochgeladen …", async () => {
      try {
        const url = await uploadImage(
          c.file,
          "captic",
          IMAGE_SIZES.captic,
          crop,
        );
        return {
          kind: "image",
          url,
          poster_url: null,
          ar: await imageRatio(url),
        };
      } finally {
        URL.revokeObjectURL(c.src);
      }
    });
  }

  function pickGif(url: string) {
    setPanel(null);
    void run("GIF wird geladen …", async () => {
      const ar = await imageRatio(url);
      if (!ar) throw new Error("Das GIF konnte nicht geladen werden.");
      return { kind: "gif" as CapticKind, url, poster_url: null, ar };
    });
  }

  function insertEmoji(emoji: string) {
    const el = area.current;
    const at = el ? el.selectionStart : caption.length;
    const end = el ? el.selectionEnd : caption.length;
    setCaption(caption.slice(0, at) + emoji + caption.slice(end));
    requestAnimationFrame(() =>
      el?.setSelectionRange(at + emoji.length, at + emoji.length),
    );
  }

  function share() {
    if (!media) return;
    const text = normalizeMentions(caption.trim(), profiles);
    if (story) {
      onDone(
        addCapticStory({
          character_id: me.id,
          kind: media.kind,
          url: media.url,
          ar: media.ar,
          caption: text,
        }),
      );
      return;
    }
    const fields = {
      caption: text,
      likes: parseCount(likes) ?? 0,
      inplay_date: date || null,
    };
    if (post) {
      updateCapticPost(post.id, fields);
      onDone(post.id);
    } else {
      onDone(addCapticPost({ character_id: me.id, ...media, ...fields }));
    }
  }

  const source =
    "flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-white/[0.05] px-2 py-5 text-[0.8125rem] text-text-secondary hover:bg-white/[0.09] disabled:opacity-50";
  const label = "text-[0.75rem] text-text-tertiary";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {media ? (
        <div>
          <CapticMedia
            post={{
              ...media,
              id: "preview",
              character_id: me.id,
              caption: "",
              likes: 0,
              created_at: "",
            }}
          />
          {!post && (
            <button
              onClick={() => setMedia(null)}
              className="px-3 pt-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Anderes Medium wählen
            </button>
          )}
        </div>
      ) : (
        <div className="px-3 pt-3">
          <div className="flex gap-2">
            <button
              onClick={() => file.current?.click()}
              disabled={!!busy}
              className={source}
            >
              <Icon name="photo" size={24} />
              {VIDEO_UPLOAD ? "Foto oder Video" : "Foto oder GIF"}
            </button>
            <button
              onClick={() => setPanel((p) => (p === "gif" ? null : "gif"))}
              disabled={!!busy}
              className={source}
            >
              <span className="text-[0.9375rem] font-bold leading-6">GIF</span>
              GIF suchen
            </button>
          </div>
          <input
            ref={file}
            type="file"
            accept={
              VIDEO_UPLOAD
                ? "image/*,video/mp4,video/webm,video/quicktime"
                : "image/*"
            }
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {panel === "gif" && <GifPicker onPick={pickGif} />}
          <p className="mt-2 text-[0.75rem] leading-snug text-text-tertiary">
            Fotos lassen sich zuschneiden.{" "}
            {VIDEO_UPLOAD &&
              `Videos (mit Ton) bis ${MAX_VIDEO_SECONDS} Sekunden und ${MAX_VIDEO_BYTES / 1024 / 1024} MB. `}
            GIFs aus der Suche brauchen keinen Speicher, eigene GIF-Dateien bis
            8 MB.
          </p>
        </div>
      )}

      {busy && (
        <p className="px-3 pt-3 text-[0.8125rem] text-text-secondary">{busy}</p>
      )}
      {error && (
        <p className="px-3 pt-3 text-[0.8125rem] text-red-300">{error}</p>
      )}

      <div className="flex flex-col gap-3 px-3 py-3">
        <label className={label}>
          <span className="flex items-center justify-between">
            {story ? "Text (optional)" : "Bildunterschrift"}
            <button
              type="button"
              onClick={() => setPanel((p) => (p === "emoji" ? null : "emoji"))}
              aria-label="Emojis"
              className="text-[1.125rem] leading-none"
            >
              🙂
            </button>
          </span>
          <textarea
            ref={area}
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            maxLength={story ? 200 : 2200}
            rows={story ? 2 : 3}
            className={`mt-1 resize-none ${capticField}`}
          />
        </label>
        <MentionSuggest
          value={caption}
          caret={caret}
          onPick={(value, at) => {
            setCaption(value);
            setCaret(at);
            requestAnimationFrame(() => area.current?.setSelectionRange(at, at));
          }}
        />
        {panel === "emoji" && <EmojiPicker onPick={insertEmoji} />}
        {!story && (
          <>
            <label className={label}>
              Likes
              <input
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className={`mt-1 ${capticField}`}
              />
            </label>
            <div className={label}>
              Inplay-Datum (optional)
              <DatePicker value={date} onChange={setDate} className="mt-1" />
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
          >
            Abbrechen
          </button>
          <button
            onClick={share}
            disabled={!media || !!busy}
            className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black hover:bg-accent disabled:opacity-40"
          >
            {post ? "Speichern" : story ? "Zur Story hinzufügen" : "Teilen"}
          </button>
        </div>
      </div>

      {cropping && (
        <CropDialog
          src={cropping.src}
          ratios={story ? STORY_RATIOS : CROP_RATIOS}
          hint="Hochgeladen wird nur der Ausschnitt."
          onDone={cropped}
          onCancel={() => {
            URL.revokeObjectURL(cropping.src);
            setCropping(null);
          }}
        />
      )}
    </div>
  );
}
