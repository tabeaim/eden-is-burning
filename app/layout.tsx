import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { THEME_BOOT_SCRIPT, ThemeProvider } from "@/lib/theme";

// Serifenlose Schrift für Fließtext, Content-Titel und Prosa
const sans = Montserrat({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
});

// Display-Schrift – Bildmarke (Logo) und Seiten-Überschriften
// (My Type of Font, Freeware – siehe app/fonts/mytype-readme.txt. Aus der Datei
// ist die leere, defekte Kerning-Tabelle entfernt, sonst lehnt der Browser sie ab.
// Die frühere Computer Modern Typewriter liegt noch als cmuntt.ttf daneben.)
const display = localFont({
  src: "./fonts/mytype.ttf",
  // Die Schrift läuft groß und breit – überall etwas kleiner zeichnen, ohne die
  // Schriftgrößen der Skala anzufassen.
  declarations: [{ prop: "size-adjust", value: "80%" }],
  variable: "--font-display",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eden Is Burning",
  description: "Kollaborative Prosa-RPG-Plattform – Eden, Virginia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${sans.variable} ${display.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <StoreProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
