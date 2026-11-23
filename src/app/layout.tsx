import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Big_Shoulders as Big_Shoulders_Display, Hanken_Grotesk } from "next/font/google";

import { ThemeProvider } from "@/components/app/theme-provider";
import { SkipLink } from "@/components/app/skip-link";
import "./globals.css";

const displayFont = Big_Shoulders_Display({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display", display: "swap", adjustFontFallback: false, fallback: ["Arial"] });
const uiFont = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ui", display: "swap" });

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
      <body className={`${displayFont.variable} ${uiFont.variable}`}>
        <ThemeProvider>
          <SkipLink />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
