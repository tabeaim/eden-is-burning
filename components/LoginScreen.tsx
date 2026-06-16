"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export function LoginScreen() {
  const { players, login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const match = players.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!match) {
      setError("Kein Account mit dieser E-Mail. Nutze einen der Demo-Accounts.");
      return;
    }
    // Prototyp: Passwort wird nicht geprüft.
    login(match.id);
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
          <h1 className="font-display text-4xl text-text-primary leading-none">
            eden is burning<span className="text-accent">.</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary mt-2">
            Eden, Virginia
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-bg-surface border border-border-subtle rounded-xl p-6 flex flex-col gap-3"
        >
          <label className="text-[12px] text-text-secondary">
            E-Mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tabeaim@gmail.com"
              className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-white/20"
            />
          </label>
          <label className="text-[12px] text-text-secondary">
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="(im Prototyp egal)"
              className="mt-1 w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-white/20"
            />
          </label>

          {error && <p className="text-[12px] text-red-400/80">{error}</p>}

          <button
            type="submit"
            className="mt-1 bg-accent/90 hover:bg-accent text-black font-medium border border-accent rounded-md py-2 text-[14px] transition-colors"
          >
            Anmelden
          </button>
        </form>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary mb-2 text-center">
            Demo-Accounts — schnell einloggen
          </div>
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => login(p.id)}
                className="flex items-center gap-3 bg-bg-surface hover:bg-white/[0.04] border border-border-subtle rounded-lg px-3 py-2 text-left transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.avatar_url ?? ""}
                  alt={p.username}
                  className="w-8 h-8 rounded-full object-cover bg-bg-primary"
                />
                <div className="min-w-0">
                  <div className="text-[13px] text-text-primary">
                    {p.username}
                  </div>
                  <div className="text-[11px] text-text-tertiary truncate">
                    {p.email}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
