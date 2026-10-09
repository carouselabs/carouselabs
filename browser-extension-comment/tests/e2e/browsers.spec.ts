// What other browsers need, in a real browser (Chromium by default; the
// Edge on this machine with EXT_BROWSER=msedge):
// - the panel in a window of its own, as the toolbar icon opens it where the
//   browser has no side panel (Opera, Vivaldi, Arc; src/lib/panelHost.ts),
//   still works with the LinkedIn tab of the browser window, not its own;
// - a Comment click is read at once even while carouselabs.com doesn't
//   answer (it used to wait for the selectors, up to 8 seconds).
import { expect } from "@playwright/test";
import { BROWSER_CHANNEL, test, type Harness } from "./harness";

const isX = /dist-x/.test(process.env.EXT_DIST ?? "dist");

const PROFILE = {
  id: "p1", userId: null, name: "Thoughtful Expert", whoIAm: "", goal: "", tone: "Professional", length: "medium",
  emoji: "none", language: "English", alwaysDo: null, neverDo: null, samples: [], isDefault: true,
  isSystem: true, isRecommended: false, testsUsed: 0, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
};
const ME = {
  email: "user@example.com", plan: "FREE", commentsThisMonth: 0, commentsToday: 0,
  defaultCommentProfileId: "p1", defaultLanguage: null, insertWarningHidden: false,
  extension: { access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null },
};
const COMMENT = "Remote-first with a ±3h window is a smart middle ground.";

async function signIn(harness: Harness) {
  harness.apiResponses.set("/api/ext/profiles", { status: 200, body: { profiles: [PROFILE] } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: ME });
  harness.apiResponses.set("/api/ext/settings", { status: 200, body: {} });
  harness.apiResponses.set("/api/ext/contacts", { status: 200, body: { contacts: [] } });
  harness.apiResponses.set("/api/ext/generate", { status: 200, body: { comment: COMMENT, freeRemaining: null, historyId: "h1" } });
  await harness.worker.evaluate(() => chrome.storage.local.set({ extensionToken: "cl_cmt_e2e", onboardingComplete: true }));
}

test("in a window of its own, the panel captures, writes and inserts for the browser window's LinkedIn tab", async ({ harness }) => {
  test.skip(isX, "the LinkedIn extension (EXT_DIST=dist or dist-store)");
  await signIn(harness);
  const page = await harness.open("/feed/", "feed.html");

  // What the toolbar icon opens in a browser without a side panel.
  const opened = harness.context.waitForEvent("page", (p) => p.url().includes("engageWindow"));
  await harness.worker.evaluate(
    (url) => chrome.windows.create({ url, type: "popup", width: 420, height: 800 }).then(() => undefined),
    `chrome-extension://${harness.extensionId}/src/sidepanel/index.html?engageWindow=1`,
  );
  const panel = await opened;
  // Nothing on Home points away from LinkedIn: the panel sees the LinkedIn
  // tab even though its own window holds only itself.
  await expect(panel.getByText("Pick a post on LinkedIn")).toBeVisible();
  await expect(panel.getByText(/not on LinkedIn/)).toHaveCount(0);

  await page.locator("[data-fixture='post-2'] button[aria-label='Comment']").click();
  await expect(panel.getByText("Acme Corp")).toBeVisible();
  const generate = panel.getByRole("button", { name: "Generate", exact: true });
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(panel.getByRole("textbox", { name: "Your comment" })).toHaveValue(COMMENT);

  await panel.getByRole("button", { name: "Insert" }).click();
  await expect(page.locator("[data-fixture='post-2-comment-box']")).toContainText(COMMENT);
});

test("a Comment click is read at once while carouselabs.com doesn't answer", async ({ harness }) => {
  test.skip(isX, "the LinkedIn extension (EXT_DIST=dist or dist-store)");
  // Registered after the harness's own routes, so tried first: never answers.
  await harness.context.route("**/api/ext/config", () => new Promise<void>(() => {}));
  const page = await harness.open("/feed/", "feed.html");
  await page.locator("[data-fixture='post-1'] button[aria-label^='Comment']").click();
  // Under the 8 s the old code waited for the config before reading a click
  // (CONFIG_TIMEOUT_MS), with room for a slow test machine.
  await expect
    .poll(async () => (await harness.storage()).lastSelectedPost?.authorName, { timeout: 6_000 })
    .toBe("Jane Doe");
});

test.describe("a browser that blocks extensions on the site", () => {
  test.use({ blockedSites: ["https://www.linkedin.com", "https://x.com"] });

  test("the panel says so and how to allow them, instead of Comment silently doing nothing", async ({ harness }) => {
    test.skip(BROWSER_CHANNEL === "chromium", "Playwright's Chromium ignores the site setting: run with EXT_BROWSER=msedge");
    await signIn(harness);
    const page = await harness.context.newPage();
    const site = isX ? "https://x.com/priya/status/1840000000000000001" : "https://www.linkedin.com/feed/";
    if (isX) harness.xPages.set("/priya/status/1840000000000000001", "x-post.html");
    else harness.pages.set("/feed/", "feed.html");
    await page.goto(site);

    const panel = await harness.context.newPage();
    // The panel is a page here; the site tab stands in as the active tab.
    await panel.addInitScript((origin) => {
      const query = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
        info.active ? query({ url: `${origin}*` }) : query(info)) as typeof chrome.tabs.query;
    }, new URL(site).origin + "/");
    await panel.goto(`chrome-extension://${harness.extensionId}/src/${isX ? "x/" : ""}sidepanel/index.html`);

    const siteName = isX ? "X" : "LinkedIn";
    await expect(panel.getByRole("heading", { name: `Edge is blocking extensions on ${siteName}` })).toBeVisible();
    await expect(panel.getByText(`Allow extensions on ${new URL(site).host}`)).toBeVisible();
  });
});

test("the X extension in a window of its own works with the browser window's X tab", async ({ harness }) => {
  test.skip(!isX, "the X extension (EXT_DIST=dist-x or dist-x-store)");
  const reply = "Moving the invite after the first real win is the part most teams miss.";
  harness.apiResponses.set("/api/ext/x/profiles", {
    status: 200,
    body: { defaultProfileId: null, profiles: [{ id: "x1", name: "Short & Simple", tone: "Casual", length: "20-100 characters", isDefault: true, isSystem: true, isRecommended: true }] },
  });
  harness.apiResponses.set("/api/ext/x/settings", { status: 200, body: { defaultProfileId: null, maxReplyLength: 280, insertButtonHidden: false } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: ME });
  harness.apiResponses.set("/api/ext/x/reply", { status: 200, body: { comment: reply, freeRemaining: null, historyId: "h1", length: reply.length, maxLength: 280 } });
  await harness.worker.evaluate(() =>
    chrome.storage.local.set({
      extensionToken: "cl_cmt_x",
      lastXReplyTarget: {
        capturedAt: Date.now(),
        post: { author: "Priya Raman", handle: "priya", text: "We cut onboarding from 14 steps to 5.", url: "https://x.com/priya/status/1840000000000000001", media: [] },
        thread: [],
        quoted: null,
        isOwnPost: false,
      },
    }),
  );
  await harness.openX("/priya/status/1840000000000000001", "x-post.html");

  const opened = harness.context.waitForEvent("page", (p) => p.url().includes("engageWindow"));
  await harness.worker.evaluate(
    (url) => chrome.windows.create({ url, type: "popup", width: 420, height: 800 }).then(() => undefined),
    `chrome-extension://${harness.extensionId}/src/x/sidepanel/index.html?engageWindow=1`,
  );
  const panel = await opened;
  await expect(panel.getByText("@priya")).toBeVisible();
  // Writing is offered (it waits on X being the active tab).
  await expect(panel.getByText(/not on X/)).toHaveCount(0);
  await panel.getByRole("button", { name: "Write reply" }).click();
  await expect(panel.getByRole("textbox", { name: "Your reply" })).toHaveValue(reply);
});
