// Forum-Stil Sektions-Balken (z.B. GENERAL / INPLAY)
export function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative my-4 rounded-md border border-border-subtle bg-gradient-to-b from-white/[0.04] to-transparent py-2.5 text-center">
      <span className="section-bar text-[0.875rem] text-text-primary">
        {children}
      </span>
    </div>
  );
}
