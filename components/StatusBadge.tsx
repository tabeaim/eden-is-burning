"use client";

import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

// Status einer Szene als Tag. Aktiv = Flamme, geschlossen = Haken. Die Flamme ist
// nur blau, solange der neueste Post der Szene noch ungelesen ist (dafür
// `sceneId` mitgeben), sonst grau. Optional ein "neu"-Tag bei ungelesenen Posts.
export function StatusBadge({
  status,
  sceneId,
  isNew = false,
}: {
  status: "active" | "closed";
  sceneId?: string;
  isNew?: boolean;
}) {
  const { isSceneNew } = useStore();
  const unread = sceneId ? isSceneNew(sceneId) : false;
  return (
    <span className="inline-flex items-center gap-1.5">
      {status === "active" ? (
        <span className="inline-flex items-center gap-1 rounded bg-bg-surface-2 px-2 py-0.5 text-[0.8125rem] font-medium uppercase tracking-wider text-text-secondary">
          <Icon
            name="flame"
            size={11}
            className={unread ? "text-accent" : "text-text-tertiary"}
          />
          aktiv
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded bg-bg-surface-2 px-2 py-0.5 text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
          <Icon name="check" size={11} />
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
