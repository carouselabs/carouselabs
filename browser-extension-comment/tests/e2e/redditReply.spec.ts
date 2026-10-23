// The Reddit extension end to end in real Chromium (EXT_DIST=dist-reddit or
// dist-reddit-store), on anonymised copies of real new-Reddit pages: Reply
// under a comment (or "Join the conversation" on the post) reaches the panel,
// a comment is written, and Insert types it into the box for that comment or
// post, never another one.
//
// The saved pages carry Reddit's markup but not Reddit's own scripts, so the
// box you type in isn't there: each test draws a plain editable box inside
// the composer's shadow root, where Reddit keeps its editor. This proves the
// extension finds and fills the right box; that Reddit's editor keeps the text
// is checked on real Reddit.
import type { Page } from "@playwright/test";
import { expect, test, type Harness } from "./harness";

const isReddit = /dist-reddit/.test(process.env.EXT_DIST ?? "dist");
test.skip(!isReddit, "the Reddit extension: run with EXT_DIST=dist-reddit");

const POST_PATH = "/r/testsub/comments/p001/a_question/";
const COMMENT = "Ask for a short meeting first, and bring two things you did this year.";
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

async function signedIn(harness: Harness): Promise<{ body: () => Record<string, unknown> | null }> {
  harness.apiResponses.set("/api/ext/reddit/profiles", {
    status: 200,
    body: {
      defaultProfileId: null,
      profiles: [
        {
          id: "sys-reddit-helpful",
          name: "CarouseLabs — Reddit Helpful",
          tone: "Friendly",
          length: "120-500 characters",
          isDefault: true,
          isSystem: true,
          isRecommended: true,
        },
      ],
    },
  });
  harness.apiResponses.set("/api/ext/reddit/settings", { status: 200, body: { defaultProfileId: null, insertButtonHidden: false } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: { email: "a@b.co", extension: null } });
  // Insert and Copy are recorded in History.
  harness.apiResponses.set("/api/ext/history/h1", { status: 200, body: { ok: true } });
  let sent: Record<string, unknown> | null = null;
  await harness.context.route("**/api/ext/reddit/comment", (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: frame("start", {}) + frame("final", { comment: COMMENT, freeRemaining: null, historyId: "h1", length: COMMENT.length, maxLength: 500 }),
    });
  });
  await harness.worker.evaluate(() => chrome.storage.local.set({ extensionToken: "cl_cmt_reddit" }));
  return { body: () => sent };
}

// The panel as a tab; its "active tab" is pointed at the Reddit page, as in
// real use where the panel sits beside it.
async function openPanel(harness: Harness): Promise<Page> {
  const panel = await harness.context.newPage();
  await panel.addInitScript(() => {
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
      info.active ? query({ url: "https://www.reddit.com/*" }) : query(info)) as typeof chrome.tabs.query;
  });
  await panel.setViewportSize({ width: 400, height: 720 });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/reddit/sidepanel/index.html`);
  return panel;
}

// What Reddit's scripts do once its comment box has loaded, which the saved
// page can't: its loader shows the box (and, before that, "Join the
// conversation") instead of only its error slot; and a stand-in for Reddit's
// editor, inside the composer's shadow root.
function drawEditors(page: Page) {
  return page.evaluate(() => {
    for (const loader of document.querySelectorAll('shreddit-async-loader[bundlename="comment_composer"]')) {
      if (loader.shadowRoot) loader.shadowRoot.innerHTML = '<slot></slot><slot name="ready"></slot>';
    }
    for (const host of document.querySelectorAll("comment-composer-host")) {
      const composer = host.querySelector("shreddit-composer") ?? host;
      const shadow = composer.shadowRoot ?? composer.attachShadow({ mode: "open" });
      const editor = document.createElement("div");
      editor.setAttribute("contenteditable", "true");
      editor.setAttribute("role", "textbox");
      editor.dataset.for = host.getAttribute("parent-id") ?? "post";
      editor.innerHTML = "<p><br></p>";
      shadow.appendChild(editor);
    }
  });
}

const editorText = (page: Page, which: string) =>
  page.evaluate((w) => {
    for (const host of document.querySelectorAll("comment-composer-host")) {
      const composer = host.querySelector("shreddit-composer") ?? host;
      const editor = composer.shadowRoot?.querySelector<HTMLElement>(`[data-for="${w}"]`);
      if (editor) return editor.textContent ?? "";
    }
    return null;
  }, which);

const replyButtonOf = (page: Page, thingId: string) =>
  page.locator(`shreddit-comment[thingid="${thingId}"] faceplate-tracker[noun="reply_comment"] button`).first();

test("Reply under a comment reaches the panel, and Insert fills that comment's box only", async ({ harness }) => {
  const server = await signedIn(harness);
  const page = await harness.openReddit(POST_PATH, "post-boxes-open.html");
  await drawEditors(page);
  const panel = await openPanel(harness);

  await replyButtonOf(page, "t1_c039").click();
  await expect(panel.getByText("Replying to a comment in r/testsub")).toBeVisible();

  await panel.getByRole("button", { name: "Write reply" }).click();
  await expect(panel.getByRole("textbox", { name: "Your reply" })).toHaveValue(COMMENT);
  expect(server.body()).toMatchObject({ subreddit: "r/testsub", replyTo: { author: expect.any(String) }, post: { title: "How do I ask for a raise?" } });
  expect((server.body()!.rules as unknown[]).length).toBeGreaterThan(0);

  await panel.getByRole("button", { name: "Insert" }).click();
  await expect.poll(() => editorText(page, "t1_c039")).toContain(COMMENT);
  expect(await editorText(page, "t1_c038")).toBe("");
  expect(await editorText(page, "post")).toBe("");
  expect(harness.blocked.filter((u) => !u.includes("redditstatic") && !u.includes("redd.it"))).toEqual([]);
});

test("\"Join the conversation\" writes a comment on the post, and Insert fills the post's box", async ({ harness }) => {
  await signedIn(harness);
  const page = await harness.openReddit(POST_PATH, "post-boxes-open.html");
  await drawEditors(page);
  const panel = await openPanel(harness);

  await page.locator('faceplate-textarea-input[data-testid="trigger-button"]').first().click();
  await expect(panel.getByText("Commenting on a post in r/testsub")).toBeVisible();
  await panel.getByRole("button", { name: "Write comment" }).click();
  await expect(panel.getByRole("textbox", { name: "Your comment" })).toHaveValue(COMMENT);
  await panel.getByRole("button", { name: "Insert" }).click();
  await expect.poll(() => editorText(page, "post")).toContain(COMMENT);
  expect(await editorText(page, "t1_c039")).toBe("");
});
