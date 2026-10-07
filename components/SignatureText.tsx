"use client";

import { useMemo } from "react";
import { signatureHtml } from "@/lib/html";

// Text-Signatur eines Charakters (reiner Text oder HTML) – klein und grau, sofern
// das HTML nichts anderes vorgibt; sehr hohe Signaturen werden abgeschnitten.
export function SignatureText({ html, className = "" }: { html: string; className?: string }) {
  const inner = useMemo(() => ({ __html: signatureHtml(html) }), [html]);
  return (
    <div
      className={`${className} max-h-60 overflow-hidden break-words text-[0.8125rem] leading-relaxed text-text-tertiary [&_a]:underline [&_a:hover]:text-accent [&_img]:inline-block [&_img]:max-h-40 [&_img]:max-w-full`}
      dangerouslySetInnerHTML={inner}
    />
  );
}
