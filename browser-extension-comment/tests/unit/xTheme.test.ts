// @vitest-environment node
// CarouseLabs Engage for X is black and white (src/x/sidepanel/x-theme.css):
// its panel loads those colours after the shared ones, its primary colour is
// black (white in dark mode) with no CarouseLabs purple left, its welcome
// page matches, and its icons are its own (public-x), not LinkedIn's.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const PURPLE = /262 8\d%|#7C3AED/i;

describe("the X extension's colours", () => {
  it("are loaded after the shared ones, so they win", () => {
    const main = read("src/x/sidepanel/main.tsx");
    const shared = main.indexOf('import "../../sidepanel/styles.css"');
    const x = main.indexOf('import "./x-theme.css"');
    expect(shared).toBeGreaterThan(-1);
    expect(x).toBeGreaterThan(shared);
  });

  it("are black and white, in light and dark", () => {
    const css = read("src/x/sidepanel/x-theme.css");
    const [light, dark] = css.split("@media (prefers-color-scheme: dark)");
    expect(light).toMatch(/--primary: 0 0% 7%;/);
    expect(light).toMatch(/--primary-foreground: 0 0% 100%;/);
    expect(dark).toMatch(/--primary: 0 0% 96%;/);
    expect(dark).toMatch(/--primary-foreground: 0 0% 4%;/);
    // Every colour it sets is a grey (no hue, no saturation).
    for (const [, value] of css.matchAll(/--[\w-]+: ([^;]+);/g)) expect(value).toMatch(/^0 0% \d+%$/);
    for (const token of ["--primary", "--primary-text", "--accent", "--accent-foreground", "--ring"]) {
      expect(light).toContain(`${token}:`);
      expect(dark).toContain(`${token}:`);
    }
  });

  it("are on the welcome page too, with no purple", () => {
    expect(read("welcome-x.html")).not.toMatch(PURPLE);
  });

  it("come with the X extension's own icons", () => {
    expect(read("vite.x.config.ts")).toMatch(/publicDir: "public-x"/);
    for (const size of [16, 48, 128]) {
      const x = fs.readFileSync(path.join(root, `public-x/icons/icon${size}.png`));
      const linkedin = fs.readFileSync(path.join(root, `public/icons/icon${size}.png`));
      expect(x.equals(linkedin)).toBe(false);
    }
  });
});
