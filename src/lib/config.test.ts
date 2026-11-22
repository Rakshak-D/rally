import { afterEach, describe, expect, it, vi } from "vitest";

import { getSiteUrl } from "./config";

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
