import Link from "next/link";
import type { Character } from "@/lib/types";
import { Icon } from "./Icon";

// Bubbles — die EINE runde Pill-Form der App (siehe DESIGN.md). Charaktere, NPCs
// und Orte sehen überall gleich aus; nur der Inhalt (Avatar bzw. Icon) wechselt.
// Mit `href` wird die Bubble zum Link, sonst bleibt sie ein <span> (z.B. innerhalb
// einer bereits verlinkten Karte).

const TONES = {
  default: "border-border-subtle bg-bg-primary text-text-secondary",
  // hervorgehoben, z.B. Charakter am Zug
  accent: "border-accent/70 bg-accent-soft text-text-primary",
} as const;

export function Bubble({
  href,
  tone = "default",
  leading,
  title,
  className = "",
  children,
}: {
  href?: string;
  tone?: keyof typeof TONES;
  leading?: React.ReactNode; // Avatar oder Icon links
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = `${className} inline-flex items-center gap-1.5 rounded-full border ${
    leading ? "pl-1" : "pl-2.5"
  } pr-2.5 py-0.5 text-[0.8125rem] transition-colors ${TONES[tone]}`;
  if (href) {
    return (
      <Link href={href} title={title} className={`${cls} hover:text-text-primary`}>
        {leading}
        {children}
      </Link>
    );
  }
  return (
    <span title={title} className={cls}>
      {leading}
      {children}
    </span>
  );
}

// Charakter oder NPC: Avatar + Name; bei NPCs steht „NPC" hinter dem Namen in
// der Bubble. Verlinkt standardmäßig aufs Profil.
export function CharacterBubble({
  character,
  firstNameOnly = false,
  linked = true,
  tone,
  trailing,
  className,
}: {
  character: Character;
  firstNameOnly?: boolean;
  linked?: boolean;
  tone?: keyof typeof TONES;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const c = character;
  return (
    <Bubble
      href={linked ? `/charaktere/${c.id}` : undefined}
      tone={tone}
      title={c.name}
      className={className}
      leading={
        c.faceclaim_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.faceclaim_image_url}
            alt=""
            className={`h-5 w-6 rounded-[3px] object-cover ${
              tone === "accent" ? "ring-2 ring-accent" : ""
            }`}
          />
        ) : (
          <span className="flex h-5 w-6 items-center justify-center rounded-[3px] bg-olive-soft text-[0.6875rem] uppercase text-text-primary">
            {c.name.charAt(0)}
          </span>
        )
      }
    >
      {firstNameOnly ? c.name.split(" ")[0] : c.name}
      {c.is_npc && (
        <span className="text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
          NPC
        </span>
      )}
      {trailing}
    </Bubble>
  );
}

// Ort: Karten-Icon + Name. Mit `id` verlinkt aufs Ortsprofil. Bespielte Orte
// haben ein oranges Icon, noch unbespielte (`played={false}`) ein graues.
export function LocationBubble({
  name,
  id,
  title,
  played = true,
  className,
}: {
  name: string;
  id?: string;
  title?: string;
  played?: boolean;
  className?: string;
}) {
  return (
    <Bubble
      href={id ? `/orte/${id}` : undefined}
      title={title}
      className={className}
      leading={
        <span
          className={`flex h-5 w-5 items-center justify-center ${
            played ? "text-accent" : "text-text-tertiary"
          }`}
        >
          <Icon name="map" size={13} />
        </span>
      }
    >
      {name}
    </Bubble>
  );
}
