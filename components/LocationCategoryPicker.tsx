"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LOCATION_CATEGORIES, guessCategory, type LocationCategory } from "@/lib/places";
import { Icon } from "./Icon";

// Kategorie eines Orts wählen (eine je Ort). Ohne Auswahl gilt die aus dem Namen
// erratene – sie ist blass vorgemerkt, damit man sieht, welches Icon der Ort bekäme.
export function LocationCategoryPicker({
  value,
  name,
  onChange,
}: {
  value: string | null;
  name: string; // für die erratene Kategorie
  onChange: (category: LocationCategory) => void;
}) {
  const guessed = !value && name.trim() ? guessCategory(name) : null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {LOCATION_CATEGORIES.map(([key, label, icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          title={guessed === key ? "Aus dem Namen erraten – antippen zum Festlegen" : undefined}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8125rem] transition-colors ${
            value === key
              ? "border-accent/60 bg-accent-soft text-text-primary"
              : guessed === key
                ? "border-dashed border-accent/50 bg-bg-primary text-text-secondary"
                : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
          }`}
        >
          <Icon name={icon} size={13} className={value === key || guessed === key ? "text-accent" : ""} />
          {label}
        </button>
      ))}
    </div>
  );
}

// Ort öffnen, der bisher nur als Name an Szenen hängt (Altbestand, Import): legt
// den Ortseintrag an – die Seite ist dann zunächst leer – und führt dorthin.
export function useOpenPlace() {
  const router = useRouter();
  const { addLocation } = useStore();
  return (area: string, name: string) => {
    const id = addLocation(area, name);
    if (id) router.push(`/orte/${id}`);
  };
}
