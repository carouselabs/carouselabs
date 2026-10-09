// The browser's own name ("Chrome", "Edge", "Brave", ...), for messages about
// a setting in that browser ("Chrome is blocking extensions on LinkedIn").
// Most specific signal first:
// 1. Brave says so itself (navigator.brave), whatever else it reports.
// 2. The brands the browser reports (navigator.userAgentData), which name
//    Edge, Opera, Brave, Yandex, Samsung Internet and Google Chrome. A
//    browser that lists only "Chromium" (Vivaldi, Arc and others hide behind
//    it) is not Google Chrome, so it isn't called that.
// 3. The user agent, where there are no brands.
// Anything else is "Your browser": never a wrong name.

type Brand = { brand: string; version?: string };
type NavigatorLike = {
  userAgent?: string;
  userAgentData?: { brands?: Brand[] };
  brave?: unknown;
};

const BRANDS: [RegExp, string][] = [
  [/^Microsoft Edge$/i, "Edge"],
  [/^Opera GX$/i, "Opera GX"],
  [/^Opera$/i, "Opera"],
  [/^Brave$/i, "Brave"],
  [/^Vivaldi$/i, "Vivaldi"],
  [/^(YaBrowser|Yandex)$/i, "Yandex Browser"],
  [/^Samsung Internet$/i, "Samsung Internet"],
  [/^DuckDuckGo$/i, "DuckDuckGo"],
  [/^Arc$/i, "Arc"],
  [/^(Google Chrome|HeadlessChrome)$/i, "Chrome"],
];

const USER_AGENTS: [RegExp, string][] = [
  [/\bEdg(e|A|iOS)?\//, "Edge"],
  [/\bOPR\/|\bOpera\b/, "Opera"],
  [/\bVivaldi\//, "Vivaldi"],
  [/\bYaBrowser\//, "Yandex Browser"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\bFirefox\//, "Firefox"],
  [/(Headless)?Chrome\//, "Chrome"],
];

export const UNKNOWN_BROWSER = "Your browser";

export function browserName(nav: NavigatorLike = globalThis.navigator ?? {}): string {
  if (nav.brave) return "Brave";

  const brands = nav.userAgentData?.brands;
  if (brands && brands.length > 0) {
    for (const [pattern, name] of BRANDS) {
      if (brands.some((b) => pattern.test(b.brand.trim()))) return name;
    }
    // Only "Chromium" (and the deliberately odd filler brands): a browser that
    // doesn't say which, but isn't Google Chrome.
    return UNKNOWN_BROWSER;
  }

  const ua = nav.userAgent ?? "";
  for (const [pattern, name] of USER_AGENTS) {
    if (pattern.test(ua)) return name;
  }
  return UNKNOWN_BROWSER;
}

// The icon that opens a browser's Extensions menu: Opera's is a cube, the
// other Chromium browsers' a puzzle piece.
export function extensionsIconLooks(name: string = browserName()): string {
  return name.startsWith("Opera") ? "cube" : "puzzle piece";
}
