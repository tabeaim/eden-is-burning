"use client";

import { useEffect, useRef, useState } from "react";
import { useProseEditor } from "@/lib/editor";
import { signatureHtml } from "@/lib/html";

const toolBtn =
  "rounded px-2 py-1 text-[0.875rem] text-text-secondary hover:text-text-primary hover:bg-white/[0.06]";

// Texteditor für alles, was als gestaltete Seite erscheint (Profile, Orte, Bezirke,
// Info-Seiten): dieselbe Leiste wie im Post-Editor (fett, kursiv, unterstrichen,
// größer, kleiner), deutsche Typografie beim Tippen, Formatierung beim Einfügen.
// Liefert HTML; angezeigt wird es mit `RichText`. Reiner Text (Altbestand) wird beim
// Öffnen mit seinen Zeilenumbrüchen übernommen.
export function RichEditor({
  value,
  onChange,
  placeholder,
  maxLength,
  minHeight = "min-h-[6rem]",
  className = "",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number; // höchstens so viele Zeichen Text (ohne Formatierung)
  minHeight?: string; // Tailwind-Klasse
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useProseEditor(ref);
  // Was der Editor zuletzt selbst gemeldet hat – nur wenn der Wert von außen
  // abweicht (öffnen, zurücksetzen, Eintrag davor gelöscht), wird das Feld neu gefüllt.
  const emitted = useRef<string | null>(null);
  useEffect(() => {
    if (ref.current && value !== emitted.current) {
      ref.current.innerHTML = signatureHtml(value);
      emitted.current = value;
    }
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const empty = !el.textContent?.trim() && !el.querySelector("img");
    // Der Browser lässt nach dem Leeren ein <br> stehen – dann greift der Platzhalter nicht
    if (empty && el.innerHTML) el.innerHTML = "";
    emitted.current = empty ? "" : el.innerHTML;
    onChange(emitted.current);
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  }

  // Längengrenze: weiteres Tippen/Einfügen blockieren, Löschen bleibt möglich
  useEffect(() => {
    const el = ref.current;
    if (!el || !maxLength) return;
    const limit = (e: InputEvent) => {
      if (!e.inputType.startsWith("insert")) return;
      const selected = window.getSelection()?.toString().length ?? 0;
      if ((el.textContent?.length ?? 0) - selected >= maxLength) e.preventDefault();
    };
    el.addEventListener("beforeinput", limit);
    return () => el.removeEventListener("beforeinput", limit);
  }, [maxLength]);

  // Leisten-Tasten: Mausklick darf die Textauswahl nicht aufheben
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-primary px-1.5 py-1">
        <button type="button" onMouseDown={keep} onClick={() => exec("bold")} className={`${toolBtn} font-bold`} title="Fett">
          B
        </button>
        <button type="button" onMouseDown={keep} onClick={() => exec("italic")} className={`${toolBtn} italic`} title="Kursiv">
          I
        </button>
        <button
          type="button"
          onMouseDown={keep}
          onClick={() => exec("underline")}
          className={`${toolBtn} underline`}
          title="Unterstrichen"
        >
          U
        </button>
        <span className="mx-1 h-4 w-px bg-border-subtle" />
        <button type="button" onMouseDown={keep} onClick={() => exec("fontSize", "5")} className={toolBtn} title="Größer">
          A+
        </button>
        <button type="button" onMouseDown={keep} onClick={() => exec("fontSize", "2")} className={toolBtn} title="Kleiner">
          A−
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        lang="de"
        spellCheck
        data-placeholder={placeholder}
        onInput={emit}
        className={`reply-editor ${minHeight} w-full whitespace-pre-wrap break-words rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[0.875rem] leading-relaxed text-text-primary outline-none focus:border-white/20 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5`}
      />
    </div>
  );
}

// Wie `RichEditor`, speichert aber erst beim Verlassen des Felds (für Stellen ohne
// Speichern-Knopf, z. B. im Admin).
export function CommitRichEditor({
  value,
  onCommit,
  ...rest
}: { value: string; onCommit: (html: string) => void } & Omit<Parameters<typeof RichEditor>[0], "value" | "onChange">) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div
      onBlur={(e) => {
        // Wechsel zwischen Leiste und Textfeld zählt nicht als Verlassen
        if (e.currentTarget.contains(e.relatedTarget)) return;
        if (draft !== null && draft !== value) onCommit(draft);
        setDraft(null);
      }}
    >
      <RichEditor {...rest} value={draft ?? value} onChange={setDraft} />
    </div>
  );
}
