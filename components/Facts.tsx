// Fakten-Liste (siehe DESIGN.md): Label fett in Großbuchstaben mit Doppelpunkt,
// Wert daneben in derselben Schrift (Großbuchstaben, gleiche Größe), nur nicht fett; lange Werte brechen um, statt aus der Spalte zu laufen.
export function Facts({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <dl
      className={`${className} grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5 text-[0.875rem]`}
    >
      {children}
    </dl>
  );
}

// Eine Zeile der Fakten-Liste; ohne Wert entfällt sie ganz.
export function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <>
      <dt className="text-[0.75rem] font-bold uppercase tracking-wider text-text-tertiary">
        {label}:
      </dt>
      <dd className="break-words text-[0.75rem] uppercase tracking-wider text-text-secondary">{value}</dd>
    </>
  );
}
