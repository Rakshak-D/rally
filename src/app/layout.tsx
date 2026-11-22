import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-ibm-plex-mono", display: "swap" });

export const metadata: Metadata = {
  applicationName: "Rally",
  title: { default: "Rally — Show up together.", template: "%s · Rally" },
  description: "Daily progress and shared accountability for your circle.",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
  icons: { icon: "/brand/rally-mark.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${ibmPlexMono.variable}`}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
