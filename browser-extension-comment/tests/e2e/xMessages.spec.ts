// X DMs end to end in real Chromium (EXT_DIST=dist-x or dist-x-store), on a
// test page built from a layout of X's real Chat (its open shadow root
// included): the toolbar icon says AI on the chat, the panel offers help,
// the chat is read (who said what), a reply is written with a shared reason,
// and Insert fills the chat's message box.
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test, type Harness } from "./harness";

const isX = /dist-x/.test(process.env.EXT_DIST ?? "dist");
test.skip(!isX, "the X extension: run with EXT_DIST=dist-x");

// UI_SCREENS=1 also saves screenshots (UI_OUT for the folder, UI_SCHEME=dark).
async function shot(page: Page, name: string) {
  if (!process.env.UI_SCREENS) return;
  const dir = path.join(process.env.UI_OUT ?? "ui-screens-x", process.env.UI_SCHEME === "dark" ? "400-dark" : "400");
  fs.mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
}

const REPLY = "Nice, usage-based is where we're heading too. Happy to share what we tried.";

async function signedIn(harness: Harness) {
  harness.apiResponses.set("/api/ext/message-profiles", {
    status: 200,
    body: { profiles: [{ id: "mp1", name: "Potential client", goal: "Understand their needs", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true }] },
  });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: { email: "a@b.co", defaultMessageProfileId: "mp1", extension: null } });
  harness.apiResponses.set("/api/ext/contacts", { status: 200, body: { contact: null, contacts: [] } });
  harness.apiResponses.set("/api/ext/x/profiles", { status: 200, body: { profiles: [], defaultProfileId: null } });
  harness.apiResponses.set("/api/ext/x/settings", { status: 200, body: { defaultProfileId: null, maxReplyLength: 280, insertButtonHidden: false } });
  harness.apiResponses.set("/api/ext/x/message", { status: 200, body: { message: REPLY, freeRemaining: null, historyId: "h1" } });
  await harness.worker.evaluate(() => chrome.storage.local.set({ extensionToken: "cl_cmt_x", settingsUploadedToAccount: true }));
}

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

test("an X chat: badge, hint, read, write with a shared reason, insert", async ({ harness }) => {
  await signedIn(harness);
  const page = await harness.openX("/i/chat/1234-5678", "x-dm-chat.html");

  await expect
    .poll(() =>
      harness.worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ url: "https://x.com/*" });
        return chrome.action.getBadgeText({ tabId: tab.id! });
      }),
    )
    .toBe("AI");

  const panel = await openPanel(harness);
  if (process.env.UI_SCHEME === "dark") await panel.emulateMedia({ colorScheme: "dark" });
  await expect(panel.getByRole("button", { name: "Write a reply with AI" })).toBeVisible();
  await shot(panel, "x-03-chat-hint");
  await panel.getByRole("button", { name: "Write a reply with AI" }).click();

  // Read: the person and who said what.
  await expect(panel.getByText("Sam Lee", { exact: true })).toBeVisible();
  await expect(panel.getByText("@sam_lee")).toBeVisible();
  await expect(panel.getByText("2 messages read")).toBeVisible();

  const generate = panel.getByRole("button", { name: "Generate reply" });
  await expect(generate).toBeEnabled();
  let sent: Record<string, unknown> | null = null;
  await harness.context.route("**/api/ext/x/message", async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: REPLY, freeRemaining: null, historyId: "h1" }) });
  });
  await generate.click();
  await expect(panel.getByRole("textbox", { name: "Your message" })).toHaveValue(REPLY);
  expect(sent).toMatchObject({
    contact: { name: "Sam Lee", handle: "sam_lee" },
    threadPath: "/i/chat/1234-5678",
    thread: [
      { sender: "me", text: "Would love to compare notes on pricing for seat-based plans." },
      { sender: "them", text: "Sure! We moved to usage-based last quarter. What are you working on?" },
    ],
    profileId: "mp1",
  });

  await shot(panel, "x-04-chat-reply");
  await panel.getByRole("button", { name: "Insert" }).click();
  await expect(page.locator('textarea[data-testid="dm-composer-textarea"]')).toHaveValue(REPLY);
});
