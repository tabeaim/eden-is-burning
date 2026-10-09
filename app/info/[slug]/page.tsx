"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { RichText } from "@/components/RichText";
import { RichEditor } from "@/components/RichEditor";
import { useStore } from "@/lib/store";
import { INFO_ICONS, infoPages } from "@/lib/info";
import type { InfoPage } from "@/lib/types";

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Info-Unterseite. Admins bearbeiten sie direkt hier (Titel, Kurztext der Karte,
// Icon, Inhalt, Reihenfolge) und können sie löschen.
export default function InfoSubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { appSettings, isAdmin } = useStore();
  const page = infoPages(appSettings).find((p) => p.id === slug);
  // Frisch angelegte Seiten öffnen gleich im Bearbeiten-Modus (/info/<id>#bearbeiten)
  const [editing, setEditing] = useState(() => typeof window !== "undefined" && window.location.hash === "#bearbeiten");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader title={page?.title ?? "Info"} width="max-w-6xl">
        {isAdmin && page && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-primary px-2.5 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
          >
            <Icon name="edit" size={13} /> Bearbeiten
          </button>
        )}
      </PageHeader>

      {page && isAdmin && editing && <InfoEditPanel key={page.id} page={page} onClose={() => setEditing(false)} />}

      <div className="max-w-2xl">
        {!page ? (
          <p className="text-[0.875rem] text-text-tertiary">Diese Seite gibt es nicht (mehr).</p>
        ) : page.content.trim() ? (
          <RichText html={page.content} className="text-[0.875rem] leading-relaxed text-text-secondary" />
        ) : (
          <p className="text-[0.875rem] text-text-tertiary">Hier entsteht gerade der Inhalt.</p>
        )}
        <Link
          href="/info"
          className="mt-6 inline-flex items-center gap-1 text-[0.875rem] text-text-secondary hover:text-accent"
        >
          <Icon name="arrow-right" size={12} className="rotate-180" /> Zurück zur Info
        </Link>
      </div>
    </div>
  );
}

function InfoEditPanel({ page, onClose }: { page: InfoPage; onClose: () => void }) {
  const router = useRouter();
  const { appSettings, updateAppSettings } = useStore();
  const pages = infoPages(appSettings);
  const index = pages.findIndex((p) => p.id === page.id);
  const [title, setTitle] = useState(page.title);
  const [text, setText] = useState(page.text);
  const [icon, setIcon] = useState(page.icon);
  const [content, setContent] = useState(page.content);
  const [deleting, setDeleting] = useState(false);

  function save() {
    if (!title.trim()) return;
    updateAppSettings({
      infoPages: pages.map((p) =>
        p.id === page.id ? { ...p, title: title.trim(), text: text.trim(), icon, content: content.trim() } : p,
      ),
    });
    onClose();
  }

  // Platz in der Übersicht tauschen (speichert sofort)
  function move(by: -1 | 1) {
    const next = [...pages];
    const to = index + by;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    updateAppSettings({ infoPages: next });
  }

  function remove() {
    updateAppSettings({ infoPages: pages.filter((p) => p.id !== page.id) });
    router.push("/info");
  }

  return (
    <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="text-[0.8125rem] uppercase tracking-wider text-text-tertiary">Seite bearbeiten</div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="text-[0.875rem] text-text-secondary">
          Titel <span className="text-accent">*</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${field}`} />
        </label>
        <label className="text-[0.875rem] text-text-secondary">
          Icon
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className={`mt-1 ${field}`}>
            {INFO_ICONS.map(([k, name]) => (
              <option key={k} value={k} className="bg-bg-surface">
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="text-[0.875rem] text-text-secondary">
        Kurztext <span className="text-text-tertiary">(steht auf der Karte in der Info-Übersicht)</span>
        <input value={text} onChange={(e) => setText(e.target.value)} className={`mt-1 ${field}`} />
      </label>

      <div className="text-[0.875rem] text-text-secondary">
        Inhalt
        <RichEditor value={content} onChange={setContent} minHeight="min-h-[20rem]" className="mt-1" />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={() => setDeleting(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-500/10"
        >
          Seite löschen
        </button>
        <span className="mr-auto inline-flex items-center gap-1.5 text-[0.8125rem] text-text-tertiary">
          Reihenfolge
          <button
            onClick={() => move(-1)}
            disabled={index <= 0}
            title="In der Übersicht nach vorn"
            className="rounded-md border border-border-subtle bg-bg-primary px-2 py-1 text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            ←
          </button>
          <button
            onClick={() => move(1)}
            disabled={index >= pages.length - 1}
            title="In der Übersicht nach hinten"
            className="rounded-md border border-border-subtle bg-bg-primary px-2 py-1 text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            →
          </button>
        </span>
        <button onClick={onClose} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
          Abbrechen
        </button>
        <button
          onClick={save}
          disabled={!title.trim()}
          className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black hover:bg-accent disabled:opacity-40"
        >
          Speichern
        </button>
      </div>

      {deleting && (
        <ConfirmDialog
          title={`${page.title} löschen?`}
          text="Die Seite verschwindet samt Inhalt aus der Info. Das lässt sich nicht rückgängig machen."
          confirmLabel="Seite löschen"
          onCancel={() => setDeleting(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
