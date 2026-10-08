"use client";

import { useStore } from "@/lib/store";
import { tierOf } from "@/lib/characters";
import { Collapsible } from "../Collapsible";
import { AdminApps } from "./AdminApps";
import { AdminAreas } from "./AdminAreas";
import { AdminCharacters } from "./AdminCharacters";
import { AdminDesign } from "./AdminDesign";
import { AdminPlayers } from "./AdminPlayers";
import { AdminLocations, AdminScenes, AdminTrash } from "./AdminWorld";

// Einstellungen → Admin: alles, was nur Admins ändern. Fremde Charakterprofile
// lassen sich nur hier bearbeiten, nicht im Profil selbst.
export function AdminPanel() {
  const { players, characters, npcs, scenes, posts, locations, plots, trashedCharacters } = useStore();
  const stats: [number, string][] = [
    [players.length, "Spieler*innen"],
    [characters.filter((c) => !c.deleted_at).length, "Main Characters"],
    [npcs.filter((c) => tierOf(c) === "supporting" && !c.deleted_at).length, "Supporting Characters"],
    [npcs.filter((c) => tierOf(c) === "extra" && !c.deleted_at).length, "Statist*innen"],
    [scenes.length, "Szenen"],
    [posts.length, "Posts"],
    [locations.length, "Orte"],
    [plots.length, "Plots"],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {stats.map(([n, name]) => (
          <span
            key={name}
            className="rounded-full border border-border-subtle bg-bg-surface px-3 py-1 text-[0.8125rem] text-text-secondary"
          >
            <span className="text-text-primary">{n}</span> {name}
          </span>
        ))}
      </div>
      <Collapsible title="Spieler*innen & Freischaltungen">
        <AdminPlayers />
      </Collapsible>
      <Collapsible title="Main Characters">
        <AdminCharacters tier="main" />
      </Collapsible>
      <Collapsible title="Supporting Characters">
        <AdminCharacters tier="supporting" />
      </Collapsible>
      <Collapsible title="Statist*innen">
        <AdminCharacters tier="extra" />
      </Collapsible>
      <Collapsible title="Bezirke">
        <AdminAreas />
      </Collapsible>
      <Collapsible title="Orte">
        <AdminLocations />
      </Collapsible>
      <Collapsible title="Szenen & Plots">
        <AdminScenes />
      </Collapsible>
      <Collapsible title="Handy-Apps">
        <AdminApps />
      </Collapsible>
      <Collapsible title="Design">
        <AdminDesign />
      </Collapsible>
      <Collapsible title={`Papierkorb (${trashedCharacters.length})`}>
        <AdminTrash />
      </Collapsible>
    </div>
  );
}
