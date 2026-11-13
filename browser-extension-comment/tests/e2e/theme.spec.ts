// The panel follows the OS: dark colours under a dark system theme, and no
// movement (only instant state changes) with "reduce motion" on. Checked on
// computed styles in real Chromium, since that is where media queries apply.
import { expect, type Page } from "@playwright/test";
import { test, type Harness } from "./harness";

async function openPanel(harness: Harness, media: Parameters<Page["emulateMedia"]>[0]) {
  harness.apiResponses.set("/api/ext/profiles", { status: 200, body: { profiles: [] } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: { email: "me@example.com", plan: "FREE", commentsThisMonth: 0, commentsToday: 0, insertWarningHidden: false, defaultCommentProfileId: null, extension: null } });
  harness.apiResponses.set("/api/ext/activity", { status: 200, body: { one: "comment", many: "comments", days: [] } });
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
  // Engage's lavender mist (#F4F3FC).
  expect(await background(light)).toBe("rgb(244, 243, 252)");

  const dark = await openPanel(harness, { colorScheme: "dark" });
  const [r, g, b] = (await background(dark)).match(/\d+/g)!.map(Number);
  expect(Math.max(r, g, b)).toBeLessThan(40);
});

test("the bottom bar names its four places, and marks where you are", async ({ harness }) => {
  const panel = await openPanel(harness, { reducedMotion: "reduce" });
  const bar = panel.getByRole("navigation", { name: "Screens" });
  await expect(bar.getByRole("button")).toHaveText(["Write", "Messages", "Voices", "Profile"]);
  // At the bottom of the panel, under the screen.
  const [barBox, mainBox] = await Promise.all([bar.boundingBox(), panel.locator("main").boundingBox()]);
  expect(barBox!.y).toBeGreaterThanOrEqual(mainBox!.y + mainBox!.height - 1);
  await expect(bar.getByRole("button", { name: "Write" })).toHaveAttribute("aria-current", "page");
  await bar.getByRole("button", { name: "Profile" }).click();
  await expect(bar.getByRole("button", { name: "Profile" })).toHaveAttribute("aria-current", "page");
  // History lives in Profile now; Profile stays the current tab there.
  await panel.getByRole("button", { name: "History", exact: true }).click();
  await expect(bar.getByRole("button", { name: "Profile" })).toHaveAttribute("aria-current", "page");
});

test("reduce motion turns animations into instant changes", async ({ harness }) => {
  const normal = await openPanel(harness, { reducedMotion: "no-preference" });
  expect(await mainAnimation(normal)).toBe("0.18s");

  const reduced = await openPanel(harness, { reducedMotion: "reduce" });
  expect(await mainAnimation(reduced)).toBe("0.001s");
});
