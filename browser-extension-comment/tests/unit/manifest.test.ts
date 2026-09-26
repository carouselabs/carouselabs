// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import manifestFactory from "../../manifest.config";

type Manifest = chrome.runtime.ManifestV3;
const build = (mode: string) =>
  (manifestFactory as unknown as (env: { mode: string; command: string }) => Manifest)({ mode, command: "build" });

const prod = build("production");
const dev = build("development");
const root = path.resolve(__dirname, "../..");

describe("production manifest", () => {
  it("is Manifest V3 with name, version and description", () => {
    expect(prod.manifest_version).toBe(3);
    expect(prod.name).toBeTruthy();
    expect(prod.version).toBe(pkg.version);
    expect(prod.description!.length).toBeLessThanOrEqual(132); // Chrome Web Store limit
  });

  it("requests exactly the permissions the code uses", () => {
    expect([...(prod.permissions ?? [])].sort()).toEqual(["clipboardWrite", "sidePanel", "storage"]);
  });

  it("has only the two production hosts — no localhost, no wildcards", () => {
    expect(prod.host_permissions).toEqual(["https://www.linkedin.com/*", "https://carouselabs.com/*"]);
    const everything = JSON.stringify(prod);
    expect(everything).not.toMatch(/localhost/);
    expect(everything).not.toMatch(/<all_urls>|\*:\/\/\*\//);
  });

  it("injects the LinkedIn script only into linkedin.com and the relay only into the sign-in page", () => {
    const scripts = prod.content_scripts ?? [];
    expect(scripts).toHaveLength(2);
    expect(scripts.find((s) => s.js?.includes("src/content/authRelay.ts"))?.matches).toEqual([
      "https://carouselabs.com/extension-connect*",
    ]);
    expect(scripts.find((s) => s.js?.includes("src/content-script.ts"))?.matches).toEqual(["https://www.linkedin.com/*"]);
  });

  it("does not weaken the default CSP or open itself to web pages", () => {
    expect(prod.content_security_policy).toBeUndefined();
    expect((prod as Record<string, unknown>).externally_connectable).toBeUndefined();
    expect((prod as Record<string, unknown>).web_accessible_resources).toBeUndefined();
  });

  it("points every icon at a file that exists", () => {
    const icons = { ...prod.icons, ...(prod.action?.default_icon as Record<string, string>) };
    for (const file of Object.values(icons)) {
      expect(fs.existsSync(path.join(root, "public", file)), file).toBe(true);
    }
  });

  it("declares the Generate shortcut the service worker listens for", () => {
    expect(prod.commands?.["generate-comment"]).toBeDefined();
  });
});

describe("development manifest", () => {
  it("adds localhost for the local API server, and only then", () => {
    expect(dev.host_permissions).toContain("http://localhost:3000/*");
  });
});

describe("source hygiene", () => {
  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? sourceFiles(full) : /\.(ts|tsx|html)$/.test(entry.name) ? [full] : [];
    });
  }
  const files = [...sourceFiles(path.join(root, "src")), path.join(root, "welcome.html")];

  it.each([
    ["eval / new Function", /\beval\s*\(|new Function\s*\(/],
    ["innerHTML / dangerouslySetInnerHTML", /\.innerHTML\s*=|dangerouslySetInnerHTML|insertAdjacentHTML/],
    ["remote script tags", /<script[^>]+src=["']https?:/],
    ["inline script bodies", /<script(?![^>]*\bsrc=)[^>]*>\s*\S/],
    ["hardcoded bearer tokens", /cl_cmt_[0-9a-f]{16,}/],
  ])("contains no %s", (_label, pattern) => {
    const offenders = files.filter((file) => pattern.test(fs.readFileSync(file, "utf8")));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
