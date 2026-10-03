// The X extension's panel in real Chromium (EXT_DIST=dist-x or dist-x-store):
// a captured post, a streamed reply in an X profile, X's counter, Copy.
// UI_SCREENS=1 also saves screenshots (UI_OUT for the folder, UI_SCHEME=dark).
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { test, type Harness } from "./harness";

const isX = /dist-x/.test(process.env.EXT_DIST ?? "dist");
test.skip(!isX, "the X extension's panel: run with EXT_DIST=dist-x");

const SCHEME = process.env.UI_SCHEME === "dark" ? "dark" : "light";
const OUT = process.env.UI_OUT ?? "ui-screens-x";
const POST_URL = "https://x.com/priya/status/1840000000000000001";
const REPLY = "Moving the invite step after the first real win is the part most teams miss. 14 to 5 only works because of that order.";
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

async function shot(page: Page, name: string) {
  if (!process.env.UI_SCREENS) return;
  const dir = path.join(OUT, SCHEME === "dark" ? "400-dark" : "400");
  fs.mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
}

async function setup(harness: Harness) {
  harness.apiResponses.set("/api/ext/x/profiles", {
    status: 200,
    body: {
      defaultProfileId: null,
      profiles: [
        { id: "sys-x-thoughtful-reply", name: "CarouseLabs — X Thoughtful Reply", tone: "Conversational", length: "80-220 characters", isDefault: true, isSystem: true, isRecommended: true },
        { id: "sys-x-quick-reply", name: "CarouseLabs — X Quick Reply", tone: "Casual", length: "20-100 characters", isDefault: false, isSystem: true, isRecommended: true },
      ],
    },
  });
  harness.apiResponses.set("/api/ext/x/settings", { status: 200, body: { defaultProfileId: null, maxReplyLength: 280, insertButtonHidden: false } });
  harness.apiResponses.set("/api/ext/me", {
    status: 200,
    body: { email: "a@b.co", extension: { access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null } },
  });
  await harness.context.route("**/api/ext/x/reply", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: frame("start", {}) + frame("text", { text: REPLY.slice(0, 40) }) + frame("final", { comment: REPLY, freeRemaining: null, historyId: "h1", length: REPLY.length, maxLength: 280 }),
    }),
  );
  await harness.worker.evaluate(
    ([url]) =>
      chrome.storage.local.set({
        extensionToken: "cl_cmt_x",
        lastXReplyTarget: {
          capturedAt: Date.now(),
          post: { author: "Priya Raman", handle: "priya", text: "We cut onboarding from 14 steps to 5. Activation went from 31% to 48%. The biggest win wasn't removing steps, it was moving the invite prompt after the first real result.", url, media: ["image"] },
          thread: [],
          quoted: null,
          isOwnPost: false,
        },
      }),
    [POST_URL],
  );
}

test("writes a reply to a captured X post", async ({ harness }) => {
  await setup(harness);
  const panel = await harness.context.newPage();
  await panel.setViewportSize({ width: 400, height: 720 });
  await panel.emulateMedia({ reducedMotion: "reduce", colorScheme: SCHEME });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/x/sidepanel/index.html`);

  await expect(panel.getByRole("heading", { name: "CarouseLabs Engage for X" })).toBeVisible();
  await expect(panel.getByText("@priya")).toBeVisible();
  await expect(panel.getByRole("combobox", { name: "X profile" })).toContainText("X Thoughtful Reply");
  await shot(panel, "x-01-post");

  await panel.getByRole("button", { name: "Write reply" }).click();
  await expect(panel.getByRole("textbox", { name: "Your reply" })).toHaveValue(REPLY);
  await expect(panel.getByText(`${REPLY.length}/280`)).toBeVisible();
  await expect(panel.getByRole("button", { name: "Copy" })).toBeEnabled();
  await shot(panel, "x-02-reply");
});

test("Shorter, then the X Profiles, Settings and History screens", async ({ harness }) => {
  await setup(harness);
  const SHORT = "Moving the invite after the first real win is what made 14 to 5 work.";
  let settings = { defaultProfileId: null as string | null, maxReplyLength: 280, insertButtonHidden: false };
  const patches: unknown[] = [];
  // Registered after the harness's catch-all, so these win.
  await harness.context.route("**/api/ext/x/rewrite", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ comment: SHORT, freeRemaining: null }) }),
  );
  await harness.context.route("**/api/ext/x/settings", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = JSON.parse(route.request().postData() ?? "{}");
      patches.push(body);
      settings = { ...settings, ...body };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(settings) });
  });
  harness.apiResponses.set("/api/ext/history", {
    status: 200,
    body: {
      nextCursor: null,
      entries: [
        { id: "h1", kind: "x_reply", postAuthor: "Priya Raman", postUrl: POST_URL, postSnippet: "We cut onboarding", comment: SHORT, action: "INSERTED", createdAt: new Date().toISOString(), profileName: "CarouseLabs — X Thoughtful Reply" },
        { id: "h2", kind: "x_message", postAuthor: "Sam Lee", postUrl: "https://x.com/i/chat/1-2", postSnippet: "", comment: "Happy to share the checklist, want it here?", action: "COPIED", createdAt: new Date(Date.now() - 864e5).toISOString(), profileName: "Just continue" },
      ],
    },
  });
  harness.apiResponses.set("/api/ext/message-profiles", { status: 200, body: { profiles: [] } });

  const panel = await harness.context.newPage();
  await panel.setViewportSize({ width: 400, height: 720 });
  await panel.emulateMedia({ reducedMotion: "reduce", colorScheme: SCHEME });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/x/sidepanel/index.html`);

  await panel.getByRole("button", { name: "Write reply" }).click();
  await expect(panel.getByRole("textbox", { name: "Your reply" })).toHaveValue(REPLY);
  await panel.getByRole("button", { name: "Shorter" }).click();
  await expect(panel.getByRole("textbox", { name: "Your reply" })).toHaveValue(SHORT);
  await expect(panel.getByText(`${SHORT.length}/280`)).toBeVisible();
  await shot(panel, "x-05-shorter");

  await panel.getByRole("button", { name: "Profiles" }).click();
  await expect(panel.getByText("X reply profiles")).toBeVisible();
  await expect(panel.getByText("CarouseLabs — X Quick Reply")).toBeVisible();
  await shot(panel, "x-06-profiles");
  await panel.getByRole("button", { name: "New profile" }).click();
  await expect(panel.getByRole("heading", { name: "New X profile" })).toBeVisible();
  await expect(panel.getByLabel("Max characters", { exact: true })).toHaveAttribute("max", "280");
  await shot(panel, "x-07-builder");

  await panel.getByRole("button", { name: "Settings" }).click();
  const premium = panel.getByRole("switch", { name: "I have X Premium" });
  await expect(premium).toHaveAttribute("aria-checked", "false");
  await premium.click();
  await expect(premium).toHaveAttribute("aria-checked", "true");
  expect(patches).toEqual([{ maxReplyLength: 1000 }]);
  await shot(panel, "x-08-settings");

  await panel.getByRole("button", { name: "History" }).click();
  await expect(panel.getByText(SHORT)).toBeVisible();
  await expect(panel.getByRole("button", { name: "Open chat" })).toBeVisible();
  await shot(panel, "x-09-history");
});
