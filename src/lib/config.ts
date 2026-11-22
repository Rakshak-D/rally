export function getSupabasePublicConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}

export function getSiteUrl(): URL {
  const value = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const url = new URL(value);

  const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside the local machine.");
  }

  return url;
}

export function safeInternalPath(value: string | null, fallback = "/app"): string {
  if (!value || /[\\\\\u0000-\u001f\u007f]/.test(value) || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  // Only redirect to routes supported by Rally. In particular, block URLs that
  // acquire a foreign origin when normalized by WHATWG URL parsing.
  const [pathname, query = ""] = value.split("?");
  const allowedPage = /^(?:\/app|\/tasks|\/goals|\/history|\/settings|\/auth\/reset-password)$/.test(pathname);
  const allowedInvite = /^\/join\/[a-f0-9]{64}$/i.test(pathname);
  if (!allowedPage && !allowedInvite) return fallback;
  if (value.includes("#") || value.split("?").length > 2) return fallback;
  if (query && !/^workspace=[0-9a-f-]{36}$/i.test(query)) return fallback;

  return value;
}
