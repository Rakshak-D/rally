import { afterEach, describe, expect, it, vi } from "vitest";

import { getSiteUrl, getSupabasePublicConfig, safeInternalPath } from "./config";

describe("getSupabasePublicConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("requires the publishable key and does not accept the legacy anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-key");
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("returns the configured publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    expect(getSupabasePublicConfig()).toEqual({ url: "http://127.0.0.1:54321", key: "publishable-key" });
  });
});

describe("getSiteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("requires a canonical URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(() => getSiteUrl()).toThrow("must be configured in production");
  });

  it("uses the local default outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl().toString()).toBe("http://localhost:3000/");
  });

  it("rejects malformed URLs with a safe configuration error", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a URL");
    expect(() => getSiteUrl()).toThrow("must be a valid URL");
  });

  it("rejects local HTTP URLs in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(() => getSiteUrl()).toThrow("must use a public HTTPS origin");
  });

  it.each([
    "https://rally.example/account",
    "https://user:password@rally.example",
    "https://rally.example?next=/app",
    "https://rally.example#account",
  ])("rejects non-origin URL components: %s", (value) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    expect(() => getSiteUrl()).toThrow("must be a canonical origin");
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])("allows local HTTP on %s", (host) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", `http://${host}:3000`);
    expect(getSiteUrl().toString()).toBe(`http://${host}:3000/`);
  });

  it("requires HTTPS for public hosts", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://rally.example");
    expect(() => getSiteUrl()).toThrow("must use HTTPS");
  });

  it("allows HTTPS for public hosts", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://rally.example");
    expect(getSiteUrl().toString()).toBe("https://rally.example/");
  });
});

describe("safeInternalPath", () => {
  it.each([
    "/app",
    "/tasks",
    "/goals",
    "/history",
    "/settings",
    "/profile",
    "/help",
    "/auth/reset-password",
    "/join/" + "a".repeat(64),
    "/app?workspace=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "/settings?tab=profile",
    "/settings?workspace=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&tab=people",
    "/settings?tab=challenges&workspace=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  ])("allows a known internal destination: %s", (path) => {
    expect(safeInternalPath(path)).toBe(path);
  });

  it.each([
    null,
    "",
    "//evil.example",
    "/\\\\evil.example",
    "/" + String.fromCharCode(10) + "evil.example",
    "/" + String.fromCharCode(13) + "evil.example",
    "/" + String.fromCharCode(9) + "evil.example",
    "/" + String.fromCharCode(0) + "evil.example",
    "/app#//evil.example",
    "/app?next=https://evil.example",
    "/app?workspace=not-a-uuid",
    "/settings?tab=admin",
    "/settings?workspace=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&tab=people&admin=true",
    "/unknown",
    "https://evil.example",
    "/join/invalid",
    "/app??workspace=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  ])("rejects unsafe or unsupported destination: %s", (path) => {
    expect(safeInternalPath(path)).toBe("/app");
  });
});
