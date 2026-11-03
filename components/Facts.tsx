// Fakten-Liste (siehe DESIGN.md): Label fett in Großbuchstaben, ohne Doppelpunkt,
// Wert daneben in normaler Schreibweise und Textgröße; lange Werte brechen um, statt aus der Spalte zu laufen.
// `subgrid`: übernimmt die Spalten des umgebenden Rasters – so beginnen die Werte
// mehrerer Listen untereinander auf derselben Linie (Facts-Kasten im Profil).
export function Facts({
  className = "",
  subgrid = false,
  children,
}: {
  className?: string;
  subgrid?: boolean;
  children: React.ReactNode;
}) {
  const cols = subgrid ? "col-span-2 grid-cols-subgrid" : "grid-cols-[max-content_minmax(0,1fr)]";
  return (
    <dl
      className={`${className} grid ${cols} items-baseline gap-x-8 gap-y-1.5 text-[0.875rem]`}
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
      <dt className="text-[0.75rem] font-bold uppercase tracking-wider text-text-tertiary/80">
        {label}
      </dt>
      <dd className="break-words text-text-primary">{shown}</dd>
    </>
  );
}
