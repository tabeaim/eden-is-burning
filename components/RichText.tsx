"use client";

import { useMemo } from "react";
import { signatureHtml } from "@/lib/html";

// Frei geschriebener Profiltext (Kurzbeschreibung, About, Zitat, Timeline …):
// reiner Text oder HTML, entschärft wie die Text-Signatur (siehe signatureHtml).
// Zeilenumbrüche bleiben in beiden Fällen stehen; Größe und Farbe gibt die
// Stelle per `className` vor, sofern das HTML nichts anderes sagt.
export function RichText({
  html,
  className = "",
  inline = false,
}: {
  html: string;
  className?: string;
  inline?: boolean; // als <span> im Fließtext (z. B. Zitat hinter dem Anführungszeichen)
}) {
  const inner = useMemo(() => ({ __html: signatureHtml(html) }), [html]);
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      className={`${className} whitespace-pre-wrap break-words [&_a]:underline [&_a:hover]:text-accent [&_img]:inline-block [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5`}
      dangerouslySetInnerHTML={inner}
    />
  );
}
