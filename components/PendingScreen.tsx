"use client";

import { useStore } from "@/lib/store";

// Angemeldet, aber noch nicht vom Admin freigeschaltet.
export function PendingScreen() {
  const { currentPlayer, signOut, refresh } = useStore();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(80% 60% at 50% 0%, rgba(137,207,240,0.10), transparent 60%)",
        }}
      />
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-[2.125rem] text-text-primary leading-none">
          fast drin<span className="text-accent">.</span>
        </h1>
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-6 mt-6">
          <p className="text-[0.875rem] text-text-primary">
            Danke für die Registrierung
            {currentPlayer?.username ? `, ${currentPlayer.username}` : ""}.
          </p>
          <p className="text-[0.875rem] text-text-secondary mt-2 leading-relaxed">
            Dein Zugang wartet auf die Freischaltung durch einen Admin. Sobald das
            passiert ist, kannst du loslegen – anmelden kannst du dich dann mit
            deinem Username
            {currentPlayer?.username ? ` „${currentPlayer.username}“` : ""} und Passwort.
          </p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => refresh()}
              className="flex-1 bg-accent/90 hover:bg-accent text-black font-medium border border-accent rounded-md py-2 text-[0.8125rem] transition-colors"
            >
              Erneut prüfen
            </button>
            <button
              onClick={() => signOut()}
              className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] text-text-secondary border border-border-subtle rounded-md py-2 text-[0.8125rem] transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
