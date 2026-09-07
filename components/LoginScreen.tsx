"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

type Mode = "signin" | "signup";

// Vorübergehender Testzugang: bestehende Spieler*innen können ohne Registrierung
// per Klick rein (alle mit demselben Test-Passwort). Später entfernen.
const TEST_PASSWORD = "Eden1234!";
const TEST_PLAYERS: { label: string; email: string }[] = [
  { label: "tabs", email: "tabeaim@gmail.com" },
  { label: "vera", email: "vera@example.com" },
  { label: "liz", email: "liz@example.com" },
  { label: "abby", email: "abby@example.com" },
  { label: "jule", email: "jule@example.com" },
  { label: "kat", email: "kat@example.com" },
];

export function LoginScreen() {
  const { signIn, signUp, configured } = useStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!configured) {
      setError("Backend nicht konfiguriert (.env.local fehlt).");
      return;
    }
    if (!email.trim() || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(uebersetze(error));
        // Erfolg: onAuthStateChange lädt die App automatisch.
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          setError(uebersetze(error));
        } else {
          setNotice(
            "Registrierung eingegangen. Ein Admin muss dich freischalten — danach kannst du dich anmelden.",
          );
          setMode("signin");
          setPassword("");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function quickLogin(email: string) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { error } = await signIn(email, TEST_PASSWORD);
      if (error) setError(uebersetze(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(80% 60% at 50% 0%, rgba(232,154,60,0.10), transparent 60%), radial-gradient(60% 50% at 80% 100%, rgba(120,130,90,0.08), transparent 60%)",
        }}
      />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-[38px] text-text-primary leading-none">
            eden is burning<span className="text-accent">.</span>
          </h1>
          <p className="text-[13px] uppercase tracking-[0.22em] text-text-tertiary mt-2">
            Eden, Virginia
          </p>
        </div>

        {/* Umschalter Anmelden / Registrieren */}
        <div className="flex gap-1 bg-bg-surface border border-border-subtle rounded-lg p-1 mb-3">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setNotice(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-[13px] transition-colors ${
                mode === m
                  ? "bg-white/[0.06] text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {m === "signin" ? "Anmelden" : "Registrieren"}
            </button>
          ))}
        </div>

        <form
          onSubmit={submit}
          className="bg-bg-surface border border-border-subtle rounded-xl p-6 flex flex-col gap-3"
        >
          <label className="text-[13px] text-text-secondary">
            {mode === "signup" ? "E-Mail" : "Username oder E-Mail"}
            <input
              type={mode === "signup" ? "email" : "text"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === "signup" ? "du@beispiel.de" : "z.B. Vera oder du@beispiel.de"}
              autoComplete={mode === "signup" ? "email" : "username"}
              className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-white/20"
            />
          </label>
          <label className="text-[13px] text-text-secondary">
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "mind. 6 Zeichen" : "••••••••"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-white/20"
            />
          </label>

          {error && <p className="text-[13px] text-red-400/80">{error}</p>}
          {notice && <p className="text-[13px] text-accent">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 bg-accent/90 hover:bg-accent text-black font-medium border border-accent rounded-md py-2 text-[14px] transition-colors disabled:opacity-50"
          >
            {busy
              ? "…"
              : mode === "signin"
                ? "Anmelden"
                : "Registrieren"}
          </button>
        </form>

        {mode === "signin" && (
          <div className="mt-5">
            <div className="text-[13px] uppercase tracking-[0.16em] text-text-tertiary mb-2 text-center">
              Test-Zugang — als Spieler*in reinklicken
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {TEST_PLAYERS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  disabled={busy}
                  onClick={() => quickLogin(p.email)}
                  className="bg-bg-surface hover:bg-white/[0.06] border border-border-subtle rounded-lg px-3 py-1.5 text-[13px] text-text-primary transition-colors disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-text-tertiary text-center mt-2">
              Vorübergehend — noch keine Registrierung nötig.
            </p>
          </div>
        )}

        <p className="text-[11px] text-text-tertiary text-center mt-4 leading-relaxed">
          {mode === "signin"
            ? "Neu hier? Wechsle oben zu Registrieren — ein Admin schaltet dich frei."
            : "Nach der Registrierung wirst du von einem Admin freigeschaltet."}
        </p>
      </div>
    </div>
  );
}

// Häufige Supabase-Fehlermeldungen ins Deutsche übersetzen
function uebersetze(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-Mail oder Passwort stimmt nicht.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Diese E-Mail ist bereits registriert. Melde dich an.";
  if (m.includes("password should be")) return "Passwort zu kurz (mind. 6 Zeichen).";
  if (m.includes("email") && m.includes("confirm"))
    return "Bitte bestätige zuerst deine E-Mail.";
  return msg;
}
