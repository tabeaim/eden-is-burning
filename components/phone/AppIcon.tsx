import { Icon } from "@/components/Icon";

// App-Kachel des Startbildschirms. Angedeutete Apps sind reine Deko (kein Link).
export function AppIcon({
  label,
  bg,
  icon,
  children,
  badge = 0,
}: {
  label: string;
  bg?: string;
  icon?: string; // eigenes Icon-Bild statt Symbol
  children?: React.ReactNode;
  badge?: number;
}) {
  return (
    <span className="flex w-[5rem] flex-col items-center gap-1">
      <span
        style={{ background: bg }}
        className="relative flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-[0.95rem] bg-bg-surface-2 text-[1.625rem] leading-none shadow-md shadow-black/40"
      >
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="absolute inset-0 h-full w-full rounded-[0.95rem] object-cover" />
        )}
        {children}
        {badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] font-bold text-black">
            {badge}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[0.6875rem] font-medium text-[var(--phone-ink,#fff)] [text-shadow:var(--phone-ink-shadow,0_1px_3px_rgba(0,0,0,0.8))]">
        {label}
      </span>
    </span>
  );
}

export const MESSENGER_BG = "linear-gradient(#f2b25a, #d97a1e)";
export function MessengerGlyph() {
  return <Icon name="message" size={28} className="text-black" fill="currentColor" stroke="none" />;
}

// Captic – das fiktive Foto-Netzwerk von Eden
export const CAPTIC_BG = "linear-gradient(135deg, #ff9d5c 0%, #e8457a 50%, #7b3fd6 100%)";
export function CapticGlyph({ size = "1.875rem" }: { size?: string }) {
  return (
    <span className="font-display leading-none text-white" style={{ fontSize: size }}>
      c
    </span>
  );
}
