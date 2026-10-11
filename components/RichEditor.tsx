"use client";

import { useEffect, useRef, useState } from "react";
import { stepFontSize, useProseEditor } from "@/lib/editor";
import { signatureHtml } from "@/lib/html";

const toolBtn =
  "rounded px-2 py-1 text-[0.875rem] text-text-secondary hover:text-text-primary hover:bg-white/[0.06]";

// Formatierungsleiste aller Texteditoren (auch des Post-Editors): fett, kursiv,
// unterstrichen, Liste mit Aufzählungspunkten, Schrift größer/kleiner in feinen Stufen. `target` ist das
// contentEditable-Feld, `onChange` meldet, dass sich sein Inhalt geändert hat.
export function FormatBar({
  target,
  onChange,
  className = "",
}: {
  target: React.RefObject<HTMLElement | null>;
  onChange?: () => void;
  className?: string;
}) {
  const run = (action: () => void) => () => {
    target.current?.focus();
    action();
    onChange?.();
  };
  const exec = (cmd: string) => run(() => document.execCommand(cmd, false));
  // Mausklick darf die Textauswahl nicht aufheben
  const keep = (e: React.MouseEvent) => e.preventDefault();
  return (
    <div className={`flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-primary px-1.5 py-1 ${className}`}>
      <button type="button" onMouseDown={keep} onClick={exec("bold")} className={`${toolBtn} font-bold`} title="Fett">
        B
      </button>
      <button type="button" onMouseDown={keep} onClick={exec("italic")} className={`${toolBtn} italic`} title="Kursiv">
        I
      </button>
      <button type="button" onMouseDown={keep} onClick={exec("underline")} className={`${toolBtn} underline`} title="Unterstrichen">
        U
      </button>
      <button
        type="button"
        onMouseDown={keep}
        onClick={exec("insertUnorderedList")}
        className={toolBtn}
        title="Liste mit Aufzählungspunkten"
        aria-label="Liste mit Aufzählungspunkten"
      >
        <span aria-hidden className="text-accent">•</span> Liste
      </button>
      <span className="mx-1 h-4 w-px bg-border-subtle" />
      <button
        type="button"
        onMouseDown={keep}
        onClick={run(() => stepFontSize(target.current, 1))}
        className={toolBtn}
        title="Schrift etwas größer"
      >
        A+
      </button>
      <button
        type="button"
        onMouseDown={keep}
        onClick={run(() => stepFontSize(target.current, -1))}
        className={toolBtn}
        title="Schrift etwas kleiner"
      >
        A−
      </button>
    </div>
  );
}

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

  return (
    <div className={className}>
      <FormatBar target={ref} onChange={emit} className="mb-1" />
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
        className={`reply-editor ${minHeight} w-full whitespace-pre-wrap break-words rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[0.875rem] leading-relaxed text-text-primary outline-none focus:border-white/20`}
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
