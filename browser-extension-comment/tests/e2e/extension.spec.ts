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
  const res = await harness.sendToLinkedInTab<{ ok: boolean; conversation: any }>({ type: READ });
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
  const res = await harness.sendToLinkedInTab<{ ok: boolean; conversation: any; error?: string }>({ type: READ });
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

test("Connection note Insert replaces a typed note, and Ctrl+Z brings the typed note back", async ({ harness }) => {
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
  const res = await harness.sendToLinkedInTab<{ ok: boolean }>({
    type: INSERT,
    mode: "connect",
    text: note,
    expect: { profileUrl: "https://www.linkedin.com/in/jane-doe/" },
  });
  expect(res.ok).toBe(true);
  await expect(box).toHaveValue(note);

  await box.focus();
  await page.keyboard.press("Control+z");
  await expect(box).toHaveValue("My own note");
});

// Extension reload/update mid-session is covered by the manual checklist in
// TEST_REPORT.md: Playwright does not re-attach to a service worker after the
// extension reloads itself, so it can't be driven reliably from here.

test("side panel shows Sign in when there is no token", async ({ harness }) => {
  const page = await harness.context.newPage();
  await page.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  await expect(page.getByText("Sign in to CarouseLabs")).toBeVisible();
});
