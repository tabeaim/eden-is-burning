"use client";

// An/Aus-Schalter – ersetzt überall die Checkbox (siehe DESIGN.md): Schalter
// links, Beschriftung daneben.
export function Toggle({
  checked,
  onChange,
  children,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 text-[0.875rem] text-text-secondary ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-white/[0.14]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
            checked ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </button>
      <span className="min-w-0">{children}</span>
    </label>
  );
}
