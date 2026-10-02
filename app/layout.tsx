import type { Metadata } from "next";
import { Montserrat, Special_Elite } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

// Serifenlose Schrift für Fließtext, Content-Titel und Prosa
const sans = Montserrat({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
});

// Display-Schrift — Bildmarke (Logo) und Seiten-Überschriften
const display = Special_Elite({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Eden Is Burning",
  description: "Kollaborative Prosa-RPG-Plattform — Eden, Virginia.",
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
    >
      <body className="min-h-full">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
