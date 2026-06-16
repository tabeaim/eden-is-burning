"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { Icon, type IconName } from "./Icon";
import { LoginScreen } from "./LoginScreen";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/szenen", label: "Szenen", icon: "book" },
  { href: "/orte", label: "Orte", icon: "map" },
  { href: "/kalender", label: "Kalender", icon: "calendar" },
  { href: "/einwohnerinnen", label: "Einwohner*innen", icon: "users" },
  { href: "/info", label: "Info", icon: "info" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, currentPlayer } = useStore();
  const pathname = usePathname();

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

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} />
      <div className="flex-1 min-w-0 flex flex-col">
        <SiteHeader />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

// Große, moody Header-Area mit Blackletter-Wortmarke + Icon-Reihe (wie im Forum)
function SiteHeader() {
  const { currentPlayer, logout } = useStore();
  return (
    <header className="relative overflow-hidden border-b border-border-subtle">
      {/* Rauch-/Glut-Hintergrund */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(120% 140% at 20% -40%, rgba(232,154,60,0.16), transparent 55%), radial-gradient(80% 120% at 100% 0%, rgba(120,130,90,0.10), transparent 60%), linear-gradient(180deg, #0e0e10, #0a0a0b)",
        }}
      />
      <div className="relative px-8 pt-9 pb-6 flex items-end justify-between gap-6">
        <Link href="/dashboard" className="group">
          <h1 className="font-display text-5xl sm:text-6xl leading-none tracking-tight text-text-primary">
            eden is burning<span className="text-accent">.</span>
          </h1>
        </Link>
        <div className="flex items-center gap-3.5 text-text-tertiary pb-1.5">
          <Link href="/szenen/neu" title="Neue Szene" className="hover:text-accent">
            <Icon name="message" size={19} />
          </Link>
          <Link href="/einstellungen" title="Einstellungen" className="hover:text-accent">
            <Icon name="settings" size={19} />
          </Link>
          {currentPlayer && (
            <Link
              href={`/spieler/${currentPlayer.username}`}
              title={currentPlayer.username}
              className="hover:text-accent"
            >
              <Icon name="users" size={19} />
            </Link>
          )}
          <button onClick={logout} title="Abmelden" className="hover:text-accent">
            <Icon name="logout" size={19} />
          </button>
        </div>
      </div>
    </header>
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
          <div className="font-display text-[19px] text-text-primary">
            eden is burning<span className="text-accent">.</span>
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-text-tertiary">
            Eden, Virginia
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
              className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
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

      <div className="px-2 pb-2">
        <Link
          href="/einstellungen"
          className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
            isActive("/einstellungen")
              ? "bg-white/[0.04] text-text-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.025]"
          }`}
        >
          <span className={isActive("/einstellungen") ? "text-accent" : ""}>
            <Icon name="settings" size={17} />
          </span>
          Einstellungen
        </Link>
      </div>

      {/* Meine Charaktere */}
      <div className="px-3 py-3 border-t border-border-subtle">
        <div className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary mb-2">
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
              <span className="text-[12px] text-text-secondary group-hover:text-text-primary truncate">
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
            <div className="text-[12px] text-text-primary truncate">
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
