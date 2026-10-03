// @vitest-environment node
// /api/ext/config is fetched from inside the pages the content scripts run on
// (Insert asks it whether Insert is on), so the browser only hands the answer
// over with CORS headers for that page's origin. X's Insert failed on x.com
// because only LinkedIn was answered. Here: each extension's pages are
// answered, nothing else is, and every site a content script runs on is in
// the list (the e2e tests can't catch this: intercepted responses skip CORS).
import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "../../../app/api/ext/config/route";
import { CONTENT_SCRIPT_ORIGINS } from "../../../lib/contentScriptOrigins";
import linkedinManifest from "../../manifest.config";
import xManifest from "../../manifest.x.config";

const req = (method: string, origin?: string) =>
  new Request("https://carouselabs.com/api/ext/config", { method, headers: origin ? { origin } : {} });

describe("/api/ext/config CORS", () => {
  it("answers the X and LinkedIn pages, each with its own origin", async () => {
    for (const origin of ["https://x.com", "https://www.linkedin.com"]) {
      const res = await GET(req("GET", origin));
      expect(res.headers.get("access-control-allow-origin")).toBe(origin);
      expect(res.headers.get("vary")).toBe("Origin");
      expect(((await res.json()) as { insertEnabled: boolean }).insertEnabled).toBe(true);
      expect((await OPTIONS(req("OPTIONS", origin))).headers.get("access-control-allow-origin")).toBe(origin);
    }
  });

  it("answers no other page", async () => {
    for (const origin of ["https://evil.example", "https://twitter.com", "https://x.com.evil.example"]) {
      expect((await GET(req("GET", origin))).headers.get("access-control-allow-origin")).toBeNull();
    }
    expect((await GET(req("GET"))).headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("every site a content script runs on is answered", () => {
  type Manifest = { content_scripts?: Array<{ matches: string[]; js: string[] }> };
  const build = (m: unknown) =>
    (typeof m === "function" ? m({ mode: "production", command: "build" }) : m) as Manifest | Promise<Manifest>;

  it.each([
    ["LinkedIn", linkedinManifest],
    ["X", xManifest],
  ])("%s extension", async (_name, manifest) => {
    const m = await build(manifest);
    // The page scripts (not the sign-in relay, which runs on carouselabs.com).
    const pages = (m.content_scripts ?? [])
      .filter((c) => !c.js.some((file) => file.includes("authRelay")))
      .flatMap((c) => c.matches)
      .map((match) => new URL(match.replace(/\*+$/, "")).origin);
    expect(pages.length).toBeGreaterThan(0);
    for (const origin of pages) expect(CONTENT_SCRIPT_ORIGINS).toContain(origin);
  });
});
