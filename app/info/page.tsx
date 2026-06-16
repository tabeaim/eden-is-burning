"use client";

import { AREA_ORDER, AREAS } from "@/lib/world";
import { PageHeader } from "@/components/PageHeader";

export default function InfoPage() {
  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <PageHeader title="Info — Die Welt von Eden" />

      <div className="prose-serif !text-left text-text-secondary space-y-3">
        <p>
          <strong className="text-text-primary">Eden</strong> ist eine fiktive
          Stadt im Norden Virginias, etwa 50&nbsp;km südlich von Washington,
          D.C., direkt am Potomac River. Rund 120.000 Einwohner*innen und eine
          der wohlhabendsten Städte Virginias. Washington&nbsp;D.C. ist
          ebenfalls bespielbar.
        </p>
      </div>

      <h2 className="text-[12px] uppercase tracking-[0.16em] text-text-secondary mt-8 mb-3">
        Die Bezirke
      </h2>
      <div className="flex flex-col gap-3">
        {AREA_ORDER.map((k) => (
          <div
            key={k}
            className="rounded-xl border border-border-subtle bg-bg-surface p-4"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-serif text-[16px] text-text-primary">
                {AREAS[k].name}
              </h3>
              <span className="text-[12px] text-text-tertiary">
                {AREAS[k].priceLevel}
              </span>
            </div>
            <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
              {AREAS[k].character}
            </p>
          </div>
        ))}
      </div>

      <h2 className="text-[12px] uppercase tracking-[0.16em] text-text-secondary mt-8 mb-3">
        Bildung
      </h2>
      <div className="prose-serif !text-left text-text-secondary space-y-3">
        <p>
          <strong className="text-text-primary">Byron University</strong> —
          fiktive Ivy League, ~15.000 Studierende, riesiger Campus mit Locker
          Room, Library, Football Field und Cafeteria.
        </p>
        <p>
          <strong className="text-text-primary">Sutton Academy</strong> —
          Privatschule mit Internat und Schuluniform. Früher „Abercrombie
          Academy", 2019 umbenannt nach einem Amoklauf durch Nathan Abercrombie.
        </p>
        <p>
          <strong className="text-text-primary">Eden High School</strong> —
          öffentliche High School, chronischer Geldmangel, aber enormer
          Schüler-Spirit.
        </p>
      </div>
    </div>
  );
}
