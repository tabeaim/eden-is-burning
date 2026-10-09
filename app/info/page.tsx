"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";
import { infoIcon, infoPages, infoSlug } from "@/lib/info";

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Info: Einstieg zu den Unterseiten, als Karten. Admins legen hier neue Seiten an;
// bearbeitet wird auf der jeweiligen Seite.
export default function InfoPage() {
  const router = useRouter();
  const { appSettings, updateAppSettings, isAdmin } = useStore();
  const pages = infoPages(appSettings);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  // Neue Seite → direkt dorthin, im Bearbeiten-Modus
  function create(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    const id = infoSlug(name, pages.map((p) => p.id));
    updateAppSettings({ infoPages: [...pages, { id, title: name, text: "", icon: "info", content: "" }] });
    router.push(`/info/${id}#bearbeiten`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader title="Info" subtitle="Die Welt von Eden" width="max-w-6xl">
        {isAdmin && (
          <button
            onClick={() => setAdding((a) => !a)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8125rem] transition-colors ${
              adding
                ? "border-accent/50 text-accent"
                : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon name="plus" size={13} /> Neue Seite
          </button>
        )}
      </PageHeader>

      {isAdmin && adding && (
        <form
          onSubmit={create}
          className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4"
        >
          <label className="min-w-[220px] flex-1 text-[0.875rem] text-text-secondary">
            Titel der neuen Seite
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="z.B. Regeln"
              className={`mt-1 ${field}`}
            />
          </label>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="px-2 py-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
          >
            Abbrechen
          </button>
          <button
            disabled={!title.trim()}
            className="rounded-md bg-accent/90 px-3 py-2 text-[0.8125rem] font-medium text-black hover:bg-accent disabled:opacity-40"
          >
            Anlegen
          </button>
        </form>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((p) => (
          <Link
            key={p.id}
            href={`/info/${p.id}`}
            className="group flex flex-col rounded-xl border border-border-subtle bg-bg-surface p-5 transition-colors hover:bg-white/[0.03]"
          >
            <span className="text-accent">
              <Icon name={infoIcon(p)} size={22} />
            </span>
            <h2 className="mt-3 font-display lowercase text-[1.625rem] leading-none text-text-primary">
              {p.title}
              <span className="text-accent">.</span>
            </h2>
            {p.text && <p className="mt-2 text-[0.875rem] leading-relaxed text-text-secondary">{p.text}</p>}
            <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[0.8125rem] text-text-tertiary group-hover:text-accent">
              Öffnen <Icon name="arrow-right" size={12} />
            </span>
          </Link>
        ))}
      </div>
      {pages.length === 0 && <p className="text-[0.875rem] text-text-tertiary">Noch keine Info-Seiten.</p>}
    </div>
  );
}
