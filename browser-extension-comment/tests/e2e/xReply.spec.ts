// The X extension end to end in real Chromium (EXT_DIST=dist-x or
// dist-x-store), on cleaned copies of real X pages: Reply on a post reaches
// the panel, a reply is written, and Insert types it into X's reply box for
// that post, never the box for a new post.
//
// The saved pages carry X's markup but not X's own scripts, so the reply box
// here is a plain editable box rather than X's live editor: this proves the
// extension finds and fills the right box; that X's editor keeps the text is
// checked on real X.
import type { Page } from "@playwright/test";
import { expect, test, type Harness } from "./harness";

const isX = /dist-x/.test(process.env.EXT_DIST ?? "dist");
test.skip(!isX, "the X extension: run with EXT_DIST=dist-x");

const REPLY = "Moving the invite step after the first real win is the part most teams miss.";
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

async function signedIn(harness: Harness) {
  harness.apiResponses.set("/api/ext/x/profiles", {
    status: 200,
    body: {
      defaultProfileId: null,
      profiles: [{ id: "sys-x-thoughtful-reply", name: "CarouseLabs — X Thoughtful Reply", tone: "Conversational", length: "80-220 characters", isDefault: true, isSystem: true, isRecommended: true }],
    },
  });
  harness.apiResponses.set("/api/ext/x/settings", { status: 200, body: { defaultProfileId: null, maxReplyLength: 280, insertButtonHidden: false } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: { email: "a@b.co", extension: null } });
  await harness.context.route("**/api/ext/x/reply", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: frame("start", {}) + frame("final", { comment: REPLY, freeRemaining: null, historyId: "h1", length: REPLY.length, maxLength: 280 }),
    }),
  );
  await harness.worker.evaluate(() => chrome.storage.local.set({ extensionToken: "cl_cmt_x" }));
}

// The panel as a tab; its "active tab" is pointed at the X page, as in real
// use where the panel sits beside it.
async function openPanel(harness: Harness): Promise<Page> {
  const panel = await harness.context.newPage();
  await panel.addInitScript(() => {
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
      info.active ? query({ url: "https://x.com/*" }) : query(info)) as typeof chrome.tabs.query;
  });
  await panel.setViewportSize({ width: 400, height: 720 });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/x/sidepanel/index.html`);
  return panel;
}

const replyButtonOf = (page: Page, handle: string) =>
  page
    .locator('[data-testid="primaryColumn"] article[data-testid="tweet"]')
    .filter({ has: page.locator('[data-testid="User-Name"]', { hasText: `@${handle}` }) })
    .filter({ hasNot: page.locator('[role="dialog"]') })
    .first()
    .locator('[data-testid="reply"]');

test("Reply on the feed reaches the panel, and Insert fills that post's reply pop-up", async ({ harness }) => {
  await signedIn(harness);
  const page = await harness.openX("/home", "x-reply-box.html");
  await replyButtonOf(page, "user1").dispatchEvent("click");
  await expect.poll(async () => (await harness.storage()).lastXReplyTarget?.post?.handle).toBe("user1");

  const panel = await openPanel(harness);
  await expect(panel.getByText("@user1")).toBeVisible();
  await panel.getByRole("button", { name: "Write reply" }).click();
  await expect(panel.getByRole("textbox", { name: "Your reply" })).toHaveValue(REPLY);
  await panel.getByRole("button", { name: "Insert" }).click();

  const dialogBox = page.locator('[role="dialog"] [data-testid="tweetTextarea_0"]');
  await expect(dialogBox).toContainText(REPLY);
  await expect(page.locator('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]')).not.toContainText(REPLY);
});

test("Insert is refused when the open pop-up is another post's", async ({ harness }) => {
  await signedIn(harness);
  const page = await harness.openX("/home", "x-reply-box.html");
  await replyButtonOf(page, "user3").dispatchEvent("click");
  await expect.poll(async () => (await harness.storage()).lastXReplyTarget?.post?.handle).toBe("user3");

  const panel = await openPanel(harness);
  await panel.getByRole("button", { name: "Write reply" }).click();
  await expect(panel.getByRole("textbox", { name: "Your reply" })).toHaveValue(REPLY);
  await panel.getByRole("button", { name: "Insert" }).click();
  await expect(panel.getByText(/written for a different post/)).toBeVisible();
  await expect(page.locator('[role="dialog"] [data-testid="tweetTextarea_0"]')).not.toContainText(REPLY);
});

test("On a post's own page, “Post your reply” is filled, after anything already typed", async ({ harness }) => {
  await signedIn(harness);
  const page = await harness.openX("/user1/status/1232133", "x-post.html");
  const box = page.locator('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]');
  await box.click();
  await page.keyboard.type("Agreed.");
  await expect.poll(async () => (await harness.storage()).lastXReplyTarget?.post?.url).toBe("https://x.com/user1/status/1232133");

  const panel = await openPanel(harness);
  await panel.getByRole("button", { name: "Write reply" }).click();
  await expect(panel.getByRole("textbox", { name: "Your reply" })).toHaveValue(REPLY);
  await panel.getByRole("button", { name: "Insert" }).click();
  await expect(box).toContainText(REPLY);
  const text = ((await box.textContent()) ?? "").replace(/\s+/g, " ");
  expect(text.indexOf("Agreed.")).toBeLessThan(text.indexOf(REPLY.slice(0, 20)));
});
