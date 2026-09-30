// Every text colour the panel puts on a surface must stay readable: WCAG AA
// (4.5:1) for normal text, in the light theme and the dark one. Reads the
// real tokens from src/sidepanel/styles.css, so a colour tweak that breaks a
// pair fails here instead of in someone's eyes.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "../../src/sidepanel/styles.css"), "utf8");

type Hsl = [number, number, number];

function tokensIn(block: string): Record<string, Hsl> {
  const out: Record<string, Hsl> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*([\d.]+) ([\d.]+)% ([\d.]+)%/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const light = tokensIn(css.slice(0, darkStart));
const dark = { ...light, ...tokensIn(css.slice(darkStart)) };

function rgb([h, s, l]: Hsl): [number, number, number] {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

function luminance(c: Hsl): number {
  const [r, g, b] = rgb(c).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Hsl, b: Hsl): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text token on the surfaces it is actually used on.
const PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["primary-text", "background"],
  ["primary-text", "card"],
  ["primary-text", "accent"],
  ["accent-foreground", "accent"],
  ["destructive", "card"],
  ["destructive", "destructive-soft"],
  ["destructive-foreground", "destructive"],
  ["success", "card"],
  ["success", "success-soft"],
  ["warning", "warning-soft"],
  ["secondary-foreground", "secondary"],
  ["popover-foreground", "popover"],
];

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("%s theme", (_name, tokens) => {
  it.each(PAIRS)("%s on %s is readable (at least 4.5:1)", (fg, bg) => {
    expect(tokens[fg], `--${fg} is defined`).toBeDefined();
    expect(tokens[bg], `--${bg} is defined`).toBeDefined();
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

it("reads both themes from the stylesheet", () => {
  expect(Object.keys(light).length).toBeGreaterThan(15);
  expect(dark.background).not.toEqual(light.background);
});
