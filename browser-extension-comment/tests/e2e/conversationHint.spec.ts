// Real Chromium, real built extension: the toolbar icon's "AI" badge follows a
// LinkedIn tab into and out of a conversation (including LinkedIn's own
// no-reload navigation), and the panel's hint takes the person to Messages
// with the conversation read by the real content script.
import type { Page } from "@playwright/test";
import { expect, test, type Harness } from "./harness";

async function badgeOf(harness: Harness, url: string): Promise<{ text: string; title: string }> {
  return harness.worker.evaluate(async (pattern) => {
    const [tab] = await chrome.tabs.query({ url: pattern });
    return {
      text: await chrome.action.getBadgeText({ tabId: tab.id! }),
      title: await chrome.action.getTitle({ tabId: tab.id! }),
    };
  }, url);
}

async function signedIn(harness: Harness) {
  harness.apiResponses.set("/api/ext/me", {
    status: 200,
    body: { email: "a@b.co", commentsToday: 0, defaultCommentProfileId: null, defaultMessageProfileId: null, extension: null },
  });
  harness.apiResponses.set("/api/ext/profiles", { status: 200, body: { profiles: [] } });
  harness.apiResponses.set("/api/ext/message-profiles", {
    status: 200,
    body: { profiles: [{ id: "mp1", name: "Potential client", goal: "Understand their needs", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true }] },
  });
  harness.apiResponses.set("/api/ext/contacts", { status: 200, body: { contact: null, contacts: [] } });
  harness.apiResponses.set("/api/ext/settings", { status: 200, body: { defaultCommentProfileId: null, defaultLanguage: null } });
  await harness.worker.evaluate(() =>
    chrome.storage.local.set({ extensionToken: "cl_cmt_e2e", onboardingComplete: true, settingsUploadedToAccount: true }),
  );
}

// Opened as a tab, the panel would itself be the active tab; in real use the
// LinkedIn tab beside it is. Point its active-tab lookup at LinkedIn.
async function openPanel(harness: Harness): Promise<Page> {
  const panel = await harness.context.newPage();
  await panel.addInitScript(() => {
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
      info.active ? query({ url: "https://www.linkedin.com/*" }) : query(info)) as typeof chrome.tabs.query;
  });
  await panel.setViewportSize({ width: 400, height: 720 });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  return panel;
}

test("the toolbar icon says AI on a conversation, and stops when the tab leaves it", async ({ harness }) => {
  const page = await harness.open("/messaging/thread/2-bharti/", "messaging-thread.html");
  await expect.poll(async () => (await badgeOf(harness, "https://www.linkedin.com/*")).text).toBe("AI");
  expect((await badgeOf(harness, "https://www.linkedin.com/*")).title).toBe("Get AI help replying to this conversation");

  // LinkedIn's own navigation: the address changes, no page load.
  await page.evaluate(() => history.pushState(null, "", "/feed/"));
  await expect.poll(async () => (await badgeOf(harness, "https://www.linkedin.com/*")).text).toBe("");
  expect((await badgeOf(harness, "https://www.linkedin.com/*")).title).toBe("CarouseLabs Engage");

  await page.evaluate(() => history.pushState(null, "", "/messaging/thread/2-emma/"));
  await expect.poll(async () => (await badgeOf(harness, "https://www.linkedin.com/*")).text).toBe("AI");
});

test("the panel's hint opens Messages with the conversation read", async ({ harness }) => {
  await signedIn(harness);
  const page = await harness.open("/messaging/thread/2-bharti/", "messaging-thread.html");
  const panel = await openPanel(harness);

  const write = panel.getByRole("button", { name: "Write a reply with AI" });
  await expect(write).toBeVisible();
  await expect(panel.getByTestId("attention-dot-messages")).toBeVisible();
  await write.click();

  await expect(panel.getByText("Bharti Agrawal")).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Generate (reply|opener)$/ })).toBeEnabled();
  await expect(panel.getByTestId("attention-dot-messages")).toHaveCount(0);

  // Switching to another conversation on LinkedIn is noticed.
  await page.evaluate(() => history.pushState(null, "", "/messaging/thread/2-emma/"));
  await expect(panel.getByText("You opened a different conversation.")).toBeVisible();
  await panel.getByRole("button", { name: "Read this one" }).click();
  await expect(panel.getByText("You opened a different conversation.")).toHaveCount(0);
});
