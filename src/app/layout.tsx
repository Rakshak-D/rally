import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/app/theme-provider";
import { SkipLink } from "@/components/app/skip-link";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-plus-jakarta", display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-ibm-plex-mono", display: "swap" });

export const metadata: Metadata = {
  applicationName: "Rally",
  title: { default: "Rally — Show up together.", template: "%s · Rally" },
  description: "Daily progress and shared accountability for your circle.",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${plusJakarta.variable} ${ibmPlexMono.variable}`}>
        <ThemeProvider>
          <SkipLink />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
