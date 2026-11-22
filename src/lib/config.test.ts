import { afterEach, describe, expect, it, vi } from "vitest";

import { getSiteUrl, safeInternalPath } from "./config";

describe("getSiteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

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
    "/auth/reset-password",
    "/join/" + "a".repeat(64),
    "/app?workspace=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
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
    "/unknown",
    "https://evil.example",
    "/join/invalid",
    "/app??workspace=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  ])("rejects unsafe or unsupported destination: %s", (path) => {
    expect(safeInternalPath(path)).toBe("/app");
  });
});
