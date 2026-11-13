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
    // Every colour it sets is a grey (no hue, no saturation): HSL tokens are
    // "0 0% n%", and the gradients and day-grid shades use only hex or rgb()
    // greys (all three channels equal).
    const grey = (hex: string) => {
      const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join("") : hex.slice(1);
      return h.slice(0, 2).toLowerCase() === h.slice(2, 4).toLowerCase() && h.slice(2, 4).toLowerCase() === h.slice(4, 6).toLowerCase();
    };
    for (const [, value] of css.matchAll(/--[\w-]+: ([^;]+);/g)) {
      if (/^\d/.test(value)) {
        expect(value).toMatch(/^0 0% \d+%$/);
        continue;
      }
      const hexes = [...value.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)].map((m) => m[0]);
      for (const hex of hexes) expect(grey(hex), `${hex} is grey`).toBe(true);
      for (const [, r, g, b] of value.matchAll(/rgb\((\d+) (\d+) (\d+)/g)) expect(r === g && g === b, `rgb(${r} ${g} ${b}) is grey`).toBe(true);
      expect(hexes.length + [...value.matchAll(/rgb\(/g)].length, `${value} names a colour`).toBeGreaterThan(0);
    }
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
