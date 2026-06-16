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
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const { currentPlayer, charactersOf, logout } = useStore();
  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-[180px] shrink-0 bg-bg-sidebar border-r border-border-subtle flex flex-col sticky top-0 h-screen">
      <div className="px-4 pt-5 pb-4">
        <Link href="/dashboard" className="block leading-tight">
          <div className="font-serif text-[15px] text-text-primary">
            Eden Is Burning
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            Eden, Virginia
          </div>
        </Link>
      </div>

      <nav className="px-2 flex-1 flex flex-col gap-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
              isActive(item.href)
                ? "bg-white/[0.05] text-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-white/[0.03]"
            }`}
          >
            <Icon name={item.icon} size={17} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-2 pb-2">
        <Link
          href="/einstellungen"
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
            isActive("/einstellungen")
              ? "bg-white/[0.05] text-text-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.03]"
          }`}
        >
          <Icon name="settings" size={17} />
          Einstellungen
        </Link>
      </div>

      {/* Meine Charaktere */}
      <div className="px-3 py-3 border-t border-border-subtle">
        <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-2">
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
                className="w-6 h-6 rounded-full object-cover bg-bg-surface"
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
              className="w-8 h-8 rounded-full object-cover bg-bg-surface"
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
            className="text-text-tertiary hover:text-text-primary"
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
