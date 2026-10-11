// Fakten-Liste (siehe DESIGN.md): Label fett in Großbuchstaben, ohne Doppelpunkt,
// Wert daneben in normaler Schreibweise und Textgröße; lange Werte brechen um, statt aus der Spalte zu laufen.
export function Facts({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <dl
      className={`${className} grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-6 gap-y-1.5 text-[0.875rem]`}
    >
      {children}
    </dl>
  );
}

// Eine Zeile der Fakten-Liste; ohne Wert entfällt sie ganz.
export function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  // Werte beginnen immer mit einem Großbuchstaben, egal wie sie eingetragen wurden
  const shown = typeof value === "string" ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  return (
    <>
      <dt className="text-[0.75rem] font-bold uppercase tracking-wider text-text-tertiary">
        {label}
      </dt>
      <dd className="break-words text-text-primary">{shown}</dd>
    </>
  );
}
