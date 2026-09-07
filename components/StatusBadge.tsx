import { Icon } from "./Icon";

// Status einer Szene als Bubble-Tag — aktiv mit Flamme in Akzentfarbe,
// geschlossen gedämpft. Einheitlich auf allen Szenen-Boxen verwendet.
export function StatusBadge({ status }: { status: "active" | "closed" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-bg-surface-2 px-2 py-0.5 text-[0.8125rem] font-medium uppercase tracking-wider text-accent">
        <Icon name="flame" size={11} />
        aktiv
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-bg-surface-2 px-2 py-0.5 text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
      geschlossen
    </span>
  );
}
