// Real-Chromium checks for what jsdom cannot prove: the extension loads, the
// content script injects on (fixture) LinkedIn pages, execCommand insertion
// actually lands in contenteditable/textarea editors, real CSS/layout decides
// what is "rendered", and textarea maxlength behaves as it does for users.
import { expect, test } from "./harness";

const INSERT = "carouselabs:insert-comment";
const READ = "carouselabs:read-conversation";
const BHARTI = { threadPath: "/messaging/thread/2-bharti/", contactName: "Bharti Agrawal" };

test("loads, injects on LinkedIn, and makes no request outside the fixtures", async ({ harness }) => {
  const page = await harness.open("/feed/", "feed.html");
  await expect(page.getByText("Shipping small beats shipping big")).toBeVisible();
  expect(harness.blocked.filter((url) => !url.startsWith("data:"))).toEqual([]);
});

test("Comment click is captured into extension storage", async ({ harness }) => {
  const page = await harness.open("/feed/", "feed.html");
  await page.locator("[data-fixture='post-1'] button[aria-label^='Comment']").click();
  await expect.poll(async () => (await harness.storage()).lastSelectedPost?.authorName).toBe("Jane Doe");
});

test("Insert types into LinkedIn's comment editor for real (emoji and line breaks intact)", async ({ harness }) => {
  const page = await harness.open("/feed/", "feed.html");
  await page.locator("[data-fixture='post-2'] button[aria-label='Comment']").click();
  const res = await harness.sendToLinkedInTab<{ ok: boolean }>({ type: INSERT, mode: "comment", text: "Congrats 🎉\nGreat roles" });
  expect(res.ok).toBe(true);
  const box = page.locator("[data-fixture='post-2-comment-box']");
  await expect(box).toContainText("Congrats 🎉");
  await expect(box).toContainText("Great roles");
});

test("Insert keeps a comment the user already typed", async ({ harness }) => {
  const page = await harness.open("/feed/", "feed.html");
  await page.locator("[data-fixture='post-2'] button[aria-label='Comment']").click();
  const box = page.locator("[data-fixture='post-2-comment-box']");
  await box.click();
  await page.keyboard.type("Love this.");
  await page.locator("body").click({ position: { x: 5, y: 5 } }); // focus moves to the side panel in real use
  await harness.sendToLinkedInTab({ type: INSERT, mode: "comment", text: "Congrats on the hires" });
  const text = (await box.innerText()).replace(/\s+/g, " ");
  expect(text).toContain("Love this.");
  expect(text.indexOf("Love this.")).toBeLessThan(text.indexOf("Congrats on the hires"));
});

test("Read conversation in real Chromium: right contact, only the open thread, right senders", async ({ harness }) => {
  await harness.open("/messaging/thread/2-bharti/", "messaging-thread.html");
  const res = await harness.sendToLinkedInTab<{ ok: boolean; conversation: { contact: { name: string }; thread: Array<{ sender: string; text: string }> } }>({ type: READ });
  expect(res.ok).toBe(true);
  expect(res.conversation.contact.name).toBe("Bharti Agrawal");
  const thread = res.conversation.thread as Array<{ sender: string; text: string }>;
  expect(thread.map((m) => m.sender)).toEqual(["me", "them", "me", "me"]);
  expect(thread[0].text).toMatch(/Would love to connect/);
  expect(JSON.stringify(thread)).not.toMatch(/Thursday|Emma/);
});

test("Message Insert goes to the open thread and is refused after switching threads", async ({ harness }) => {
  const page = await harness.open("/messaging/thread/2-bharti/", "messaging-thread.html");
  const ok = await harness.sendToLinkedInTab<{ ok: boolean }>({ type: INSERT, mode: "message", text: "Hi Bharti", expect: BHARTI });
  expect(ok.ok).toBe(true);
  await expect(page.locator("[data-fixture='main-compose']")).toContainText("Hi Bharti");
  await expect(page.locator("[data-fixture='overlay-compose']")).toHaveText("");

  await page.evaluate(() => history.pushState(null, "", "/messaging/thread/2-emma/")); // LinkedIn SPA navigation
  const refused = await harness.sendToLinkedInTab<{ ok: boolean }>({ type: INSERT, mode: "message", text: "Hi again", expect: BHARTI });
  expect(refused.ok).toBe(false);
});

// LinkedIn's newer design (seen live 2026-09-27): a new shell page with a
// hidden feed, and Messaging inside a full-screen same-origin frame.
test("New LinkedIn design: reads the conversation inside the Messaging frame", async ({ harness }) => {
  harness.pages.set("/preload/", "messaging-thread.html");
  const page = await harness.open("/messaging/thread/2-bharti/", "messaging-new-shell.html");
  await page.frameLocator('iframe[data-testid="interop-iframe"]').locator(".msg-entity-lockup__entity-title").first().waitFor();
  const res = await harness.sendToLinkedInTab<{ ok: boolean; conversation: { contact: { name: string }; thread: Array<{ sender: string; text: string }> }; error?: string }>({ type: READ });
  expect(res.error).toBeUndefined();
  expect(res.conversation.contact.name).toBe("Bharti Agrawal");
  const thread = res.conversation.thread as Array<{ sender: string; text: string }>;
  expect(thread.map((m) => m.sender)).toEqual(["me", "them", "me", "me"]);
  expect(JSON.stringify(thread)).not.toMatch(/Thursday|Emma/);
});

test("New LinkedIn design: Insert types into the frame's message box, not the hidden feed", async ({ harness }) => {
  harness.pages.set("/preload/", "messaging-thread.html");
  const page = await harness.open("/messaging/thread/2-bharti/", "messaging-new-shell.html");
  const frame = page.frameLocator('iframe[data-testid="interop-iframe"]');
  await frame.locator("[data-fixture='main-compose']").waitFor();
  const ok = await harness.sendToLinkedInTab<{ ok: boolean; error?: string }>({ type: INSERT, mode: "message", text: "Hi Bharti", expect: BHARTI });
  expect(ok.error).toBeUndefined();
  await expect(frame.locator("[data-fixture='main-compose']")).toContainText("Hi Bharti");
  await expect(frame.locator("[data-fixture='overlay-compose']")).toHaveText("");
  await expect(page.locator("[data-fixture='feed-comment-box']")).toHaveText("");
});

test("Connection note: a note over the account's limit is refused, not silently cut", async ({ harness }) => {
  const page = await harness.open("/in/jane-doe/", "profile.html");
  await page.locator("[data-fixture='topcard-connect']").click();
  await page.evaluate(() => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.innerHTML = '<textarea name="message" maxlength="200"></textarea>';
    document.body.append(dialog);
  });
  const text = `Hi Jane, ${"really enjoyed your writing on product. ".repeat(6)}`.trim();
  const res = await harness.sendToLinkedInTab<{ ok: boolean }>({
    type: INSERT,
    mode: "connect",
    text,
    expect: { profileUrl: "https://www.linkedin.com/in/jane-doe/" },
  });
  const value = await page.locator("[role='dialog'] textarea").inputValue();
  expect(res.ok).toBe(false);
  expect(value).toBe("");
});

test("Connection note: a note the person typed is never replaced unless they choose to", async ({ harness }) => {
  const page = await harness.open("/in/jane-doe/", "profile.html");
  await page.locator("[data-fixture='topcard-connect']").click();
  await page.evaluate(() => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.innerHTML = '<textarea name="message" maxlength="300"></textarea>';
    document.body.append(dialog);
  });
  const box = page.locator("[role='dialog'] textarea");
  await box.click();
  await page.keyboard.type("My own note");

  const note = "Hi Jane — loved your post on shipping small. Would be great to connect.";
  const insert = (replace?: boolean) =>
    harness.sendToLinkedInTab<{ ok: boolean; hasText?: boolean; error?: string }>({
      type: INSERT,
      mode: "connect",
      text: note,
      expect: { profileUrl: "https://www.linkedin.com/in/jane-doe/" },
      ...(replace ? { replace: true } : {}),
    });

  // Without the person's say-so: refused, their text untouched.
  const asked = await insert();
  expect(asked).toMatchObject({ ok: false, hasText: true });
  await expect(box).toHaveValue("My own note");

  // Their choice ("Replace it" in the panel): replaced.
  expect(await insert(true)).toEqual({ ok: true });
  await expect(box).toHaveValue(note);

  // The extension's own note, untouched since, may be replaced (a regenerated
  // note) without asking again.
  expect(await insert()).toEqual({ ok: true });
  await expect(box).toHaveValue(note);
});

// A Web Store update restarts the extension under an open LinkedIn tab, and
// Chrome gives that tab no new content script. The restarted extension puts
// one in itself (src/background.ts), so the tab keeps working without a
// reload. Playwright doesn't re-attach to a restarted service worker, so the
// extension is reached afterwards through one of its own pages instead.
test("after an update, a LinkedIn tab that was already open works without a reload", async ({ harness }) => {
  const page = await harness.open("/feed/", "feed.html");
  // What an update does to the running extension: it's replaced by a fresh
  // instance, as a developer's Reload on chrome://extensions does (an
  // extension calling chrome.runtime.reload() on itself isn't reloaded in
  // this test browser, so that can't stand in for it).
  const manager = await harness.context.newPage();
  await manager.goto("chrome://extensions/");
  await manager.locator("#devMode").click();
  await manager.locator(`extensions-item#${harness.extensionId} #dev-reload-button`).click();
  await manager.close();

  // The restarted extension, through one of its own pages; it may take a
  // moment to come back.
  const ext = await harness.context.newPage();
  await expect(async () => {
    await ext.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
    expect(await ext.evaluate(() => Boolean(chrome.runtime?.id))).toBe(true);
  }).toPass({ timeout: 20_000 });

  const tabAnswers = () =>
    ext.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
      try {
        return await chrome.tabs.sendMessage(tab.id!, { type: "carouselabs:ping" });
      } catch (err) {
        return String(err);
      }
    });

  // The restarted worker repairs the tab by itself (on onInstalled, and when
  // it starts). If nothing has started it yet, any extension message does, as
  // a Comment click or the side panel would in real use.
  let repairedBy = "the restart itself";
  try {
    await expect.poll(tabAnswers, { timeout: 10_000 }).toEqual({ ok: true });
  } catch {
    repairedBy = "the worker's next start";
    await ext.evaluate(() => chrome.runtime.sendMessage({ type: "carouselabs:wake" }).catch(() => undefined));
    await expect.poll(tabAnswers, { timeout: 15_000 }).toEqual({ ok: true });
  }
  console.log(`[e2e] the open LinkedIn tab was repaired by ${repairedBy}`);

  await page.locator("[data-fixture='post-1'] button[aria-label^='Comment']").click();
  await expect
    .poll(() => ext.evaluate(async () => (await chrome.storage.local.get("lastSelectedPost")).lastSelectedPost?.authorName))
    .toBe("Jane Doe");

  const pong = await ext.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
    return chrome.tabs.sendMessage(tab.id!, { type: "carouselabs:ping" });
  });
  expect(pong).toEqual({ ok: true });
});

// The same injection into a tab whose content script is alive (a race with
// Chrome's own injection, say) must not leave two copies both acting.
test("injecting into a tab that already has the script leaves one working copy", async ({ harness }) => {
  const page = await harness.open("/feed/", "feed.html");
  const second = page.waitForEvent("console", {
    predicate: (msg) => msg.text().startsWith("[content-script] loaded on"),
    timeout: 15_000,
  });
  // What src/lib/tabs.ts's injectContentScript does: import the content
  // script module under a URL of its own, so it runs again in this tab.
  await harness.worker.evaluate(async () => {
    const resources = chrome.runtime.getManifest().web_accessible_resources as { resources: string[] }[];
    const modulePath = resources.flatMap((entry) => entry.resources).find((file) => /content-script\.ts-[\w-]+\.js$/.test(file))!;
    const [tab] = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (url: string) => {
        import(url);
      },
      args: [`${chrome.runtime.getURL(modulePath)}?injected=${Date.now()}`],
    });
  });
  await second;

  await page.locator("[data-fixture='post-2'] button[aria-label='Comment']").click();
  const res = await harness.sendToLinkedInTab<{ ok: boolean }>({ type: INSERT, mode: "comment", text: "Only once please" });
  expect(res.ok).toBe(true);
  const box = page.locator("[data-fixture='post-2-comment-box']");
  await expect(box).toContainText("Only once please");
  expect((await box.innerText()).match(/Only once please/g)).toHaveLength(1);
});

// The whole path a user sees: signed in, the panel open, a Comment click on
// LinkedIn turns Generate on. (The panel is opened as a tab here; Playwright
// can't open Chrome's side panel itself.)
test("signed in: a Comment click on LinkedIn turns the panel's Generate button on", async ({ harness }) => {
  const profile = {
    id: "p1", userId: null, name: "Founder voice", whoIAm: "", goal: "", tone: "Friendly", length: "medium",
    emoji: "none", language: "English", alwaysDo: null, neverDo: null, samples: [], isDefault: true,
    isSystem: true, isRecommended: false, testsUsed: 0, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
  };
  const me = {
    email: "user@example.com", plan: "FREE", commentsThisMonth: 0, commentsToday: 0,
    defaultCommentProfileId: "p1", defaultLanguage: null, insertWarningHidden: false,
    extension: { access: "free", freeUsed: 0, freeLimit: 10, status: null, renewsAt: null, endsAt: null, manageUrl: null },
  };
  harness.apiResponses.set("/api/ext/profiles", { status: 200, body: { profiles: [profile] } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: me });
  harness.apiResponses.set("/api/ext/settings", { status: 200, body: {} });
  harness.apiResponses.set("/api/ext/contacts", { status: 200, body: { contacts: [] } });
  await harness.worker.evaluate(() =>
    chrome.storage.local.set({ extensionToken: "cl_cmt_e2e", onboardingComplete: true }),
  );

  const page = await harness.open("/feed/", "feed.html");
  const panel = await harness.context.newPage();
  // Playwright opens the side panel as a tab; model the LinkedIn tab that is
  // active when a real Chrome side panel is open beside it.
  await panel.addInitScript(() => {
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
      info.active ? query({ url: "https://www.linkedin.com/*" }) : query(info)) as typeof chrome.tabs.query;
  });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  await expect(panel.getByRole("combobox")).toContainText("Founder voice");
  const generate = panel.getByRole("button", { name: "Generate", exact: true });
  await expect(generate).toBeDisabled(); // no post yet

  await page.locator("[data-fixture='post-1'] button[aria-label^='Comment']").click();
  await expect(generate).toBeEnabled();
  await expect(panel.getByText("Jane Doe").first()).toBeVisible();
});

test("side panel shows Sign in when there is no token", async ({ harness }) => {
  const page = await harness.context.newPage();
  await page.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  await expect(page.getByText("Sign in to CarouseLabs")).toBeVisible();
});
