// Gemeinsame Klassen der Admin-Oberfläche (siehe DESIGN.md → Admin)
export const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";
export const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-40";
export const btnPrimary =
  "rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-3 py-1.5 disabled:opacity-40";
export const btnDanger =
  "inline-flex items-center gap-1.5 rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-500/10 disabled:opacity-40";
export const pill = (active: boolean) =>
  `rounded-full px-3 py-1 text-[0.8125rem] transition-colors ${
    active ? "bg-accent text-black font-medium" : "bg-white/[0.06] text-text-secondary hover:text-text-primary"
  }`;
export const row = "rounded-lg border border-border-subtle bg-bg-surface";
export const hint = "text-[0.8125rem] text-text-tertiary";
export const label = "text-[0.8125rem] text-text-secondary";
