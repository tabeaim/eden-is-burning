import type { Metadata } from "next";
import { Montserrat, Grenze_Gotisch } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

const sans = Montserrat({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
});

// Blackletter-Display-Font für Logo, Profilnamen, Sektionstitel
const display = Grenze_Gotisch({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
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
