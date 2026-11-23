export function getSupabasePublicConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;
  return { url, key };
}

export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";
  if (!configured) {
    if (isProduction) throw new Error("NEXT_PUBLIC_SITE_URL must be configured in production.");
    return new URL("http://localhost:3000");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid URL.");
  }

  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a canonical origin without credentials, paths, or query strings.");
  }

  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const isLocalHttp = url.protocol === "http:" && isLoopback && !isProduction;
  if (isProduction && isLoopback) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use a public HTTPS origin in production.");
  }
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
  }

  return new URL(url.origin);
}

export function safeInternalPath(value: string | null, fallback = "/app"): string {
  if (!value || /[\\\\\u0000-\u001f\u007f]/.test(value) || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  // Only redirect to routes supported by Rally. In particular, block URLs that
  // acquire a foreign origin when normalized by WHATWG URL parsing.
  const [pathname, query = ""] = value.split("?");
  const allowedPage = /^(?:\/app|\/tasks|\/goals|\/history|\/settings|\/profile|\/help|\/auth\/reset-password)$/.test(pathname);
  const allowedInvite = /^\/join\/[a-f0-9]{64}$/i.test(pathname);
  if (!allowedPage && !allowedInvite) return fallback;
  if (value.includes("#") || value.split("?").length > 2) return fallback;
  const workspaceQuery = /^workspace=[0-9a-f-]{36}$/i;
  const settingsQuery = /^(?:workspace=[0-9a-f-]{36}(?:&tab=(?:profile|workspace|people|challenges|account))?|tab=(?:profile|workspace|people|challenges|account)(?:&workspace=[0-9a-f-]{36})?)$/i;
  if (query && !(pathname === "/settings" ? settingsQuery.test(query) : workspaceQuery.test(query))) return fallback;

  return value;
}
