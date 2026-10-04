// Screenshots of every side-panel screen and state, for design review and
// before/after comparison. Skipped in normal runs; take them with
//   UI_SCREENS=1 npx playwright test tests/e2e/uiScreens.spec.ts
// Output: ui-screens/<width>/<name>.png (UI_SCHEME=dark for the dark theme,
// into <width>-dark/; UI_OUT for another folder). Not under test-results/,
// which Playwright empties at the start of every run. The data is deliberately
// awkward (long names, long posts, long comments) because that is where
// layouts break.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";
import { test, type Harness } from "./harness";

test.skip(!process.env.UI_SCREENS, "set UI_SCREENS=1 to take the screenshots");

const OUT = process.env.UI_OUT
  ? path.resolve(process.env.UI_OUT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui-screens");
const WIDTHS = (process.env.UI_WIDTHS ?? "400,320").split(",").map(Number);
const SCHEME = process.env.UI_SCHEME === "dark" ? "dark" : "light";

const stamp = "2026-09-01T00:00:00.000Z";
const profile = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id, userId: null, name, whoIAm: "An experienced professional", goal: "adds one useful insight", tone: "professional",
  length: "Medium (2-3 lines)", emoji: "None", language: "English", alwaysDo: null, neverDo: null, samples: [],
  isDefault: false, isSystem: true, isRecommended: false, testsUsed: 0, createdAt: stamp, updatedAt: stamp, ...over,
});
const PROFILES = [
  profile("r1", "CarouseLabs — Top Relevance Format", { isRecommended: true, length: "100-220 characters" }),
  profile("r2", "CarouseLabs — Balanced Conversational", { isRecommended: true }),
  profile("p1", "Thoughtful Expert", { isDefault: true }),
  profile("p2", "Supportive Peer"),
  profile("p3", "Respectful Challenger"),
  profile("c1", "My founder voice for B2B SaaS posts about hiring", { isSystem: false, userId: "u1" }),
];
const me = (extension: Record<string, unknown> = {}) => ({
  email: "anant.goyal.very.long.address@carouselabs-example.com", plan: "FREE", commentsThisMonth: 42, commentsToday: 3,
  defaultCommentProfileId: "p1", defaultLanguage: null, insertWarningHidden: false,
  extension: { access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: "2026-10-28T00:00:00.000Z", endsAt: null, manageUrl: "https://example.com/portal", ...extension },
});
const POST = {
  mode: "comment", capturedAt: Date.now(),
  authorName: "Priya Raman-Venkataraghavan, PhD",
  authorHeadline: "Head of Growth at a B2B SaaS company | Ex-Stripe | Writing about activation, onboarding and pricing",
  text: "We cut our onboarding from 14 steps to 5 last quarter. Activation went from 31% to 48%. The biggest win wasn't removing steps. It was moving the \"invite your team\" prompt to AFTER the first real result. People invite teammates when they have something to show, not before. If your activation is stuck, look at the order of your steps before you look at the number of them. #growth #onboarding #saas",
  type: "text", url: "https://www.linkedin.com/feed/update/urn:li:activity:1",
};
const COMMENT =
  "Moving the “invite your team” prompt until after the first real result is the key detail here. It ties the ask to a moment of demonstrated value, which makes collaboration feel like a natural next step rather than another onboarding chore.";
const HISTORY = {
  nextCursor: null,
  entries: [
    { id: "h1", kind: "comment", postAuthor: "Priya Raman-Venkataraghavan, PhD", postUrl: POST.url, postSnippet: POST.text, comment: COMMENT, action: "COPIED", createdAt: new Date().toISOString(), profileName: "Thoughtful Expert" },
    { id: "h2", kind: "reply", postAuthor: "Daniel Okafor", postUrl: POST.url, postSnippet: "Reply to Sam Lee: Changing one question in 1:1s is underrated.", comment: "Agreed, and it only works if the manager actually acts on what comes up.", action: "INSERTED", createdAt: new Date(Date.now() - 36e5).toISOString(), profileName: "Supportive Peer" },
    { id: "h3", kind: "connection_note", postAuthor: "Maya Lindqvist", postUrl: "https://www.linkedin.com/in/maya", postSnippet: "Talent Partner | Hiring for early-stage startups", comment: "Hi Maya, your post on specific decisions beating polished CVs matched what I see in hiring. Would love to connect.", action: "NONE", createdAt: new Date(Date.now() - 864e5).toISOString(), profileName: "Warm intro" },
  ],
};

const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

async function setup(
  harness: Harness,
  opts: { token?: boolean; onboarded?: boolean; post?: unknown; me?: unknown; settings?: Record<string, unknown> } = {},
) {
  harness.apiResponses.set("/api/ext/profiles", { status: 200, body: { profiles: PROFILES } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: opts.me ?? me() });
  harness.apiResponses.set("/api/ext/settings", {
    status: 200,
    body: { defaultCommentProfileId: "p1", defaultLanguage: "English", insertWarningHidden: false, ...opts.settings },
  });
  harness.apiResponses.set("/api/ext/contacts", { status: 200, body: { contacts: [] } });
  harness.apiResponses.set("/api/ext/history", { status: 200, body: HISTORY });
  harness.apiResponses.set("/api/ext/connection-profiles", { status: 200, body: { profiles: [
    { id: "cp1", name: "Warm intro", angle: "shared interest", goal: "Get the invite accepted", tone: "friendly", length: "90-180 characters", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true },
  ] } });
  harness.apiResponses.set("/api/ext/message-profiles", { status: 200, body: { profiles: [
    { id: "mp1", name: "Potential client", goal: "Understand their situation before proposing anything", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true },
    { id: "mp2", name: "Warm follow-up", goal: "Pick the conversation back up", tone: "Warm", alwaysDo: null, neverDo: null, samples: [], isDefault: false, isSystem: true, isRecommended: false },
  ] } });
  const store: Record<string, unknown> = {};
  if (opts.token !== false) store.extensionToken = "cl_cmt_screens";
  if (opts.onboarded !== false) store.onboardingComplete = true;
  if (opts.post) store.lastSelectedPost = opts.post;
  await harness.worker.evaluate((s) => chrome.storage.local.set(s), store);
}

async function openPanel(harness: Harness, width: number, opts: { linkedInTabActive?: boolean } = {}): Promise<Page> {
  const panel = await harness.context.newPage();
  // Opened as a tab here, the panel would itself be the "active tab"; in real
  // use that is the LinkedIn tab beside it. Point the panel's active-tab
  // lookup at the open LinkedIn fixture instead.
  if (opts.linkedInTabActive) {
    await panel.addInitScript(() => {
      const query = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
        info.active ? query({ url: "https://www.linkedin.com/*" }) : query(info)) as typeof chrome.tabs.query;
    });
  }
  await panel.setViewportSize({ width, height: 720 });
  await panel.emulateMedia({ reducedMotion: "reduce", colorScheme: SCHEME });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  return panel;
}

// Two images per state: what fits in a typical 720px-tall panel ("above the
// fold"), and the whole screen. The panel scrolls inside its own container,
// so a full-page screenshot alone would only ever show the first 720px.
async function shot(page: Page, width: number, name: string) {
  const dir = path.join(OUT, SCHEME === "dark" ? `${width}-dark` : String(width));
  fs.mkdirSync(dir, { recursive: true });
  const { height } = page.viewportSize() ?? { height: 720 };
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
  await page.setViewportSize({ width, height: 1700 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(dir, `${name}-full.png`) });
  await page.setViewportSize({ width, height });
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test("sign in, onboarding, home", async ({ harness }) => {
      await setup(harness, { token: false });
      let panel = await openPanel(harness, width);
      await expect(panel.getByText("Sign in to CarouseLabs")).toBeVisible();
      await shot(panel, width, "01-sign-in");
      await panel.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(panel.getByText("Waiting for sign-in")).toBeVisible();
      await panel.bringToFront();
      await shot(panel, width, "01b-sign-in-waiting");
      await panel.close();

      await setup(harness, { onboarded: false });
      await harness.worker.evaluate(() => chrome.storage.local.remove("onboardingComplete"));
      panel = await openPanel(harness, width);
      await shot(panel, width, "02-onboarding");
      for (let i = 0; i < 3; i++) await panel.getByRole("button", { name: "Next", exact: true }).click();
      await expect(panel.getByText("How do you want to start?")).toBeVisible();
      await shot(panel, width, "02b-onboarding-choice");
      await panel.close();

      await setup(harness);
      await harness.worker.evaluate(() => chrome.storage.local.remove("lastSelectedPost"));
      panel = await openPanel(harness, width);
      await expect(panel.getByRole("button", { name: "Generate", exact: true })).toBeVisible();
      await shot(panel, width, "03-home-no-post");
    });

    test("generate: post, generating, result, insert warning", async ({ harness }) => {
      await setup(harness, { post: POST });
      let release: () => void = () => {};
      const held = new Promise<void>((r) => (release = r));
      await harness.context.route("**/api/ext/generate", async (route) => {
        await held;
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: frame("start", {}) + frame("text", { text: COMMENT.slice(0, 60) }) + frame("final", { comment: COMMENT, freeRemaining: null, historyId: "h1", timing: {} }),
        });
      });
      const panel = await openPanel(harness, width);
      const generate = panel.getByRole("button", { name: "Generate", exact: true });
      await expect(generate).toBeEnabled();
      await shot(panel, width, "04-home-post");
      await generate.click();
      await expect(panel.getByLabel("Generating comment")).toBeVisible();
      await shot(panel, width, "05-home-generating");
      release();
      await expect(panel.getByRole("textbox", { name: "Your comment" })).toHaveValue(COMMENT);
      await shot(panel, width, "06-home-result");
      const insert = panel.getByRole("button", { name: "Insert", exact: true });
      if (await insert.isVisible()) {
        await insert.click();
        await shot(panel, width, "07-insert-warning");
      }
    });

    test("generate: error and paywall", async ({ harness }) => {
      await setup(harness, { post: POST });
      harness.apiResponses.set("/api/ext/generate", { status: 502, body: { error: "Something went wrong, try again" } });
      let panel = await openPanel(harness, width);
      await panel.getByRole("button", { name: "Generate", exact: true }).click();
      await expect(panel.getByText("Something went wrong, try again")).toBeVisible();
      await shot(panel, width, "08-home-error");
      await panel.close();

      await setup(harness, { post: POST, me: me({ access: "free", freeUsed: 10, status: null }) });
      panel = await openPanel(harness, width);
      await shot(panel, width, "09-home-paywall");
    });

    test("reply and connection-note modes", async ({ harness }) => {
      await setup(harness, {
        post: {
          ...POST, mode: "reply",
          reply: {
            targetAuthor: "Sam Lee", targetText: "Changing one question in 1:1s is so underrated. We did the same and it changed everything about how early problems surface.",
            isOwnPost: false,
            thread: [
              { author: "Sam Lee", text: "Changing one question in 1:1s is so underrated.", depth: 0, isTarget: true, isSelf: false, isPostAuthor: false },
            ],
          },
        },
      });
      let panel = await openPanel(harness, width);
      await shot(panel, width, "10-home-reply");
      await panel.close();

      await setup(harness, {
        post: {
          ...POST, mode: "connect",
          connect: { target: { name: "Maya Lindqvist-Johansson", headline: "Talent Partner | Hiring for early-stage startups across Europe and the US", currentRole: "Talent Partner at Northwind Ventures", about: "", url: "https://www.linkedin.com/in/maya", capturedAt: Date.now() } },
        },
      });
      panel = await openPanel(harness, width);
      await shot(panel, width, "11-home-connect");
      await panel.close();
    });

    test("connection note: ready and written", async ({ harness }) => {
      await setup(harness, {
        settings: { connectNoteContext: { choice: "none", purpose: "" } },
        post: {
          ...POST, mode: "connect",
          connect: { target: { name: "Maya Lindqvist-Johansson", headline: "Talent Partner | Hiring for early-stage startups across Europe and the US", currentRole: "Talent Partner at Northwind Ventures", about: "", url: "https://www.linkedin.com/in/maya", capturedAt: Date.now() } },
        },
      });
      harness.apiResponses.set("/api/ext/connection-note", {
        status: 200,
        body: { note: "Hi Maya, your point that specific decisions beat polished CVs matches what I see hiring engineers. Would be good to connect.", freeRemaining: null, historyId: "h9" },
      });
      const panel = await openPanel(harness, width);
      const generate = panel.getByRole("button", { name: "Generate note" });
      await expect(generate).toBeEnabled();
      await shot(panel, width, "11b-connect-ready");
      await generate.click();
      await expect(panel.getByRole("textbox", { name: "Your note" })).not.toHaveValue("");
      await shot(panel, width, "11c-connect-result");
    });

    test("messages: conversation read, reply written", async ({ harness }) => {
      await setup(harness);
      harness.apiResponses.set("/api/ext/message", {
        status: 200,
        body: { message: "Mostly pricing for seat-based B2B plans. Would a 20-minute call next week work? Happy to share what we tried.", freeRemaining: null, historyId: "h8" },
      });
      await harness.open("/messaging/thread/2-bharti/", "messaging-thread.html");
      const panel = await openPanel(harness, width, { linkedInTabActive: true });
      await panel.getByRole("button", { name: "Messages", exact: true }).click();
      await panel.getByRole("button", { name: "Read this conversation" }).click();
      const generate = panel.getByRole("button", { name: /^Generate (reply|opener)$/ });
      await expect(generate).toBeEnabled();
      await shot(panel, width, "12b-messages-read");
      await generate.click();
      await expect(panel.getByRole("textbox", { name: "Your message" })).not.toHaveValue("");
      await shot(panel, width, "12c-messages-result");
    });

    test("profiles: delete check, builder, notes", async ({ harness }) => {
      await setup(harness);
      const panel = await openPanel(harness, width);
      await panel.getByRole("button", { name: "Profiles", exact: true }).click();
      const yours = panel.getByRole("region", { name: "Your profiles" });
      await yours.getByRole("button", { name: "Delete" }).click();
      await expect(panel.getByText("Delete this profile?")).toBeVisible();
      await shot(panel, width, "13b-profiles-delete-check");
      await panel.getByRole("button", { name: "Keep it" }).click();

      await panel.getByRole("button", { name: "New profile" }).click();
      await expect(panel.getByRole("heading", { name: "New comment profile" })).toBeVisible();
      await shot(panel, width, "13c-profile-builder");
      await panel.getByRole("button", { name: "Cancel" }).click();

      await panel.getByRole("radio", { name: "Notes" }).click();
      await expect(panel.getByText("Connection note profiles")).toBeVisible();
      await shot(panel, width, "13d-profiles-notes");
    });

    test("other screens", async ({ harness }) => {
      await setup(harness);
      const panel = await openPanel(harness, width);
      for (const [label, name] of [
        ["Messages", "12-messages"],
        ["Profiles", "13-profiles"],
        ["History", "14-history"],
        ["Settings", "15-settings"],
        ["Account", "16-account"],
      ] as const) {
        await panel.getByRole("button", { name: label, exact: true }).click();
        await shot(panel, width, name);
      }
      await panel.goto(`chrome-extension://${harness.extensionId}/welcome.html`);
      await panel.setViewportSize({ width: 1100, height: 800 });
      await shot(panel, width, "17-welcome");
    });
  });
}
