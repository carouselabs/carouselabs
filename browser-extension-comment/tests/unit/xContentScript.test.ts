// The X content script against cleaned copies of real X pages
// (tests/fixtures/x): which post a Reply click captures (its text, not its
// quote's; the conversation above it on a post's own page), that the box for
// a NEW post is never treated as a reply, and that Insert only ever types
// into the reply box for the captured post.
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { chromeMock, deliverMessage } from "../setup/chrome";
import { X_INSERT_MESSAGE_TYPE, X_LAST_POST_STORAGE_KEY, type XCapturedPost } from "@/x/lib/xPost";

const FIXTURES = path.resolve(__dirname, "../fixtures/x");

// Puts a saved page in the document, at its own x.com address.
function openPage(fixture: string, url: string) {
  (globalThis as unknown as { jsdom: { reconfigure(o: { url: string }): void } }).jsdom.reconfigure({ url });
  const html = fs.readFileSync(path.join(FIXTURES, fixture), "utf8");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = parsed.body.innerHTML;
}

async function loadContentScript(insertEnabled = true) {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ insertEnabled }), { status: 200 })));
  await import("@/x/content-script");
}

const articles = () => [...document.querySelectorAll<HTMLElement>('[data-testid="primaryColumn"] article[data-testid="tweet"]')].filter((a) => !a.closest('[role="dialog"]'));
const articleBy = (handle: string) => articles().find((a) => a.querySelector('[data-testid="User-Name"]')?.textContent?.includes(`@${handle}`))!;
const replyButton = (article: Element) => article.querySelector<HTMLElement>('[data-testid="reply"]')!;
const click = (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const captured = () => chromeMock().__store[X_LAST_POST_STORAGE_KEY] as XCapturedPost | undefined;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// jsdom has no editing: a stand-in for the browser's insertText that types at
// the caret, as Chromium does.
function typingDocument() {
  document.execCommand = vi.fn((command: string, _ui?: boolean, value?: string) => {
    if (command !== "insertText") return false;
    const range = document.getSelection()?.getRangeAt(0);
    if (!range) return false;
    range.insertNode(document.createTextNode(value ?? ""));
    return true;
  }) as typeof document.execCommand;
}

beforeEach(() => {
  chromeMock().__store.apiBaseUrl = "https://carouselabs.com";
  typingDocument();
});

describe("Reply on the home feed", () => {
  beforeEach(async () => {
    openPage("x-home.html", "https://x.com/home");
    await loadContentScript();
  });

  it("captures the post whose Reply was clicked", async () => {
    click(replyButton(articleBy("user3")));
    await flush();
    expect(captured()).toMatchObject({
      post: {
        author: "Maya Lindqvist",
        handle: "user3",
        text: "Dark mode everywhere except the one tool I use all day.",
        url: "https://x.com/user3/status/1928085",
        media: ["video"],
      },
      thread: [],
      quoted: null,
      isOwnPost: false,
    });
  });

  it("takes a video-only post, and an ad's link card", async () => {
    click(replyButton(articleBy("user1")));
    await flush();
    expect(captured()?.post).toMatchObject({ handle: "user1", text: "", media: ["video"] });
    click(replyButton(articleBy("user2")));
    await flush();
    expect(captured()?.post).toMatchObject({ handle: "user2", url: "", media: ["link"] });
  });

  it("leaves the name empty rather than taking the @handle, for a name made only of emoji", async () => {
    const article = articleBy("user3");
    const nameSpan = [...article.querySelectorAll('[data-testid="User-Name"] span')].find((s) => s.textContent === "Maya Lindqvist")!;
    nameSpan.textContent = "";
    click(replyButton(article));
    await flush();
    expect(captured()?.post).toMatchObject({ author: "", handle: "user3" });
  });

  it("never treats the box for a new post as a reply", async () => {
    click(document.querySelector('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]')!);
    await flush();
    expect(captured()).toBeUndefined();
  });

  it("knows a post is your own", async () => {
    const own = articleBy("user4");
    own.querySelectorAll('[data-testid="User-Name"] span').forEach((s) => {
      if (s.textContent === "@user4") s.textContent = "@carouselabs";
    });
    click(replyButton(own));
    await flush();
    expect(captured()?.isOwnPost).toBe(true);
  });
});

describe("A post's own page", () => {
  beforeEach(async () => {
    openPage("x-post.html", "https://x.com/user1/status/1232133");
    await loadContentScript();
  });

  it("includes the main post as the conversation when replying under it", async () => {
    click(replyButton(articleBy("user3")));
    await flush();
    expect(captured()?.post).toMatchObject({ handle: "user3", url: "https://x.com/user3/status/1796332" });
    expect(captured()?.thread).toEqual([
      { author: "Priya Raman", handle: "user1", text: "", url: "https://x.com/user1/status/1232133", media: ["video"] },
    ]);
  });

  it("captures the main post when you click into “Post your reply”", async () => {
    click(document.querySelector('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]')!);
    await flush();
    expect(captured()?.post).toMatchObject({ handle: "user1", url: "https://x.com/user1/status/1232133" });
    expect(captured()?.thread).toEqual([]);
  });
});

describe("A quote post", () => {
  beforeEach(async () => {
    openPage("x-quote.html", "https://x.com/user1/status/1699119");
    await loadContentScript();
  });

  it("keeps the post's own text and link apart from the post it quotes", async () => {
    const focal = articles().find((a) => a.getAttribute("tabindex") === "-1")!;
    click(replyButton(focal));
    await flush();
    const post = captured()!;
    expect(post.post).toMatchObject({ author: "Priya Raman", handle: "user1", url: "https://x.com/user1/status/1699119", media: ["video"] });
    expect(post.quoted).toMatchObject({ author: "Sam Lee", handle: "user6", url: "" });
    expect(post.quoted?.text).toBe("Hiring for judgement over polish has never failed me.");
    expect(post.post.text).not.toBe(post.quoted?.text);
    expect(post.post.text.length).toBeGreaterThan(0);
  });

  it("never passes the quote's text off as the post's when the post has none of its own", async () => {
    const focal = articles().find((a) => a.getAttribute("tabindex") === "-1")!;
    const quote = focal.querySelector('div[role="link"]')!;
    [...focal.querySelectorAll('[data-testid="tweetText"]')].filter((t) => !quote.contains(t)).forEach((t) => t.remove());
    click(replyButton(focal));
    await flush();
    expect(captured()?.post.text).toBe("");
    expect(captured()?.quoted?.text).toBe("Hiring for judgement over polish has never failed me.");
  });
});

describe("Insert", () => {
  const dialogBox = () => document.querySelector<HTMLElement>('[role="dialog"] [data-testid="tweetTextarea_0"]')!;
  const newPostBox = () => document.querySelector<HTMLElement>('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]')!;
  const insert = (postUrl: string, text = "Order beats count.") =>
    deliverMessage(chromeMock(), { type: X_INSERT_MESSAGE_TYPE, text, expect: { postUrl } }) as Promise<{ ok: boolean; error?: string }>;

  beforeEach(async () => {
    // The home feed with the reply pop-up open for user1's post.
    openPage("x-reply-box.html", "https://x.com/home");
    await loadContentScript();
  });

  it("types into the pop-up for the captured post, never the new-post box", async () => {
    click(replyButton(articleBy("user1")));
    await flush();
    expect(await insert("https://x.com/user1/status/1232133")).toEqual({ ok: true });
    expect(dialogBox().textContent).toContain("Order beats count.");
    expect(newPostBox().textContent).not.toContain("Order beats count.");
  });

  it("refuses when the pop-up open is another post's", async () => {
    click(replyButton(articleBy("user3")));
    await flush();
    const res = await insert("https://x.com/user3/status/1928085");
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/different post/);
    expect(dialogBox().textContent).not.toContain("Order beats count.");
  });

  it("refuses when the panel's text was for a post that wasn't the last Reply click", async () => {
    click(replyButton(articleBy("user1")));
    await flush();
    const res = await insert("https://x.com/user4/status/1410223");
    expect(res).toEqual({ ok: false, error: "Click Reply on the post again, then Insert." });
  });

  it("refuses before any Reply click, and when Insert is switched off", async () => {
    expect((await insert("https://x.com/user1/status/1232133")).error).toMatch(/Click Reply on the post again/);
    await loadContentScript(false);
    click(replyButton(articleBy("user1")));
    await flush();
    expect(await insert("https://x.com/user1/status/1232133")).toEqual({ ok: false, error: "Insert is turned off right now. Use Copy instead." });
  });

  it("says so when X's box takes nothing, instead of pretending", async () => {
    document.execCommand = vi.fn(() => false) as typeof document.execCommand;
    click(replyButton(articleBy("user1")));
    await flush();
    const res = await insert("https://x.com/user1/status/1232133");
    expect(res.ok).toBe(false);
    expect(dialogBox().textContent).not.toContain("Order beats count.");
  });
});

describe("Copies and look-alikes", () => {
  it("ignores a Reply button inside the pop-up's copy of a post (it has no link)", async () => {
    openPage("x-reply-box.html", "https://x.com/home");
    await loadContentScript();
    const copy = document.querySelector('[role="dialog"] article[data-testid="tweet"]')!;
    const button = document.createElement("button");
    button.setAttribute("data-testid", "reply");
    copy.appendChild(button);
    click(button);
    await flush();
    expect(captured()).toBeUndefined();
  });

  it("never fills or captures an inline box whose button posts rather than replies", async () => {
    openPage("x-post.html", "https://x.com/user1/status/1232133");
    await loadContentScript();
    document.querySelector('[data-testid="primaryColumn"] [data-testid="tweetButtonInline"]')!.textContent = "Post";
    const box = document.querySelector<HTMLElement>('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]')!;
    click(box);
    await flush();
    expect(captured()).toBeUndefined();
    click(replyButton(articleBy("user1")));
    await flush();
    const res = (await deliverMessage(chromeMock(), { type: X_INSERT_MESSAGE_TYPE, text: "Order beats count.", expect: { postUrl: "https://x.com/user1/status/1232133" } })) as { ok: boolean };
    expect(res.ok).toBe(false);
    expect(box.textContent).not.toContain("Order beats count.");
  });
});

describe("Insert on a post's own page", () => {
  it("types into “Post your reply” under that post", async () => {
    openPage("x-post.html", "https://x.com/user1/status/1232133");
    await loadContentScript();
    const box = document.querySelector<HTMLElement>('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]')!;
    click(box);
    await flush();
    const res = (await deliverMessage(chromeMock(), { type: X_INSERT_MESSAGE_TYPE, text: "Order beats count.", expect: { postUrl: "https://x.com/user1/status/1232133" } })) as { ok: boolean };
    expect(res).toEqual({ ok: true });
    expect(box.textContent).toContain("Order beats count.");
  });
});
