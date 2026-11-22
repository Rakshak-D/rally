"use client";

import "./globals.css";

import { ErrorState } from "@/components/app/error-state";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <head><title>Rally · Something went wrong</title></head>
      <body className="rally-global-error"><ErrorState error={error} retry={retry} /></body>
    </html>
  );
}
