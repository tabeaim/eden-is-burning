import type { Scene } from "@/lib/types";

export { AU_UNNAMED } from "@/lib/plots";

// Alle bisher vergebenen AU-Namen, alphabetisch.
export function auNames(scenes: Scene[]): string[] {
  const set = new Set<string>();
  for (const s of scenes) if (s.au && s.au_name) set.add(s.au_name);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
}

// Name des Alternate Universe — bestehendes AU auswählen oder ein neues benennen.
export function AuNameField({
  value,
  onChange,
  names,
}: {
  value: string;
  onChange: (v: string) => void;
  names: string[];
}) {
  return (
    <label className="text-[0.875rem] text-text-secondary">
      Name des AUs
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list="au-names"
        placeholder="z. B. Noir 1947 — bestehendes wählen oder neu benennen"
        className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
      />
      <datalist id="au-names">
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </label>
  );
}
