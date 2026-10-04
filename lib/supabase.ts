"use client";

import { createClient } from "@supabase/supabase-js";

// Browser-Client für Eden Is Burning. Nutzt den öffentlichen anon-Key –
// die eigentliche Absicherung passiert über Row Level Security (siehe
// supabase/schema.sql). Der anon-Key darf im Browser landen.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Bewusst nur eine Warnung, kein throw: solange die Keys fehlen, läuft die
  // App weiter (Store fällt auf Seed-/localStorage-Daten zurück).
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen – .env.local anlegen (siehe .env.local.example).",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabaseConfigured = Boolean(url && anonKey);
