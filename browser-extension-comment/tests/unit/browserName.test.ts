// Messages about a browser setting name the browser the person is using
// ("Chrome is blocking extensions on LinkedIn"), and never a wrong one.
import { describe, expect, it } from "vitest";
import { browserName, extensionsIconLooks } from "@/lib/browserName";

const brands = (...names: string[]) => ({ brands: names.map((brand) => ({ brand, version: "154" })) });
const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";

describe("the browser's name, from the brands it reports", () => {
  it.each([
    ["Google Chrome", ["Google Chrome", "Chromium", "Not.A/Brand"], "Chrome"],
    ["Chrome without a window (tests)", ["HeadlessChrome", "Chromium", "Not.A/Brand"], "Chrome"],
    ["Microsoft Edge", ["Not.A/Brand", "Chromium", "Microsoft Edge"], "Edge"],
    ["Opera", ["Opera", "Chromium", "Not_A Brand"], "Opera"],
    ["Opera GX", ["Opera GX", "Opera", "Chromium"], "Opera GX"],
    ["Brave", ["Brave", "Chromium", "Not.A/Brand"], "Brave"],
    ["Yandex", ["Chromium", "YaBrowser", "Not.A/Brand"], "Yandex Browser"],
    ["Vivaldi (reports only Chromium)", ["Chromium", "Not.A/Brand"], "Your browser"],
  ])("%s", (_label, list, expected) => {
    expect(browserName({ userAgent: CHROME_UA, userAgentData: brands(...list) })).toBe(expected);
  });

  it("Brave is Brave even where it reports Chrome's brands", () => {
    expect(browserName({ userAgent: CHROME_UA, userAgentData: brands("Google Chrome", "Chromium"), brave: {} })).toBe("Brave");
  });

  it("a browser hiding behind Chromium is never called Chrome, though its user agent says Chrome", () => {
    expect(browserName({ userAgent: CHROME_UA, userAgentData: brands("Chromium", "Not=A?Brand") })).not.toBe("Chrome");
  });
});

describe("the browser's name, from the user agent when there are no brands", () => {
  it.each([
    ["Chrome", CHROME_UA, "Chrome"],
    ["Chrome without a window", CHROME_UA.replace("Chrome/", "HeadlessChrome/"), "Chrome"],
    ["Edge", `${CHROME_UA} Edg/154.0.0.0`, "Edge"],
    ["Opera", `${CHROME_UA} OPR/120.0.0.0`, "Opera"],
    ["Vivaldi (older)", `${CHROME_UA} Vivaldi/6.0`, "Vivaldi"],
    ["Yandex", `${CHROME_UA} YaBrowser/25.0`, "Yandex Browser"],
    ["Firefox", "Mozilla/5.0 (Windows NT 10.0; rv:140.0) Gecko/20100101 Firefox/140.0", "Firefox"],
    ["something unknown", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36", "Your browser"],
  ])("%s", (_label, userAgent, expected) => {
    expect(browserName({ userAgent })).toBe(expected);
  });
});

describe("the Extensions icon it describes", () => {
  it("is Opera's cube in Opera, the puzzle piece elsewhere", () => {
    expect(extensionsIconLooks("Opera")).toBe("cube");
    expect(extensionsIconLooks("Opera GX")).toBe("cube");
    expect(extensionsIconLooks("Chrome")).toBe("puzzle piece");
    expect(extensionsIconLooks("Your browser")).toBe("puzzle piece");
  });
});
