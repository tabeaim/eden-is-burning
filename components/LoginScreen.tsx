"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

type Mode = "signin" | "signup" | "reset";

// Username: kein @ (sonst nicht von einer E-Mail zu unterscheiden), keine Leerzeichen
const USERNAME_OK = /^[\p{L}\p{N}._-]{1,24}$/u;

export function LoginScreen() {
  const { signIn, signUp, signOut, requestPasswordReset, configured, loginProblem } = useStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
    if (mode === "reset") {
      if (!email.trim()) {
        setError("Bitte Username oder E-Mail eingeben.");
        return;
      }
      setBusy(true);
      try {
        const { error } = await requestPasswordReset(email);
        if (error) setError(uebersetze(error));
        else
          setNotice(
            "Falls es dazu ein Konto gibt, ist eine Mail mit einem Link unterwegs. Darüber setzt du ein neues Passwort.",
          );
      } catch (e) {
        setError(`Anfrage fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!email.trim() || !password) {
      setError(mode === "signup" ? "Bitte E-Mail und Passwort eingeben." : "Bitte Username und Passwort eingeben.");
      return;
    }
    const name = username.trim();
    if (mode === "signup" && !USERNAME_OK.test(name)) {
      setError("Bitte einen Username wählen: 1–24 Zeichen, nur Buchstaben, Ziffern, Punkt, Binde- und Unterstrich.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(uebersetze(error));
        // Erfolg: onAuthStateChange lädt die App automatisch.
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          setError(uebersetze(error));
        } else {
          setNotice(
            `Registrierung eingegangen. Ein Admin muss dich freischalten – danach kannst du dich mit „${name}" und deinem Passwort anmelden.`,
          );
          setMode("signin");
          setEmail(name);
          setPassword("");
        }
      }
    } catch (e) {
      // z. B. Datenbank nicht erreichbar oder falsch konfiguriert
      setError(`Anmeldung fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
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
          <h1 className="font-display text-[2.375rem] text-text-primary leading-none">
            eden is burning<span className="text-accent">.</span>
          </h1>
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
              className={`flex-1 rounded-md py-1.5 text-[0.8125rem] transition-colors ${
                mode === m ? "bg-white/[0.06] text-text-primary" : "text-text-secondary hover:text-text-primary"
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
          <label className="text-[0.875rem] text-text-secondary">
            {mode === "signup" ? "E-Mail" : "Username oder E-Mail"}
            <input
              type={mode === "signup" ? "email" : "text"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === "signup" ? "du@beispiel.de" : "z.B. envy oder du@beispiel.de"}
              autoComplete={mode === "signup" ? "email" : "username"}
              name={mode === "signup" ? "email" : "username"}
              className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
            />
          </label>
          {mode === "signup" && (
            <label className="text-[0.875rem] text-text-secondary">
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="so heißt du auf der Plattform"
                autoComplete="username"
                maxLength={24}
                className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
              />
              <span className="mt-1 block text-[0.75rem] text-text-tertiary">Damit meldest du dich später an.</span>
            </label>
          )}
          {mode !== "reset" && (
            <label className="text-[0.875rem] text-text-secondary">
              Passwort
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "mind. 6 Zeichen" : "••••••••"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
              />
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                    setNotice(null);
                  }}
                  className="mt-1 block text-[0.75rem] text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Passwort vergessen?
                </button>
              )}
            </label>
          )}

          {error && <p className="text-[0.875rem] text-red-400/80">{error}</p>}
          {/* Anmeldung hat geklappt, aber es fehlt der Spieler-Eintrag */}
          {!error && loginProblem && (
            <p className="text-[0.875rem] text-red-400/80">
              {loginProblem}{" "}
              <button type="button" onClick={() => signOut()} className="underline">
                Abmelden
              </button>
            </p>
          )}
          {notice && <p className="text-[0.875rem] text-accent">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 bg-accent/90 hover:bg-accent text-black font-medium border border-accent rounded-md py-2 text-[0.8125rem] transition-colors disabled:opacity-50"
          >
            {busy
              ? "…"
              : mode === "signin"
                ? "Anmelden"
                : mode === "signup"
                  ? "Registrieren"
                  : "Link zum Zurücksetzen schicken"}
          </button>
        </form>

        <p className="text-[0.75rem] text-text-tertiary text-center mt-4 leading-relaxed">
          {mode === "reset" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setNotice(null);
              }}
              className="underline hover:text-text-primary"
            >
              Zurück zur Anmeldung
            </button>
          ) : mode === "signin" ? (
            "Neu hier? Wechsle oben zu Registrieren – ein Admin schaltet dich frei."
          ) : (
            "Nach der Registrierung wirst du von einem Admin freigeschaltet und meldest dich dann mit Username und Passwort an."
          )}
        </p>
      </div>
    </div>
  );
}

// Häufige Supabase-Fehlermeldungen ins Deutsche übersetzen
export function uebersetze(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Username oder Passwort stimmt nicht.";
  if (m.includes("username taken")) return "Dieser Username ist schon vergeben.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Diese E-Mail ist bereits registriert. Melde dich an.";
  if (m.includes("unknown user")) return "Zu diesem Username gibt es kein Konto.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Gerade wurden zu viele Mails verschickt. Bitte versuch es in ein paar Minuten noch einmal.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "Das neue Passwort muss sich vom alten unterscheiden.";
  if (m.includes("password should be")) return "Passwort zu kurz (mind. 6 Zeichen).";
  if (m.includes("email") && m.includes("confirm")) return "Bitte bestätige zuerst deine E-Mail.";
  return msg;
}
