// Generate in real Chromium: the panel asks for a stream, reads the
// server-sent events with the real fetch/ReadableStream of an extension page,
// and ends on the final comment with Copy enabled. The same flow against a
// server from before streaming (plain JSON) must still work.
//
// Playwright can only fulfill a request with its whole body at once, so the
// events arrive together here; the draft growing word by word is covered by
// tests/unit/generateStreaming.test.tsx with a stream the test feeds.
import { expect } from "@playwright/test";
import { test, type Harness } from "./harness";

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
const FINAL = "Moving from 14 steps to 5 is the real story. Order beats count.";

const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

async function openPanelWithPost(harness: Harness) {
  harness.apiResponses.set("/api/ext/profiles", { status: 200, body: { profiles: [PROFILE] } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: ME });
  harness.apiResponses.set("/api/ext/settings", { status: 200, body: {} });
  harness.apiResponses.set("/api/ext/contacts", { status: 200, body: { contacts: [] } });
  await harness.worker.evaluate(() => chrome.storage.local.set({ extensionToken: "cl_cmt_e2e", onboardingComplete: true }));

  const page = await harness.open("/feed/", "feed.html");
  const panel = await harness.context.newPage();
  // The panel is a page here; the LinkedIn tab stands in as the active tab
  // (off LinkedIn, Home points back there instead of offering Generate).
  await panel.addInitScript(() => {
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
      info.active ? query({ url: "https://www.linkedin.com/*" }) : query(info)) as typeof chrome.tabs.query;
  });
  const perf: string[] = [];
  panel.on("console", (msg) => {
    if (msg.text().startsWith("[perf]")) perf.push(msg.text());
  });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  await page.locator("[data-fixture='post-1'] button[aria-label^='Comment']").click();
  const generate = panel.getByRole("button", { name: "Generate", exact: true });
  await expect(generate).toBeEnabled();
  return { panel, generate, perf };
}

test("Generate streams: asks for server-sent events and ends on the final comment", async ({ harness }) => {
  let accept = "";
  // Registered after the harness's catch-all, so Playwright tries it first.
  await harness.context.route("**/api/ext/generate", (route) => {
    accept = route.request().headers()["accept"] ?? "";
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body:
        frame("start", { beforeModel: 25 }) +
        frame("text", { text: "Moving from 14" }) +
        frame("text", { text: "Moving from 14 steps to 5 is the real" }) +
        frame("final", {
          comment: FINAL,
          freeRemaining: null,
          historyId: "h1",
          timing: { beforeModel: 25, ttft: 420, firstText: 425, attempts: 1, model: "gpt-6-luna" },
        }),
    });
  });

  const { panel, generate, perf } = await openPanelWithPost(harness);
  await generate.click();

  const box = panel.getByRole("textbox", { name: "Your comment" });
  await expect(box).toHaveValue(FINAL);
  await expect(panel.getByRole("button", { name: "Copy" })).toBeEnabled();
  expect(accept).toContain("text/event-stream");

  await expect.poll(() => perf.length).toBe(1);
  expect(perf[0]).toMatch(/FIRST VISIBLE TEXT \d+ ms \| TOTAL \d+ ms/);
  console.log(`[e2e] ${perf[0]}`);
});

test("a Generate that never answers can be stopped, and a new post stops it too", async ({ harness }) => {
  // The server takes the request and then says nothing, as a stalled
  // connection does.
  let requests = 0;
  await harness.context.route("**/api/ext/generate", () => {
    requests += 1;
  });

  const { panel, generate } = await openPanelWithPost(harness);
  await generate.click();
  await expect(panel.getByRole("status", { name: "Generating comment" })).toBeVisible();
  await panel.getByRole("button", { name: "Stop" }).click();
  await expect(panel.getByRole("status", { name: "Generating comment" })).toHaveCount(0);
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(generate).toBeEnabled();

  // Generating again, then picking another post, ends that one as well.
  await generate.click();
  await expect(panel.getByRole("button", { name: "Stop" })).toBeVisible();
  const page = harness.context.pages().find((p) => p.url().includes("/feed/"))!;
  await page.locator("[data-fixture='post-2'] button[aria-label='Comment']").click();
  await expect(panel.getByRole("button", { name: "Stop" })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
  expect(requests).toBe(2);
});

test("Generate still works against a server from before streaming (plain JSON)", async ({ harness }) => {
  harness.apiResponses.set("/api/ext/generate", {
    status: 200,
    body: { comment: FINAL, freeRemaining: null, historyId: "h1" },
  });

  const { panel, generate } = await openPanelWithPost(harness);
  await generate.click();

  await expect(panel.getByRole("textbox", { name: "Your comment" })).toHaveValue(FINAL);
  await expect(panel.getByRole("button", { name: "Copy" })).toBeEnabled();
});
