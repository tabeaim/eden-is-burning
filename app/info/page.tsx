"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";

// Info: Einstieg zu den Unterseiten, als Karten
const SECTIONS: { href: string; title: string; text: string; icon: IconName }[] = [
  {
    href: "/info/eden",
    title: "Alles über Eden & D.C", // der Punkt kommt aus der Überschrift
    text: "Die Stadt, ihre Gegenden und Washington D.C. - alles, was man zum Spielen wissen muss.",
    icon: "map",
  },
  {
    href: "/info/grafikregeln",
    title: "Grafikregeln",
    text: "Formate und Regeln für Avatare, Banner und andere Grafiken.",
    icon: "photo",
  },
];

export default function InfoPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader title="Info" subtitle="Die Welt von Eden" width="max-w-6xl" />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col rounded-xl border border-border-subtle bg-bg-surface p-5 transition-colors hover:bg-white/[0.03]"
          >
            <span className="text-accent">
              <Icon name={s.icon} size={22} />
            </span>
            <h2 className="mt-3 font-display lowercase text-[1.625rem] leading-none text-text-primary">
              {s.title}
              <span className="text-accent">.</span>
            </h2>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-text-secondary">{s.text}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-[0.8125rem] text-text-tertiary group-hover:text-accent">
              Öffnen <Icon name="arrow-right" size={12} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
