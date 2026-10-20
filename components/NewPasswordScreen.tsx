"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { uebersetze } from "./LoginScreen";

// Nach dem Klick auf den Link aus der „Passwort vergessen"-Mail: Supabase hat
// schon angemeldet, hier wird nur noch das neue Passwort gesetzt.
export function NewPasswordScreen() {
  const { changePassword, endPasswordRecovery, signOut } = useStore();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Passwort zu kurz (mind. 6 Zeichen).");
      return;
    }
    if (password !== repeat) {
      setError("Die beiden Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await changePassword(password);
      if (error) {
        setError(
          error.toLowerCase().includes("session")
            ? "Der Link ist abgelaufen oder wurde schon benutzt. Fordere bitte einen neuen an."
            : uebersetze(error),
        );
      } else {
        // Angemeldet bleibt man – es geht direkt in die App
        endPasswordRecovery();
      }
    } catch (e) {
      setError(`Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
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
            neues passwort<span className="text-accent">.</span>
          </h1>
        </div>

        <form
          onSubmit={submit}
          className="bg-bg-surface border border-border-subtle rounded-xl p-6 flex flex-col gap-3"
        >
          <label className="text-[0.875rem] text-text-secondary">
            Neues Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mind. 6 Zeichen"
              autoComplete="new-password"
              autoFocus
              className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
            />
          </label>
          <label className="text-[0.875rem] text-text-secondary">
            Noch einmal
            <input
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
            />
          </label>

          {error && <p className="text-[0.875rem] text-red-400/80">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 bg-accent/90 hover:bg-accent text-black font-medium border border-accent rounded-md py-2 text-[0.8125rem] transition-colors disabled:opacity-50"
          >
            {busy ? "…" : "Passwort speichern"}
          </button>
        </form>

        <p className="text-[0.75rem] text-text-tertiary text-center mt-4 leading-relaxed">
          <button
            type="button"
            onClick={async () => {
              endPasswordRecovery();
              await signOut();
            }}
            className="underline hover:text-text-primary"
          >
            Abbrechen und zur Anmeldung
          </button>
        </p>
      </div>
    </div>
  );
}
