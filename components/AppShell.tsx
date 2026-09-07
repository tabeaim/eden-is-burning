"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageMetaProvider, usePageMeta } from "@/lib/page-meta";
import { Icon, type IconName } from "./Icon";
import { LoginScreen } from "./LoginScreen";
import { PendingScreen } from "./PendingScreen";
import { pageHeader, sceneHeader } from "@/lib/headers";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/szenen", label: "Szenen", icon: "book" },
  { href: "/orte", label: "Orte", icon: "map" },
  { href: "/kalender", label: "Kalender", icon: "calendar" },
  { href: "/charaktere", label: "Charaktere", icon: "users" },
  { href: "/spieler", label: "Spieler", icon: "star" },
  { href: "/info", label: "Info", icon: "info" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, currentPlayer, isApproved, touchPresence } = useStore();
  const pathname = usePathname();

  // "Zuletzt online" aktuell halten: bei jedem Seitenwechsel last_seen setzen.
  useEffect(() => {
    if (currentPlayer) touchPresence(currentPlayer.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentPlayer?.id]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-tertiary">
        …
      </div>
    );
  }

  if (!currentPlayer) {
    return <LoginScreen />;
  }

  if (!isApproved) {
    return <PendingScreen />;
  }

  return (
    <PageMetaProvider>
      <div className="flex min-h-screen">
        <Sidebar pathname={pathname} />
        <div className="flex-1 min-w-0 flex flex-col">
          <BannerHeader pathname={pathname} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </PageMetaProvider>
  );
}

// Glut-/Rauch-Verlauf als verlässlicher Banner-Hintergrund (auch ohne Foto)
const EMBER_BG =
  "radial-gradient(120% 140% at 20% -40%, rgba(232,154,60,0.22), transparent 55%), radial-gradient(80% 120% at 100% 0%, rgba(120,130,90,0.14), transparent 60%), linear-gradient(180deg, #16130f, #0a0a0b)";

// Wählt den generierten Header passend zur Route. Szenen-Detailseiten bekommen
// einen pro Szene variierenden Header, alle anderen Seiten ihren eigenen.
function bannerForPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  if (seg[0] === "szenen" && seg[1] && seg[1] !== "neu") {
    return sceneHeader(seg[1]);
  }
  return pageHeader(seg[0] ?? "dashboard");
}

// Banner-Header: Titelbild pro Seite (Foto über Glut-Verlauf). Der Seitentitel
// ragt halb über die Banner-Unterkante in die Seite; darunter die Aktions-Leiste.
function BannerHeader({ pathname }: { pathname: string }) {
  const meta = usePageMeta();

  const navMatch = NAV.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );
  const onThisPage = meta.path === pathname;
  const title = (onThisPage && meta.title) || navMatch?.label || "Eden is burning";
  // Einheitliche Seitenbreite: alle Seiten teilen dieselbe Container-Breite, damit
  // Titel und linksbündiger Inhalt beim Seitenwechsel nicht horizontal springen.
  const width = (onThisPage && meta.width) || "max-w-5xl";
  // Detailseiten (Szene, Charakter) zeichnen ihre eigene Trennlinie unter dem
  // Inhalt (Zusammenfassung bzw. Zitat), damit der noch über der Linie steht.
  const ownsDivider =
    (/^\/szenen\/[^/]+$/.test(pathname) && pathname !== "/szenen/neu") ||
    /^\/charaktere\/[^/]+$/.test(pathname);
  // Jede Seite bekommt einen eigenen, generierten Header (dunkle Skyline-Optik).
  // Szenen-Detailseiten variieren zusätzlich pro Szene; ein echtes header_url der
  // Szene (falls gesetzt) überschreibt die Vorlage.
  const banner = (onThisPage && meta.bannerImage) || bannerForPath(pathname);

  return (
    <header className="relative">
      {/* Titelbild — Foto über Glut-Verlauf. background-image statt <img>, damit ein
          fehlgeschlagener Ladevorgang kein kaputtes Icon zeigt, sondern den Verlauf. */}
      <div className="relative h-40 w-full overflow-hidden" style={{ backgroundImage: EMBER_BG }}>
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url("${banner}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/35 to-transparent" />
      </div>

      {/* Titel — ragt halb über die Banner-Unterkante in die Seite (nicht beschnitten).
          Container in der Seitenbreite zentriert → Titel startet bündig mit dem Inhalt. */}
      <div className={`relative ${width} mx-auto px-8`}>
        <h1 className="inline-block -mt-8 font-display lowercase text-[2.625rem] sm:text-[3.375rem] leading-none tracking-tight text-text-primary">
          {title}
          <span className="text-accent">.</span>
        </h1>

      </div>

      {!ownsDivider && <div className="border-b border-border-subtle mt-2" />}
    </header>
  );
}

// Einzelner Sidebar-Eintrag (gleicher Stil wie die Haupt-Navigation)
function SideLink({
  href,
  icon,
  label,
  pathname,
}: {
  href: string;
  icon: IconName;
  label: string;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.875rem] transition-colors ${
        active
          ? "bg-white/[0.04] text-text-primary"
          : "text-text-secondary hover:text-text-primary hover:bg-white/[0.025]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-accent" />
      )}
      <span className={active ? "text-accent" : ""}>
        <Icon name={icon} size={17} />
      </span>
      {label}
    </Link>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const { currentPlayer, charactersOf, logout } = useStore();
  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-[190px] shrink-0 bg-bg-sidebar border-r border-border-subtle flex flex-col sticky top-0 h-screen">
      <div className="px-4 pt-5 pb-5 border-b border-border-subtle">
        <Link href="/dashboard" className="block leading-none">
          <div className="font-display text-[1.25rem] text-text-primary">
            eden is burning<span className="text-accent">.</span>
          </div>
        </Link>
      </div>

      <nav className="px-2 pt-3 flex-1 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.875rem] transition-colors ${
                active
                  ? "bg-white/[0.04] text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/[0.025]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-accent" />
              )}
              <span className={active ? "text-accent" : ""}>
                <Icon name={item.icon} size={17} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-2 flex flex-col gap-0.5">
        <SideLink href="/szenen/neu" icon="message" label="Neue Szene" pathname={pathname} />
        <SideLink href="/einstellungen" icon="settings" label="Einstellungen" pathname={pathname} />
        {currentPlayer && (
          <SideLink
            href={`/spieler/${currentPlayer.username}`}
            icon="users"
            label="Profil"
            pathname={pathname}
          />
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.8125rem] text-left text-text-secondary hover:text-text-primary hover:bg-white/[0.025] transition-colors"
        >
          <Icon name="logout" size={17} />
          Abmelden
        </button>
      </div>

      {/* Meine Charaktere */}
      <div className="px-3 py-3 border-t border-border-subtle">
        <div className="text-[0.75rem] uppercase tracking-[0.2em] text-text-tertiary mb-2">
          Meine Charaktere
        </div>
        <div className="flex flex-col gap-1.5">
          {myChars.map((c) => (
            <Link
              key={c.id}
              href={`/charaktere/${c.id}`}
              className="flex items-center gap-2 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.faceclaim_image_url ?? placeholder(c.name)}
                alt={c.name}
                className="w-6 h-6 rounded-full object-cover bg-bg-surface ring-1 ring-border-subtle group-hover:ring-accent/50"
              />
              <span className="text-[0.875rem] text-text-secondary group-hover:text-text-primary truncate">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Spieler-Avatar */}
      {currentPlayer && (
        <div className="px-3 py-3 border-t border-border-subtle flex items-center gap-2.5">
          <Link href={`/spieler/${currentPlayer.username}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPlayer.avatar_url ?? placeholder(currentPlayer.username)}
              alt={currentPlayer.username}
              className="w-8 h-8 rounded-full object-cover bg-bg-surface ring-1 ring-border-subtle"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[0.875rem] text-text-primary truncate">
              {currentPlayer.username}
            </div>
          </div>
          <button
            onClick={logout}
            title="Abmelden"
            className="text-text-tertiary hover:text-accent"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}

function placeholder(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/80/80`;
}
