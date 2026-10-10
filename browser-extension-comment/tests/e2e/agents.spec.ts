// AI agents in real Chromium, on the built extension: the Messages screen
// reads a saved LinkedIn conversation with the real content script, starts it
// with the default agent, and asks the server for a reply written by that
// agent; the Agents tab and its builder fit the narrowest panel (320px).
import { expect, type Page } from "@playwright/test";
import { test, type Harness } from "./harness";

const isX = /dist-x/.test(process.env.EXT_DIST ?? "dist");
test.skip(isX, "the LinkedIn extension's screens (EXT_DIST=dist or dist-store)");

const config = {
  business: "I run a SaaS company that helps people create LinkedIn content",
  offer: "",
  audience: "Founders",
  goals: "Build real relationships with founders; mention the product only when it fits",
  nextStep: "",
  strategy: "",
  tone: "Warm",
  length: "auto",
  language: "Match the conversation",
  facts: ["Pro is $29 a month"],
  objections: [],
  alwaysDo: "",
  neverDo: "",
  examples: [],
};
const AGENTS = [
  { id: "ag1", name: "Founder outreach", description: "Builds relationships with SaaS founders, never pushy", purpose: "sales", status: "active", isDefault: true, version: 1, config, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
  { id: "ag2", name: "Recruiter with a rather long agent name for layout testing", description: "", purpose: "recruiting", status: "active", isDefault: false, version: 1, config, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
];

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
  harness.apiResponses.set("/api/ext/agents", { status: 200, body: { agents: AGENTS } });
  harness.apiResponses.set("/api/ext/contacts", { status: 200, body: { contact: null, contacts: [] } });
  harness.apiResponses.set("/api/ext/settings", { status: 200, body: { defaultCommentProfileId: null, defaultLanguage: null } });
  await harness.worker.evaluate(() =>
    chrome.storage.local.set({ extensionToken: "cl_cmt_e2e", onboardingComplete: true, settingsUploadedToAccount: true }),
  );
}

async function openPanel(harness: Harness, width: number): Promise<Page> {
  const panel = await harness.context.newPage();
  await panel.addInitScript(() => {
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
      info.active ? query({ url: "https://www.linkedin.com/*" }) : query(info)) as typeof chrome.tabs.query;
  });
  await panel.setViewportSize({ width, height: 720 });
  await panel.emulateMedia({ reducedMotion: "reduce" });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  return panel;
}

const scrollsSideways = (panel: Page) =>
  panel.evaluate(() => {
    const main = document.querySelector("main")!;
    return document.documentElement.scrollWidth > window.innerWidth || main.scrollWidth > main.clientWidth;
  });

test("an agent writes the reply to a real LinkedIn conversation", async ({ harness }) => {
  await signedIn(harness);
  let asked: Record<string, unknown> | null = null;
  await harness.context.route("**/api/ext/message", async (route) => {
    asked = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Love that you're testing pricing. What made you pick seat-based?", freeRemaining: null, historyId: "h1" }),
    });
  });
  await harness.open("/messaging/thread/2-bharti/", "messaging-thread.html");
  const panel = await openPanel(harness, 400);
  await panel.getByRole("button", { name: "Messages", exact: true }).click();
  await panel.getByRole("button", { name: "Read this conversation" }).click();

  await expect(panel.getByRole("combobox", { name: /Agent/ })).toContainText("Founder outreach");
  await expect(panel.getByRole("radiogroup", { name: "Reason for this conversation" })).toBeHidden();
  await panel.getByRole("button", { name: "Generate reply" }).click();
  await expect(panel.getByRole("textbox", { name: "Your message" })).toHaveValue(/seat-based/);
  expect(asked).toMatchObject({ agentId: "ag1", contact: { name: "Bharti Agrawal" } });
  expect(asked!.profileId).toBeUndefined();
});

test("an agent's tools on a real conversation: what the reply does, Shorter, Alternatives, at 320px", async ({ harness }) => {
  await signedIn(harness);
  const asked: Record<string, unknown>[] = [];
  await harness.context.route("**/api/ext/message", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    asked.push(body);
    const answer = body.alternatives
      ? { message: "First option.", alternatives: ["First option.", "Second option.", "Third option."], freeRemaining: null, historyId: "h1" }
      : { message: body.adjust ? "A shorter one." : "Pro is $29 a month. What takes the most time?", freeRemaining: null, historyId: "h1" };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(answer) });
  });
  await harness.open("/messaging/thread/2-bharti/", "messaging-thread.html");
  const panel = await openPanel(harness, 320);
  await panel.getByRole("button", { name: "Messages", exact: true }).click();
  await panel.getByRole("button", { name: "Read this conversation" }).click();

  await panel.getByRole("combobox", { name: "What should this reply do?" }).click();
  await panel.getByRole("option", { name: "Answer their question" }).click();
  await panel.getByRole("button", { name: "Generate reply" }).click();
  const box = panel.getByRole("textbox", { name: "Your message" });
  await expect(box).toHaveValue(/\$29/);
  expect(asked[0]).toMatchObject({ agentId: "ag1", action: "answer" });

  await panel.getByRole("button", { name: "Shorter" }).click();
  await expect(box).toHaveValue("A shorter one.");
  expect(asked[1]).toMatchObject({ adjust: "shorter", draft: "Pro is $29 a month. What takes the most time?" });

  await panel.getByRole("button", { name: "Alternatives" }).click();
  await panel.getByRole("button", { name: "Second option." }).click();
  await expect(box).toHaveValue("Second option.");
  expect(await scrollsSideways(panel)).toBe(false);
});

test("Test this agent in the agent form, at 320px", async ({ harness }) => {
  await signedIn(harness);
  let sent: Record<string, unknown> | null = null;
  await harness.context.route("**/api/ext/agents/test", async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reply: "Pro is $29 a month, with a free plan.", why: "Answers the price with a verified fact.", freeRemaining: 4 }),
    });
  });
  await harness.open("/feed/", "feed.html");
  const panel = await openPanel(harness, 320);
  await panel.getByRole("button", { name: "Profiles", exact: true }).click();
  await panel.getByRole("radio", { name: "Agents" }).click();
  await panel.getByRole("button", { name: "Edit" }).first().click();
  await panel.getByRole("textbox", { name: "Their message" }).fill("How much does it cost?");
  await panel.getByRole("button", { name: "Test reply" }).click();
  await expect(panel.getByLabel("The agent's reply")).toHaveText("Pro is $29 a month, with a free plan.");
  await panel.getByRole("button", { name: "Why this reply" }).click();
  await expect(panel.getByText("Answers the price with a verified fact.")).toBeVisible();
  expect(sent).toMatchObject({ message: "How much does it cost?", action: "best", draft: { name: "Founder outreach" } });
  expect(await scrollsSideways(panel)).toBe(false);
});

test("Build with AI: describe, answer, build, review and save, all at 320px", async ({ harness }) => {
  await signedIn(harness);
  const asked: Record<string, unknown>[] = [];
  const steps = [
    { done: false, question: "Who do you mostly talk to?", hint: "Seed-stage SaaS founders", optional: false, topic: "audience" },
    { done: true },
  ];
  await harness.context.route("**/api/ext/agents/builder", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    asked.push(body);
    const answer =
      body.action === "interview"
        ? (steps.shift() ?? { done: true })
        : { draft: { name: "Founder outreach", description: "Builds relationships with founders", purpose: "sales", config: { ...config, facts: ["Pro is $29 a month"] } } };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(answer) });
  });
  let saved: Record<string, unknown> | null = null;
  await harness.context.route("**/api/ext/agents", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    saved = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ agent: { ...AGENTS[0], id: "new" } }) });
  });
  await harness.open("/feed/", "feed.html");
  const panel = await openPanel(harness, 320);
  await panel.getByRole("button", { name: "Profiles", exact: true }).click();
  await panel.getByRole("radio", { name: "Agents" }).click();
  await panel.getByRole("button", { name: "New agent" }).click();
  await panel.getByRole("button", { name: /Build with AI/ }).click();
  expect(await scrollsSideways(panel)).toBe(false);

  await panel.getByLabel("What do you want your AI agent to help you achieve?").fill("I run a SaaS company that helps founders post on LinkedIn consistently.");
  await panel.getByRole("button", { name: "Continue" }).click();
  await panel.getByRole("textbox", { name: "Your answer" }).fill("Seed-stage SaaS founders");
  expect(await scrollsSideways(panel)).toBe(false);
  await panel.getByRole("button", { name: "Next" }).click();
  await panel.getByRole("button", { name: "Build my agent", exact: true }).click();

  await expect(panel.getByLabel(/Agent name/)).toHaveValue("Founder outreach");
  await expect(panel.getByRole("region", { name: "Refine with AI" })).toBeVisible();
  expect(await scrollsSideways(panel)).toBe(false);
  await panel.getByRole("button", { name: "Create agent" }).click();
  await expect.poll(() => saved).toMatchObject({ name: "Founder outreach", status: "active", config: { facts: ["Pro is $29 a month"] } });
  expect(asked.map((b) => b.action)).toEqual(["interview", "interview", "draft"]);
  expect(asked[1]).toMatchObject({ answers: [{ question: "Who do you mostly talk to?", answer: "Seed-stage SaaS founders", topic: "audience" }] });
});

test("the Agents tab and the agent builder fit a 320px panel", async ({ harness }) => {
  await signedIn(harness);
  await harness.open("/feed/", "feed.html");
  const panel = await openPanel(harness, 320);
  await panel.getByRole("button", { name: "Profiles", exact: true }).click();
  await panel.getByRole("radio", { name: "Agents" }).click();
  await expect(panel.getByText("Founder outreach")).toBeVisible();
  expect(await scrollsSideways(panel)).toBe(false);

  await panel.getByRole("button", { name: "New agent" }).click();
  await panel.getByRole("button", { name: /Fill it in myself/ }).click();
  await expect(panel.getByRole("button", { name: "Create agent" })).toBeVisible();
  expect(await scrollsSideways(panel)).toBe(false);

  await panel.getByRole("button", { name: "Messages", exact: true }).click();
  expect(await scrollsSideways(panel)).toBe(false);
});
