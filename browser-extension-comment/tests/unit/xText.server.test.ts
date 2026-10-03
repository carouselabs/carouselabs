// @vitest-environment node
// lib/xText.ts counts the way X does (twitter-text v3 rules), so a reply that
// the panel says fits really fits X's box.
import { describe, expect, it } from "vitest";
import { fitsX, xLength, X_MAX_LENGTH } from "../../../lib/xText";

describe("xLength", () => {
  it.each([
    ["Hello world", 11],
    ["", 0],
    ["Café, naïve résumé", 18],
    // CJK counts 2 each.
    ["日本語", 6],
    // An emoji counts 2, however many code points it is made of.
    ["Nice 👍", 7],
    ["👍🏽", 2],
    ["👨‍👩‍👧‍👦", 2],
    ["🇮🇳", 2],
    // Every link is 23, short or long.
    ["see https://x.com", 4 + 23],
    ["see https://carouselabs.com/pricing?ref=a-very-long-campaign-name", 4 + 23],
    ["carouselabs.com and example.io", 23 + 5 + 23],
    // Curly quotes and dashes are in X's 1-weight ranges; "…" (U+2026) is
    // not, so it counts 2.
    ["“quoted” – ok…", 15],
  ])("%j is %i", (text, expected) => {
    expect(xLength(text)).toBe(expected);
  });

  it("knows where the 280 line is", () => {
    expect(fitsX("a".repeat(X_MAX_LENGTH))).toBe(true);
    expect(fitsX("a".repeat(X_MAX_LENGTH + 1))).toBe(false);
    // 140 CJK characters fill a post.
    expect(fitsX("日".repeat(140))).toBe(true);
    expect(fitsX("日".repeat(141))).toBe(false);
    // A long link takes only 23.
    expect(fitsX(`${"a".repeat(256)} https://example.com/${"b".repeat(200)}`)).toBe(true);
  });
});
