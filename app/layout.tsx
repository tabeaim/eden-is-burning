import type { Metadata } from "next";
import { Montserrat, Fraunces } from "next/font/google";
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
// (Fraunces: variable Serifenschrift; die optische Größe folgt der Schriftgröße.
// Die frühere Schreibmaschinen-Schrift liegt noch unter app/fonts.)
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
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
