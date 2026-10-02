"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";

// Info-Unterseite — Inhalt folgt
export default function InfoSubPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader title="Alles über Eden & D.C" width="max-w-6xl" />

      <div className="max-w-2xl">
        <p className="text-[0.875rem] text-text-tertiary">Hier entsteht gerade der Inhalt.</p>
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
