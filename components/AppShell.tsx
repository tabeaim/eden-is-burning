"use client";

import { playerImage } from "@/lib/avatar";
import { bannerStyle } from "@/lib/headers";
import { characterImage } from "@/lib/avatar";
import { isPaused, tierOf } from "@/lib/characters";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageMetaProvider, usePageMeta } from "@/lib/page-meta";
import { Icon, type IconName } from "./Icon";
import { LoginScreen } from "./LoginScreen";
import { PendingScreen } from "./PendingScreen";
import { defaultHeader } from "@/lib/headers";
import { useTheme } from "@/lib/theme";
import { GONE_CLASS, PAUSED_CLASS } from "@/lib/gone";
import { joinNames } from "@/lib/format";
import type { Theme } from "@/lib/types";
import { AlertPing } from "./AlertPing";

// `title` weicht nur ab, wenn der Seitentitel anders heißt als der Menüpunkt.
const NAV: { href: string; label: string; icon: IconName; title?: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/szenen", label: "Szenen", icon: "book" },
  { href: "/handy", label: "Handy", icon: "phone" },
  { href: "/orte", label: "Orte", icon: "map", title: "Eden, Virginia" },
  { href: "/kalender", label: "Timeline", icon: "calendar" },
  { href: "/charaktere", label: "Charaktere", icon: "users" },
  { href: "/spieler", label: "Spieler*innen", icon: "star" },
  { href: "/info", label: "Info", icon: "info" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, currentPlayer, isApproved, touchPresence, saveError, clearSaveError, refresh } =
    useStore();
  const pathname = usePathname();
  // Handy: Navigation als Schublade, die über die Menü-Taste aufgeht
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [pathname]);
  // Größere Bildschirme: Seitenleiste lässt sich dauerhaft ausblenden (pro Gerät gemerkt)
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    try {
      setNavHidden(localStorage.getItem("eden:nav-hidden") === "1");
    } catch {
      /* ignore */
    }
  }, []);
  // Ausgeblendete Seitenleiste erscheint beim Hovern am linken Rand (wie eine Schublade)
  const [navPeek, setNavPeek] = useState(false);
  function hideNav(hidden: boolean) {
    setNavPeek(false);
    setNavHidden(hidden);
    try {
      localStorage.setItem("eden:nav-hidden", hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  // "Zuletzt online" aktuell halten: bei jedem Seitenwechsel last_seen setzen.
  useEffect(() => {
    if (currentPlayer) touchPresence(currentPlayer.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentPlayer?.id]);

  // Der Messenger füllt den Bildschirm wie ein Handy: kein Banner, keine Kopfleiste.
  const bare = pathname === "/handy" || pathname.startsWith("/handy/");
  // Titel im Browser-Tab vor der Anmeldung (danach übernimmt `TabTitle`)
  const gate = !ready ? null : !currentPlayer ? "Anmelden" : !isApproved ? "Warten auf Freischaltung" : null;
  useEffect(() => {
    if (gate) document.title = `${gate} – ${SITE_TITLE}`;
  }, [gate]);

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
      <TabTitle pathname={pathname} />
      <PageBackground />
      {/* Speichern fehlgeschlagen – die Änderung ist nur lokal sichtbar */}
      {saveError && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,560px)] -translate-x-1/2 rounded-lg border border-red-400/50 bg-bg-surface-2 px-4 py-3 text-[0.875rem] text-text-primary shadow-2xl shadow-black/70"
        >
          <div className="font-semibold text-red-300">Änderung wurde nicht gespeichert</div>
          <div className="mt-0.5 break-words text-text-secondary">{saveError}</div>
          <div className="mt-2 flex justify-end gap-3 text-[0.8125rem]">
            <button onClick={clearSaveError} className="text-text-tertiary hover:text-text-primary">
              Schließen
            </button>
            <button
              onClick={() => {
                clearSaveError();
                void refresh();
              }}
              className="text-accent hover:underline"
            >
              Gespeicherten Stand neu laden
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-screen">
        <Sidebar
          pathname={pathname}
          open={navOpen}
          onClose={() => setNavOpen(false)}
          hidden={navHidden}
          peek={navPeek}
          onPeek={setNavPeek}
          onToggleHidden={() => hideNav(!navHidden)}
        />
        {/* Ausgeblendete Seitenleiste (größere Bildschirme): Hover am linken Rand
            oder auf der Taste blendet sie ein, Klick fixiert sie wieder. */}
        {navHidden && (
          <>
            <div
              onMouseEnter={() => setNavPeek(true)}
              className="hidden md:block fixed inset-y-0 left-0 z-30 w-2"
            />
            <button
              onClick={() => hideNav(false)}
              onMouseEnter={() => setNavPeek(true)}
              title="Seitenleiste fixieren"
              aria-label="Seitenleiste fixieren"
              className="hidden md:flex fixed left-3 top-3 z-30 rounded-md border border-border-subtle bg-bg-sidebar/80 p-1.5 text-text-secondary backdrop-blur hover:text-text-primary"
            >
              <Icon name="sidebar" size={18} />
            </button>
          </>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Schmale Bildschirme: Die Wortmarke steht oben und scrollt mit weg; nur
              die Menü-Taste bleibt beim Scrollen stehen. */}
          {!bare && (
            <div className="md:hidden flex items-center border-b border-border-subtle bg-bg-sidebar px-4 py-3.5">
              <Link href="/dashboard" className="site-logo font-display text-[1.25rem] leading-none text-text-primary">
                eden is burning<span className="text-accent">.</span>
              </Link>
            </div>
          )}
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Menü öffnen"
            className="md:hidden fixed right-3 top-2 z-30 rounded-md border border-border-subtle bg-bg-sidebar/85 p-1.5 text-text-secondary backdrop-blur hover:text-text-primary"
          >
            <MenuIcon />
          </button>
          {/* Die Karte bekommt ausnahmsweise kein Titelbild – nur den Seitentitel;
              der Platz gehört der Karte. */}
          {!bare && (
            <BannerHeader
              pathname={pathname}
              noBanner={pathname === "/orte"}
              navHidden={navHidden}
            />
          )}
          {/* Der Seiteninhalt liegt über dem Titelbild: Was auf Detailseiten über der
              Trennlinie steht (Zitat, Szenenkopf, Bearbeiten), ragt mit auf den Header. */}
          <main className="relative flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </PageMetaProvider>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

// Glut-/Rauch-Verlauf als verlässlicher Banner-Hintergrund (auch ohne Foto)
const EMBER_BG: Record<Theme, string> = {
  dark: "radial-gradient(120% 140% at 20% -40%, rgba(232,154,60,0.22), transparent 55%), radial-gradient(80% 120% at 100% 0%, rgba(120,130,90,0.14), transparent 60%), linear-gradient(180deg, #16130f, #0a0a0b)",
  light: "radial-gradient(120% 140% at 20% -40%, rgba(232,169,90,0.55), transparent 55%), linear-gradient(180deg, #f3dcb0, #fbf5ea)",
};

// Titel im Browser-Tab: „Seite – Eden Is Burning". Detailseiten (Szene, Charakter,
// Ort, Spieler*in) melden ihren Namen über den Seitentitel; im Handy, das keinen
// Seitentitel hat, ergibt er sich aus der Adresse.
const SITE_TITLE = "Eden Is Burning";
const PHONE_TITLES: Record<string, string> = {
  "/handy": "Handy",
  "/handy/nachrichten": "Nachrichten",
  "/handy/neu": "Neue Nachricht",
  "/handy/captic": "Captic",
  "/handy/telefon": "Telefon",
  "/handy/kontakte": "Kontakte",
};
// Hintergrundbild der Seiten (Einstellungen → Admin → Design): reicht Bild und
// Deckkraft des aktuellen Stils als CSS-Variablen an die Ebene in globals.css.
// Ohne eigene Angaben gelten deren Standardwerte.
function PageBackground() {
  const { appSettings } = useStore();
  const { theme } = useTheme();
  const bg = appSettings.background?.[theme];
  const url = bg?.url ?? null;
  const opacity = bg?.opacity ?? null;
  useEffect(() => {
    const root = document.documentElement.style;
    if (url) root.setProperty("--page-bg", `url("${url}")`);
    else root.removeProperty("--page-bg");
    if (opacity === null) root.removeProperty("--page-bg-opacity");
    else root.setProperty("--page-bg-opacity", String(Math.min(100, Math.max(0, opacity)) / 100));
  }, [url, opacity]);
  return null;
}

function TabTitle({ pathname }: { pathname: string }) {
  const meta = usePageMeta();
  const { chats, character } = useStore();
  let page = "";
  if (pathname === "/handy" || pathname.startsWith("/handy/")) {
    const chat = chats.find((c) => `/handy/${c.id}` === pathname);
    const names = chat?.participant_ids.map((id) => character(id)?.name.split(" ")[0]).filter(Boolean) as string[] | undefined;
    page = PHONE_TITLES[pathname] ?? (names?.length ? `Chat: ${joinNames(names)}` : "Handy");
  } else {
    // Hauptseiten heißen wie ihr Menüpunkt (das Dashboard also nicht „Hallo, …"),
    // Unterseiten wie ihr Seitentitel
    const nav = NAV.find((n) => pathname === n.href);
    const section = NAV.find((n) => pathname.startsWith(n.href + "/"));
    page = nav?.label ?? (meta.path === pathname && meta.title ? meta.title : (section?.label ?? ""));
  }
  const title = page ? `${page} – ${SITE_TITLE}` : SITE_TITLE;
  useEffect(() => {
    document.title = title;
  }, [title, pathname]);
  return null;
}

// Banner-Header: Titelbild pro Seite (Foto über Glut-Verlauf). Der Seitentitel
// steht ganz auf dem Titelbild, mit Luft bis zu dessen Unterkante – dort endet der
// Header mit der Trennlinie; auf Detailseiten rutscht ihr Kopfbereich in die Lücke.
function BannerHeader({
  pathname,
  noBanner = false,
  navHidden = false,
}: {
  pathname: string;
  noBanner?: boolean; // Titel ohne Titelbild darüber
  navHidden?: boolean; // dann sitzt oben links die Einblenden-Taste
}) {
  const meta = usePageMeta();
  const { appSettings } = useStore();
  const { theme } = useTheme();

  const navMatch = NAV.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );
  const onThisPage = meta.path === pathname;
  const title = (onThisPage && meta.title) || navMatch?.title || navMatch?.label || "Eden is burning";
  // Einheitliche Seitenbreite: alle Seiten teilen dieselbe Container-Breite, damit
  // Titel und linksbündiger Inhalt beim Seitenwechsel nicht horizontal springen.
  const width = (onThisPage && meta.width) || "max-w-6xl";
  const titleEvent = onThisPage ? meta.titleEvent : undefined;
  // Detailseiten (Szene, Charakter, Ort) zeichnen ihre eigene Trennlinie unter dem
  // Inhalt (Zusammenfassung, Zitat bzw. Bearbeiten-Button), damit der noch über
  // der Linie steht.
  const ownsDivider =
    (/^\/szenen\/[^/]+$/.test(pathname) && pathname !== "/szenen/neu") ||
    /^\/charaktere\/[^/]+$/.test(pathname) ||
    /^\/spieler\/[^/]+$/.test(pathname) ||
    /^\/orte\/[^/]+$/.test(pathname);
  // Eigenes Bild der Seite (Szene, Profil, Dashboard), sonst der Header der Rubrik:
  // das von Admins hochgeladene Bild (Einstellungen → Admin → Design) oder die
  // generierte Vorlage. Detailseiten erben so den Header ihrer Übersicht.
  const banner =
    (onThisPage && meta.bannerImage) ||
    defaultHeader(appSettings, pathname.split("/").filter(Boolean)[0] ?? "dashboard", theme);

  return (
    <header className="relative bg-bg-primary">
      {/* Titelbild – Foto über Glut-Verlauf. background-image statt <img>, damit ein
          fehlgeschlagener Ladevorgang kein kaputtes Icon zeigt, sondern den Verlauf. */}
      {!noBanner && (
      <div className="relative h-48 sm:h-56 w-full overflow-hidden" style={{ backgroundImage: EMBER_BG[theme] }}>
        <div
          className="absolute inset-0 bg-cover"
          style={bannerStyle(banner)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/50 to-transparent" />
      </div>
      )}
      {/* Unter dem Kopfbereich blendet das Hintergrundfoto weich ein. Der Verlauf
          beginnt an der Unterkante des Titelbilds bzw. des Headers, je nachdem, was
          tiefer liegt, und läuft hinter dem Seiteninhalt aus. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 h-56 bg-[linear-gradient(to_bottom,var(--bg-primary),transparent)] ${
          noBanner ? "top-full" : "top-[max(100%,12rem)] sm:top-[max(100%,14rem)]"
        }`}
      />

      {/* Titel – steht auf dem Titelbild (nicht beschnitten).
          Container in der Seitenbreite zentriert → Titel startet bündig mit dem Inhalt. */}
      <div className={`relative ${width} mx-auto px-4 sm:px-8 ${noBanner ? "" : "-mt-[3.625rem] sm:-mt-[5.875rem]"}`}>
        {/* Etikett der Profile („Character File", „Player File"): leicht schräg
            aufgeklebt über dem Titel */}
        {!noBanner && onThisPage && meta.kicker && (
          <div className="absolute bottom-full left-4 mb-2.5 -rotate-2 rounded-[3px] bg-accent px-2.5 py-1 text-[0.6875rem] font-bold uppercase leading-none tracking-[0.18em] text-black sm:left-8">
            {meta.kicker}
          </div>
        )}
        <h1 className={`page-title inline-block ${
          noBanner ? (navHidden ? "mt-7 md:mt-14" : "mt-7") : ""
        } max-w-full break-words font-display lowercase text-[2.125rem] sm:text-[3.375rem] leading-none text-text-primary`}>
          {onThisPage && meta.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.avatar}
              alt=""
              className="mr-3 inline-block h-[1.15em] w-[1.15em] rounded-full object-cover align-[-0.2em] ring-2 ring-bg-primary"
            />
          )}
          {titleEvent ? (
            // Anklickbarer Titel: die Seite hört auf das Ereignis (siehe PageMeta)
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(titleEvent))}
              className="cursor-pointer lowercase text-left transition-colors hover:text-accent"
            >
              {title}
            </button>
          ) : (
            <span className={onThisPage && meta.deleted ? GONE_CLASS : ""} title={onThisPage && meta.deleted ? "Charakter gelöscht" : undefined}>
              {title}
            </span>
          )}
          <span className="text-accent">.</span>
          {/* Dashboard: Schreibstrich hinter dem Titel */}
          {pathname === "/dashboard" && <span aria-hidden className="type-caret" />}
        </h1>

      </div>

      {!ownsDivider && (
        <div className={`relative border-b border-border-subtle ${noBanner ? "mt-2" : "mt-6 sm:mt-10"}`} />
      )}
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

function Sidebar({
  pathname,
  open,
  onClose,
  hidden,
  peek,
  onPeek,
  onToggleHidden,
}: {
  pathname: string;
  open: boolean; // nur auf schmalen Bildschirmen relevant (Schublade)
  onClose: () => void;
  hidden: boolean; // auf größeren Bildschirmen nicht fixiert
  peek: boolean; // nicht fixiert, aber gerade per Hover eingeblendet
  onPeek: (v: boolean) => void;
  onToggleHidden: () => void;
}) {
  const {
    currentPlayer,
    charactersOf,
    logout,
    unreadChatCount,
    incomingCalls,
    capticUnread,
    capticAlerts,
    mailboxAlerts,
    scenes,
    isSceneNew,
    myNpcs,
    isSubscribed,
  } = useStore();
  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];
  // Alter Egos: eigene Main Characters, dahinter die pausierten, dann zugeordnete
  // Supporting Characters (mit SC-Tag)
  const egos = [
    ...myChars.filter((c) => !isPaused(c)),
    ...myChars.filter(isPaused),
    ...myNpcs.filter((c) => tierOf(c) === "supporting"),
  ];
  const phoneBadge =
    unreadChatCount + incomingCalls.length + capticUnread.reduce((n, a) => n + a.count, 0);
  // Orange Zähler im Menü: Szenen = alle ungelesenen; Dashboard = Bewegung bei
  // den eigenen Charakteren (eigene Szenen, Chats, Anrufe)
  const myIds = new Set(myChars.map((c) => c.id));
  // bespielte Nebenfiguren zählen nur in abonnierten Szenen
  const myNpcIds = new Set(myNpcs.map((c) => c.id));
  const newScenes = scenes.filter((s) => isSceneNew(s.id));
  const badges: Record<string, number> = {
    "/szenen": newScenes.length,
    "/dashboard":
      newScenes.filter((s) =>
        s.participant_ids.some((id) => myIds.has(id) || (myNpcIds.has(id) && isSubscribed(s.id))),
      ).length +
      // wie die Hinweise auf dem Dashboard: Captic nur, bis man die Aktivitäten
      // geöffnet hat (am Handy bleibt der Zähler, bis alles gelesen ist)
      unreadChatCount +
      incomingCalls.length +
      mailboxAlerts.length +
      capticAlerts.reduce((n, a) => n + a.count, 0),
    "/handy": phoneBadge,
  };
  const [charsOpen, setCharsOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
    <AlertPing />
    {/* Abdunkelung hinter der offenen Schublade (Handy) */}
    {open && (
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 md:hidden" />
    )}
    <aside
      onMouseLeave={() => hidden && onPeek(false)}
      className={`w-[230px] md:w-[190px] shrink-0 bg-bg-sidebar border-r border-border-subtle flex flex-col fixed inset-y-0 left-0 z-50 overflow-y-auto transition-transform ${
        hidden
          ? peek
            ? "md:translate-x-0 md:shadow-2xl md:shadow-black/70"
            : ""
          : "md:sticky md:top-0 md:h-screen md:translate-x-0"
      } ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="px-4 pt-5 pb-5 border-b border-border-subtle">
        <Link href="/dashboard" className="block leading-none">
          <div className="site-logo font-display text-[1.25rem] text-text-primary">
            eden is burning<span className="text-accent">.</span>
          </div>
        </Link>
      </div>

      <nav className="px-2 pt-2 flex-1 flex flex-col gap-0.5">
        {/* Seitenleiste fixieren / nur bei Hover zeigen (nur größere Bildschirme) */}
        <button
          onClick={onToggleHidden}
          title={hidden ? "Seitenleiste fixieren" : "Seitenleiste ausblenden (erscheint beim Hovern)"}
          aria-label={hidden ? "Seitenleiste fixieren" : "Seitenleiste ausblenden"}
          className={`hidden md:flex self-start rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/[0.04] hover:text-text-primary ${
            hidden ? "text-text-tertiary" : "text-accent"
          }`}
        >
          <Icon name="sidebar" size={17} />
        </button>
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
              {(badges[item.href] ?? 0) > 0 && (
                <span
                  className={`ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] font-semibold text-black ${
                    item.href === "/handy" && incomingCalls.length > 0 ? "phone-ring" : ""
                  }`}
                >
                  {badges[item.href]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-2 flex flex-col gap-0.5">
        <SideLink href="/szenen/neu" icon="book" label="Neue Szene" pathname={pathname} />
        <SideLink href="/handy/kontakte" icon="phone" label="Neuer Anruf" pathname={pathname} />
        <SideLink href="/handy/neu" icon="message" label="Neue SMS" pathname={pathname} />
        <SideLink href="/einstellungen" icon="settings" label="Einstellungen" pathname={pathname} />
      </div>

      {/* Alter Egos (eigene Charaktere) – klappt als Overlay über dem Menü auf,
          damit viele Charaktere das Menü nicht zusammenschieben; die Liste scrollt. */}
      <div className="relative px-2 py-3 border-t border-border-subtle">
        <button
          onClick={() => setCharsOpen((o) => !o)}
          aria-expanded={charsOpen}
          className="flex w-full items-center justify-between px-2.5 text-[0.75rem] uppercase tracking-[0.2em] text-text-tertiary hover:text-text-secondary"
        >
          <span>Alter Egos ({egos.length})</span>
          <span className={`transition-transform ${charsOpen ? "" : "rotate-180"}`}>▾</span>
        </button>
        {charsOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setCharsOpen(false)} />
            <div className="absolute bottom-full left-2 right-2 z-20 mb-1 flex max-h-[min(60vh,22rem)] flex-col gap-0.5 overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface-2 p-1 shadow-2xl shadow-black/70">
              {egos.length === 0 && (
                <div className="px-2.5 py-2 text-[0.8125rem] text-text-tertiary">Noch keine Charaktere.</div>
              )}
              {egos.map((c) => (
                <Link
                  key={c.id}
                  href={`/charaktere/${c.id}`}
                  onClick={() => setCharsOpen(false)}
                  className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.875rem] text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={characterImage(c)}
                    alt={c.name}
                    className="h-[17px] w-[17px] shrink-0 rounded-full object-cover bg-bg-surface ring-1 ring-border-subtle group-hover:ring-accent/50"
                  />
                  <span className={`truncate ${isPaused(c) ? `${PAUSED_CLASS} opacity-60` : ""}`}>{c.name}</span>
                  {isPaused(c) && (
                    <span className="ml-auto shrink-0 text-[0.625rem] uppercase tracking-wider text-text-tertiary">
                      pausiert
                    </span>
                  )}
                  {tierOf(c) === "supporting" && (
                    <span
                      title="Supporting Character"
                      className="ml-auto shrink-0 rounded-full border border-border-subtle px-1.5 py-px text-[0.625rem] uppercase tracking-wider text-text-tertiary"
                    >
                      SC
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Spieler-Avatar */}
      {currentPlayer && (
        <div className="px-3 py-3 border-t border-border-subtle flex items-center gap-2.5">
          <Link href={`/spieler/${currentPlayer.username}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={playerImage(currentPlayer)}
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
    </>
  );
}
