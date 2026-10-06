// Insert, in real Chromium on saved LinkedIn and X pages, in the situations
// where it used to fail or type the text twice: the post's card re-rendered
// after the Comment click, a comment box that opens a moment late, Insert
// from another tab, a content script that was replaced (update or repair),
// the same Insert delivered twice, and an editor that keeps its own copy of
// the text (as LinkedIn's and X's do) and must actually take it in.
//
// The saved pages carry LinkedIn's and X's markup but not their scripts, so
// the "framework editor" below stands in for theirs: it keeps a model of its
// text that only real input events update, redraws itself from that model,
// and turns its Post button on only when the model has text. That X's and
// LinkedIn's own editors keep the text is checked on the live sites.
import type { Page } from "@playwright/test";
import { expect, test, type Harness } from "./harness";

const isX = /dist-x/.test(process.env.EXT_DIST ?? "dist");
const INSERT = "carouselabs:insert-comment";
const X_INSERT = "carouselabs:x-insert";

type InsertResult = { ok: boolean; error?: string };

// The extension's message to one tab, picked by its title (two tabs can show
// the same address).
async function sendToTab<T>(harness: Harness, page: Page, message: unknown): Promise<T> {
  const title = await page.title();
  return harness.worker.evaluate(
    async ({ title, message }) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.title === title);
      if (!tab?.id) throw new Error(`no tab titled ${title}`);
      return chrome.tabs.sendMessage(tab.id, message);
    },
    { title, message },
  ) as Promise<T>;
}

async function titled(page: Page, title: string): Promise<Page> {
  await page.evaluate((t) => (document.title = t), title);
  return page;
}

// What the panel sends with an Insert: the capture's target, as stored.
async function capturedTarget(harness: Harness, key = "lastSelectedPost"): Promise<unknown> {
  const stored = (await harness.storage())[key] as { target?: unknown } | undefined;
  return stored?.target;
}

async function clickComment(harness: Harness, page: Page, post: string) {
  const before = ((await harness.storage()).lastSelectedPost as { capturedAt?: number } | undefined)?.capturedAt;
  await page.locator(`[data-fixture='${post}'] button[aria-label^='Comment']`).click();
  await expect
    .poll(async () => ((await harness.storage()).lastSelectedPost as { capturedAt?: number } | undefined)?.capturedAt)
    .not.toBe(before);
}

// A comment box like LinkedIn's, added to a post that has none in the fixture.
const addCommentBox = (page: Page, post: string, delayMs = 0) =>
  page.evaluate(
    ({ post, delayMs }) => {
      const add = () => {
        const box = document.createElement("div");
        box.setAttribute("contenteditable", "true");
        box.setAttribute("role", "textbox");
        box.setAttribute("aria-label", "Text editor for creating a comment");
        box.setAttribute("data-fixture", `${post}-comment-box`);
        box.innerHTML = "<p><br></p>";
        document.querySelector(`[data-fixture='${post}']`)!.append(box);
      };
      if (delayMs) setTimeout(add, delayMs);
      else add();
    },
    { post, delayMs },
  );

const occurrences = (text: string, part: string) => text.split(part).length - 1;

test.describe("LinkedIn", () => {
  test.skip(isX, "the LinkedIn extension (EXT_DIST=dist or dist-store)");

  test("a post card LinkedIn redraws after the Comment click still gets the comment", async ({ harness }) => {
    const page = await harness.open("/feed/", "feed.html");
    await clickComment(harness, page, "post-2");
    // LinkedIn replaces a card's elements when it redraws it (a new comment
    // section, the feed recycling it on scroll).
    await page.evaluate(() => {
      const card = document.querySelector("[data-fixture='post-2']")!;
      card.replaceWith(card.cloneNode(true));
    });
    const res = await harness.sendToLinkedInTab<InsertResult>({
      type: INSERT,
      mode: "comment",
      text: "Congrats on the hires",
      insertId: "redraw-1",
      target: await capturedTarget(harness),
    });
    expect(res).toEqual({ ok: true });
    await expect(page.locator("[data-fixture='post-2-comment-box']")).toContainText("Congrats on the hires");
  });

  test("a comment box that opens a moment after Insert is waited for", async ({ harness }) => {
    const page = await harness.open("/feed/", "feed.html");
    await clickComment(harness, page, "post-1");
    await addCommentBox(page, "post-1", 400);
    const res = await harness.sendToLinkedInTab<InsertResult>({
      type: INSERT,
      mode: "comment",
      text: "Shipping weekly is underrated",
      insertId: "late-box-1",
      target: await capturedTarget(harness),
    });
    expect(res).toEqual({ ok: true });
    await expect(page.locator("[data-fixture='post-1-comment-box']")).toContainText("Shipping weekly is underrated");
  });

  test("Insert from another LinkedIn tab goes to the post it was written for, never another post's box", async ({ harness }) => {
    // Tab B: the person clicked Comment on post 1 there earlier.
    const tabB = await titled(await harness.open("/feed/", "feed.html"), "tab-B");
    await addCommentBox(tabB, "post-1");
    await clickComment(harness, tabB, "post-1");
    // Tab A: then on post 2, and wrote a comment for it.
    const tabA = await titled(await harness.open("/feed/", "feed.html"), "tab-A");
    await clickComment(harness, tabA, "post-2");
    const target = await capturedTarget(harness);

    // Insert while tab B is the one showing.
    const res = await sendToTab<InsertResult>(harness, tabB, {
      type: INSERT,
      mode: "comment",
      text: "Written for post two",
      insertId: "other-tab-1",
      target,
    });
    await expect(tabB.locator("[data-fixture='post-1-comment-box']")).not.toContainText("Written for post two");
    // Post 2 is on tab B's page too, so that is where it belongs.
    expect(res).toEqual({ ok: true });
    await expect(tabB.locator("[data-fixture='post-2-comment-box']")).toContainText("Written for post two");
  });

  test("Insert still works after the page's content script was replaced (an update or a repair)", async ({ harness }) => {
    const page = await harness.open("/feed/", "feed.html");
    await clickComment(harness, page, "post-2");
    const target = await capturedTarget(harness);
    const second = page.waitForEvent("console", {
      predicate: (msg) => msg.text().startsWith("[content-script] loaded on"),
      timeout: 15_000,
    });
    // What src/lib/tabs.ts does when a tab doesn't answer: a fresh copy.
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
    const res = await harness.sendToLinkedInTab<InsertResult>({
      type: INSERT,
      mode: "comment",
      text: "After the repair",
      insertId: "repaired-1",
      target,
    });
    expect(res).toEqual({ ok: true });
    await expect(page.locator("[data-fixture='post-2-comment-box']")).toContainText("After the repair");
  });

  test("the same Insert delivered twice (a resend after a lost answer, a double click) types the text once", async ({ harness }) => {
    const page = await harness.open("/feed/", "feed.html");
    await clickComment(harness, page, "post-2");
    const message = { type: INSERT, mode: "comment", text: "Only once please", insertId: "twice-1", target: await capturedTarget(harness) };
    const [first, second] = await Promise.all([
      harness.sendToLinkedInTab<InsertResult>(message),
      harness.sendToLinkedInTab<InsertResult>(message),
    ]);
    const third = await harness.sendToLinkedInTab<InsertResult>(message);
    expect([first.ok, second.ok, third.ok]).toEqual([true, true, true]);
    const text = (await page.locator("[data-fixture='post-2-comment-box']").textContent()) ?? "";
    expect(occurrences(text, "Only once please")).toBe(1);
  });

  test("an editor that keeps its own copy takes the text in: it stays after a redraw, typing continues, Post turns on", async ({ harness }) => {
    const page = await harness.open("/feed/", "feed.html");
    // post 2's box, replaced by a framework-style editor (see the top of this file).
    await page.evaluate(() => {
      const old = document.querySelector("[data-fixture='post-2-comment-box']")!;
      const box = old.cloneNode(false) as HTMLElement;
      const post = document.createElement("button");
      post.textContent = "Post";
      post.disabled = true;
      post.setAttribute("data-fixture", "post-2-submit");
      old.replaceWith(box, post);
      const state = { model: "", redraws: 0 };
      (window as unknown as { editorState: typeof state }).editorState = state;
      const draw = () => {
        state.redraws += 1;
        const lines = state.model.split("\n");
        box.replaceChildren(
          ...lines.map((line) => {
            const p = document.createElement("p");
            if (line) p.textContent = line;
            else p.append(document.createElement("br"));
            return p;
          }),
        );
        post.disabled = state.model.trim() === "";
      };
      draw();
      box.addEventListener("input", (event) => {
        // Only the browser's own input (typing, and the editing commands it
        // runs) counts; a page script firing a made-up event doesn't.
        if (!event.isTrusted) return;
        state.model = Array.from(box.children, (p) => p.textContent ?? "").join("\n");
        // Redraws from its model a moment later, like React does: anything
        // written into the page without an input the editor took is lost.
        setTimeout(() => {
          const selection = document.getSelection();
          const atEnd = selection?.anchorNode && box.contains(selection.anchorNode);
          draw();
          if (atEnd) {
            const range = document.createRange();
            range.selectNodeContents(box.lastElementChild ?? box);
            range.collapse(false);
            selection!.removeAllRanges();
            selection!.addRange(range);
          }
        }, 0);
      });
    });
    await clickComment(harness, page, "post-2");

    const text = "Congrats 🎉 Ünïcödé — “quotes” & <b>not markup</b>\nSecond line, 100% sure";
    const res = await harness.sendToLinkedInTab<InsertResult>({
      type: INSERT,
      mode: "comment",
      text,
      insertId: "framework-1",
      target: await capturedTarget(harness),
    });
    expect(res).toEqual({ ok: true });
    const model = () => page.evaluate(() => (window as unknown as { editorState: { model: string } }).editorState.model);
    await expect.poll(model).toBe(text);
    // Text, never markup.
    await expect(page.locator("[data-fixture='post-2-comment-box'] b")).toHaveCount(0);
    // Still there after the editor's redraw, and the page's own Post button is on.
    await page.waitForTimeout(50);
    await expect.poll(model).toBe(text);
    await expect(page.locator("[data-fixture='post-2-submit']")).toBeEnabled();
    // The person can carry on typing.
    await page.keyboard.type(" Go!");
    await expect.poll(model).toBe(`${text} Go!`);
  });

  test("when the post is no longer on the page, Insert says so and types nowhere", async ({ harness }) => {
    const page = await harness.open("/feed/", "feed.html");
    await clickComment(harness, page, "post-2");
    const target = await capturedTarget(harness);
    await page.evaluate(() => document.querySelector("[data-fixture='post-2']")!.remove());
    const res = await harness.sendToLinkedInTab<InsertResult>({ type: INSERT, mode: "comment", text: "Lost post", insertId: "gone-1", target });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Comment/);
    expect(await page.locator("[contenteditable]").evaluateAll((boxes) => boxes.map((b) => b.textContent).join(""))).not.toContain("Lost post");
  });
});

test.describe("X", () => {
  test.skip(!isX, "the X extension (EXT_DIST=dist-x or dist-x-store)");

  const replyButtonOf = (page: Page, handle: string) =>
    page
      .locator('[data-testid="primaryColumn"] article[data-testid="tweet"]')
      .filter({ has: page.locator('[data-testid="User-Name"]', { hasText: `@${handle}` }) })
      .filter({ hasNot: page.locator('[role="dialog"]') })
      .first()
      .locator('[data-testid="reply"]');

  async function replyTo(harness: Harness, handle: string): Promise<{ page: Page; postUrl: string }> {
    const page = await harness.openX("/home", "x-reply-box.html");
    await replyButtonOf(page, handle).dispatchEvent("click");
    await expect.poll(async () => ((await harness.storage()).lastXReplyTarget as { post?: { handle?: string } } | undefined)?.post?.handle).toBe(handle);
    const postUrl = ((await harness.storage()).lastXReplyTarget as { post: { url: string } }).post.url;
    return { page: await titled(page, "x-tab"), postUrl };
  }

  const dialogBox = (page: Page) => page.locator('[role="dialog"] [data-testid="tweetTextarea_0"]');
  const REPLY = "Fair point.\n\nThe invite step matters most.";

  test("a reply with line breaks is typed once, even where X's editor also takes a paste", async ({ harness }) => {
    const { page, postUrl } = await replyTo(harness, "user1");
    // X's editor (Draft.js) puts pasted text in itself, as here.
    await page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('[role="dialog"] [data-testid="tweetTextarea_0"]')!;
      box.addEventListener("paste", (event) => {
        event.preventDefault();
        document.execCommand("insertText", false, (event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "");
      });
    });
    const res = await sendToTab<InsertResult>(harness, page, { type: X_INSERT, text: REPLY, insertId: "x-paste-1", expect: { postUrl } });
    const text = (await dialogBox(page).textContent()) ?? "";
    expect(occurrences(text, "Fair point.")).toBe(1);
    expect(res).toEqual({ ok: true });
  });

  test("a reply with line breaks that landed is reported as inserted", async ({ harness }) => {
    const { page, postUrl } = await replyTo(harness, "user1");
    const res = await sendToTab<InsertResult>(harness, page, { type: X_INSERT, text: REPLY, insertId: "x-lines-1", expect: { postUrl } });
    expect(res).toEqual({ ok: true });
    await expect(dialogBox(page)).toContainText("Fair point.");
    await expect(dialogBox(page)).toContainText("The invite step matters most.");
  });

  test("the same Insert delivered twice types the reply once", async ({ harness }) => {
    const { page, postUrl } = await replyTo(harness, "user1");
    const message = { type: X_INSERT, text: "Once is enough.", insertId: "x-twice-1", expect: { postUrl } };
    const [first, second] = await Promise.all([sendToTab<InsertResult>(harness, page, message), sendToTab<InsertResult>(harness, page, message)]);
    expect([first.ok, second.ok]).toEqual([true, true]);
    const text = (await dialogBox(page).textContent()) ?? "";
    expect(occurrences(text, "Once is enough.")).toBe(1);
  });
});
