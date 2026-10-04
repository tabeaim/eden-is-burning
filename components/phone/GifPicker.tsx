"use client";

import { useEffect, useState } from "react";

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

type Gif = { id: string; preview: string; url: string; title: string };

type GiphyItem = {
  id: string;
  title: string;
  images: Record<string, { url?: string; webp?: string } | undefined>;
};

// GIF-Auswahl: Suche über GIPHY (wenn ein Schlüssel hinterlegt ist), sonst — und
// zusätzlich — ein Feld, um die Adresse eines GIFs einzufügen.
export function GifPicker({ onPick }: { onPick: (url: string) => void }) {
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!GIPHY_KEY) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setState("loading");
      const term = q.trim();
      const base = `https://api.giphy.com/v1/gifs/${term ? "search" : "trending"}`;
      const params = new URLSearchParams({ api_key: GIPHY_KEY, limit: "24", rating: "pg-13" });
      if (term) {
        params.set("q", term);
        params.set("lang", "de");
      }
      try {
        const res = await fetch(`${base}?${params}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { data: GiphyItem[] };
        setGifs(
          json.data.flatMap((g) => {
            const preview = g.images.fixed_width?.webp ?? g.images.fixed_width?.url;
            const url = g.images.downsized?.url ?? g.images.original?.url;
            return preview && url ? [{ id: g.id, preview, url, title: g.title }] : [];
          }),
        );
        setState("idle");
      } catch {
        if (!ctrl.signal.aborted) setState("error");
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const linkOk = /^https:\/\/\S+$/i.test(link.trim());
  const field =
    "min-w-0 flex-1 rounded-full border border-border-subtle bg-bg-primary px-3 py-1.5 text-[16px] sm:text-[0.875rem] text-text-primary outline-none focus:border-white/25";

  return (
    <div className="mt-2">
      {GIPHY_KEY && (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="GIFs suchen…"
            className={`${field} w-full`}
          />
          <div className="mt-1.5 h-48 overflow-y-auto">
            {state === "error" && (
              <p className="p-3 text-[0.8125rem] text-text-tertiary">
                Die GIF-Suche ist gerade nicht erreichbar.
              </p>
            )}
            {state !== "error" && gifs.length === 0 && (
              <p className="p-3 text-[0.8125rem] text-text-tertiary">
                {state === "loading" ? "Suche…" : "Nichts gefunden."}
              </p>
            )}
            <div className="columns-2 gap-1.5">
              {gifs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onPick(g.url)}
                  className="mb-1.5 block w-full overflow-hidden rounded-lg bg-bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.preview} alt={g.title} loading="lazy" className="w-full" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1 text-right text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
            Powered by GIPHY
          </div>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!linkOk) return;
          onPick(link.trim());
          setLink("");
        }}
        className="mt-1.5 flex items-center gap-1.5"
      >
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="GIF-Link einfügen (https://…)"
          inputMode="url"
          className={field}
        />
        <button
          type="submit"
          disabled={!linkOk}
          className="rounded-full bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
