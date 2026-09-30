// The panel follows the OS: dark colours under a dark system theme, and no
// movement (only instant state changes) with "reduce motion" on. Checked on
// computed styles in real Chromium, since that is where media queries apply.
import { expect, type Page } from "@playwright/test";
import { test, type Harness } from "./harness";

async function openPanel(harness: Harness, media: Parameters<Page["emulateMedia"]>[0]) {
  harness.apiResponses.set("/api/ext/profiles", { status: 200, body: { profiles: [] } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: { commentsToday: 0, insertWarningHidden: false, defaultCommentProfileId: null, extension: null } });
  await harness.worker.evaluate(() => chrome.storage.local.set({ extensionToken: "cl_cmt_e2e", onboardingComplete: true }));
  const panel = await harness.context.newPage();
  await panel.emulateMedia(media);
  await panel.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  await expect(panel.locator("main")).toBeVisible();
  return panel;
}

const background = (panel: Page) => panel.evaluate(() => getComputedStyle(document.body).backgroundColor);
const mainAnimation = (panel: Page) => panel.evaluate(() => getComputedStyle(document.querySelector("main")!).animationDuration);

test("light and dark follow the system theme", async ({ harness }) => {
  const light = await openPanel(harness, { colorScheme: "light" });
  expect(await background(light)).toBe("rgb(255, 255, 255)");

  const dark = await openPanel(harness, { colorScheme: "dark" });
  const [r, g, b] = (await background(dark)).match(/\d+/g)!.map(Number);
  expect(Math.max(r, g, b)).toBeLessThan(40);
});

test("side icons name themselves on hover, and the name gets out of the way once clicked", async ({ harness }) => {
  const panel = await openPanel(harness, { reducedMotion: "reduce" });
  const button = panel.getByRole("button", { name: "History", exact: true });
  const hint = panel.locator("nav span[aria-hidden]", { hasText: "History" });
  const opacity = () => hint.evaluate((el) => getComputedStyle(el).opacity);

  expect(await opacity()).toBe("0");
  await button.hover();
  await expect.poll(opacity).toBe("1");
  await button.click();
  await expect.poll(opacity).toBe("0");
  await panel.mouse.move(5, 5);
  await button.hover();
  await expect.poll(opacity).toBe("1");
});

test("reduce motion turns animations into instant changes", async ({ harness }) => {
  const normal = await openPanel(harness, { reducedMotion: "no-preference" });
  expect(await mainAnimation(normal)).toBe("0.18s");

  const reduced = await openPanel(harness, { reducedMotion: "reduce" });
  expect(await mainAnimation(reduced)).toBe("0.001s");
});
