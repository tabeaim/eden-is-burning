"use client";

import { useMemo } from "react";
import { signatureHtml } from "@/lib/html";

export type SignatureAlign = "left" | "center" | "right";

// Ausrichtung der Signatur (Einstellungen → Meine Charaktere): zentriert, wenn
// nichts anderes gewählt ist. `text` für die Text-Signatur, `image` fürs Bild.
export function signatureAlign(align: SignatureAlign | null | undefined) {
  if (align === "left") return { text: "text-left", image: "" };
  if (align === "right") return { text: "text-right", image: "ml-auto" };
  return { text: "text-center", image: "mx-auto" };
}

// Text-Signatur eines Charakters (reiner Text oder HTML) – klein und grau, sofern
// das HTML nichts anderes vorgibt; sehr hohe Signaturen werden abgeschnitten.
export function SignatureText({
  html,
  align,
  className = "",
}: {
  html: string;
  align?: SignatureAlign | null;
  className?: string;
}) {
  const inner = useMemo(() => ({ __html: signatureHtml(html) }), [html]);
  return (
    <div
      className={`${className} ${signatureAlign(align).text} max-h-60 overflow-hidden break-words text-[0.8125rem] leading-relaxed text-text-tertiary [&_a]:underline [&_a:hover]:text-accent [&_img]:inline-block [&_img]:max-h-40 [&_img]:max-w-full`}
      dangerouslySetInnerHTML={inner}
    />
  );
}
