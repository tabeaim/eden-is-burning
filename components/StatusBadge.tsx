import { Icon } from "./Icon";

// Status einer Szene als Bubble-Tag — aktiv mit Flamme in Akzentfarbe,
// geschlossen gedämpft. Optional ein "neu"-Tag, wenn es ungelesene Posts gibt.
export function StatusBadge({
  status,
  isNew = false,
}: {
  status: "active" | "closed";
  isNew?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {status === "active" ? (
        <span className="inline-flex items-center gap-1 rounded bg-bg-surface-2 px-2 py-0.5 text-[0.8125rem] font-medium uppercase tracking-wider text-accent">
          <Icon name="flame" size={11} />
          aktiv
        </span>
      ) : (
        <span className="inline-flex items-center rounded bg-bg-surface-2 px-2 py-0.5 text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
          geschlossen
        </span>
      )}
      {isNew && (
        <span className="inline-flex items-center rounded bg-accent-soft px-2 py-0.5 text-[0.8125rem] font-semibold uppercase tracking-wider text-accent">
          neu
        </span>
      )}
    </span>
  );
}
