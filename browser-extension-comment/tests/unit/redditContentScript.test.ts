// The Reddit content script against anonymised copies of real new-Reddit
// pages (tests/fixtures/reddit): what a Reply click captures (the comment,
// the comments above it, the post, the subreddit's rules), what "Join the
// conversation" captures (the post and its top comments), and that Insert only
// ever types into the box for the captured comment or post.
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { chromeMock, deliverMessage } from "../setup/chrome";
import { REDDIT_INSERT_MESSAGE_TYPE, REDDIT_LAST_TARGET_STORAGE_KEY, type RedditCapturedTarget } from "@/reddit/lib/redditPost";
import { blockText, findCommentBox, subredditRules } from "@/reddit/content/redditPage";
import { usableEditor } from "@/content/editor";

const FIXTURES = path.resolve(__dirname, "../fixtures/reddit");
const POST_URL = "https://www.reddit.com/r/testsub/comments/p001/a_question/";

// Puts a saved page in the document, at its own reddit.com address.
function openPage(fixture: string) {
  (globalThis as unknown as { jsdom: { reconfigure(o: { url: string }): void } }).jsdom.reconfigure({ url: POST_URL });
  const html = fs.readFileSync(path.join(FIXTURES, fixture), "utf8");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = parsed.body.innerHTML;
}

async function loadContentScript(insertEnabled = true) {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ insertEnabled }), { status: 200 })));
  await import("@/reddit/content-script");
}

const comment = (id: string) => document.querySelector<HTMLElement>(`shreddit-comment[thingid="${id}"]`)!;
const replyButtonOf = (id: string) =>
  [...comment(id).querySelectorAll<HTMLElement>('faceplate-tracker[noun="reply_comment"]')].find(
    (el) => el.closest("shreddit-comment") === comment(id),
  )!;
const click = (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }));
const captured = () => chromeMock().__store[REDDIT_LAST_TARGET_STORAGE_KEY] as RedditCapturedTarget | undefined;
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

// Reddit draws the box you type in after the page loads, so the saved page
// has none: a stand-in. In the box's own slot for typing (jsdom can't put a
// caret inside a shadow root; real Chromium can, see tests/e2e), or inside
// the composer's shadow root, where Reddit may keep it, for finding it.
function editorIn(host: Element, where: "slot" | "shadow" = "slot"): HTMLElement {
  const composer = host.querySelector("shreddit-composer") ?? host;
  const editor = document.createElement("div");
  editor.setAttribute("contenteditable", "true");
  editor.setAttribute("role", "textbox");
  editor.innerHTML = "<p><br></p>";
  if (where === "shadow") (composer.shadowRoot ?? composer.attachShadow({ mode: "open" })).appendChild(editor);
  else (composer.querySelector('div[slot="rte"]') ?? composer).appendChild(editor);
  return editor;
}
const hostFor = (parentId: string | null) =>
  [...document.querySelectorAll("comment-composer-host")].find((h) => (h.getAttribute("parent-id") ?? null) === parentId)!;

beforeEach(() => {
  chromeMock().__store.apiBaseUrl = "https://carouselabs.com";
  typingDocument();
});

describe("reading a Reddit post page", () => {
  beforeEach(() => openPage("post.html"));

  it("Reply under a comment captures it, the comments above it, the post and the rules", async () => {
    await loadContentScript();
    click(replyButtonOf("t1_c003"));
    await flush();
    const target = captured()!;
    expect(target.subreddit).toBe("r/testsub");
    expect(target.postId).toBe("t3_p001");
    expect(target.replyToId).toBe("t1_c003");
    expect(target.replyTo).toEqual({
      author: "user_4",
      text: "Comment number 3, with its own point.",
      url: "https://www.reddit.com/r/testsub/comments/p001/a_question/c003/",
    });
    // Top-level first, the comment's own parent last.
    expect(target.chain.map((c) => c.text)).toEqual(["Comment number 1, with its own point.", "Comment number 2, with its own point."]);
    expect(target.others).toEqual([]);
    expect(target.post).toEqual({
      title: "How do I ask for a raise?",
      author: "user_1",
      text: "I have been at my job for two years and never asked.\n\nHow do I start that conversation?",
      url: POST_URL,
      flair: "Question",
      kind: "text",
    });
    expect(target.rules.length).toBeGreaterThan(0);
    expect(target.rules[0]).toEqual({
      title: "No spam or self-promotion",
      text: "Don't post links to your own product, and no AI-written posts or comments.",
    });
    expect(target.isOwnPost).toBe(false);
  });

  it("\"Join the conversation\" captures the post and its top comments, not a comment", async () => {
    await loadContentScript();
    click(document.querySelector('faceplate-textarea-input[data-testid="trigger-button"]')!);
    await flush();
    const target = captured()!;
    expect(target.replyTo).toBeNull();
    expect(target.replyToId).toBeNull();
    expect(target.chain).toEqual([]);
    expect(target.others).toHaveLength(5);
    expect(target.others[0].text).toBe("Comment number 1, with its own point.");
  });

  it("knows the post is yours when Reddit says the signed-in account wrote it", async () => {
    const post = document.querySelector("shreddit-post")!;
    post.setAttribute("author-id", post.getAttribute("user-id")!);
    await loadContentScript();
    click(replyButtonOf("t1_c001"));
    await flush();
    expect(captured()!.isOwnPost).toBe(true);
  });

  it("ignores every other click, including a comment's text and its other buttons", async () => {
    await loadContentScript();
    click(document.querySelector('[id="t1_c001-comment-rtjson-content"]')!);
    click(comment("t1_c001").querySelector('[slot="comment-share"]') ?? comment("t1_c001"));
    await flush();
    expect(captured()).toBeUndefined();
  });

  it("reads every rule once, and a block's paragraphs and list items on their own lines", () => {
    const rules = subredditRules();
    expect(rules.length).toBeGreaterThanOrEqual(4);
    expect(new Set(rules.map((r) => `${r.title}\n${r.text}`)).size).toBe(rules.length);
    const el = document.createElement("div");
    el.innerHTML = "<p>First  line</p><ul><li>one</li><li>two</li></ul><div><p>Last</p></div>";
    expect(blockText(el)).toBe("First line\n\n- one\n\n- two\n\nLast");
  });
});

describe("Insert", () => {
  beforeEach(() => openPage("post-boxes-open.html"));

  async function captureReply(id: string) {
    await loadContentScript();
    click(replyButtonOf(id));
    await flush();
    return captured()!;
  }

  it("types into the reply box under that comment, and no other", async () => {
    const target = await captureReply("t1_c039");
    const mine = editorIn(hostFor("t1_c039"));
    const other = editorIn(hostFor("t1_c038"));
    const main = editorIn(hostFor(null));
    const answer = await deliverMessage(chromeMock(), {
      type: REDDIT_INSERT_MESSAGE_TYPE,
      text: "Ask for a meeting first.",
      expect: { postId: target.postId, replyToId: target.replyToId },
    });
    expect(answer).toEqual({ ok: true });
    expect(mine.textContent).toContain("Ask for a meeting first.");
    expect(other.textContent).not.toContain("Ask for a meeting");
    expect(main.textContent).not.toContain("Ask for a meeting");
  });

  it("types a comment on the post into the post's box, never a reply box", async () => {
    await loadContentScript();
    click(document.querySelector('faceplate-textarea-input[data-testid="trigger-button"]')!);
    await flush();
    const target = captured()!;
    const main = editorIn(hostFor(null));
    const reply = editorIn(hostFor("t1_c038"));
    const answer = await deliverMessage(chromeMock(), { type: REDDIT_INSERT_MESSAGE_TYPE, text: "Practise it out loud.", expect: { postId: target.postId, replyToId: null } });
    expect(answer).toEqual({ ok: true });
    expect(main.textContent).toContain("Practise it out loud.");
    expect(reply.textContent).toBe("");
  });

  it("refuses text written for another comment than the last Reply click", async () => {
    await captureReply("t1_c039");
    editorIn(hostFor("t1_c039"));
    const answer = await deliverMessage(chromeMock(), {
      type: REDDIT_INSERT_MESSAGE_TYPE,
      text: "Wrong place.",
      expect: { postId: "t3_p001", replyToId: "t1_c038" },
    });
    expect(answer).toMatchObject({ ok: false, error: expect.stringContaining("Click Reply") });
  });

  it("never takes the composer's other fields for the box: before Reddit draws it, it isn't ready", async () => {
    const target = await captureReply("t1_c040");
    expect(hostFor("t1_c040").querySelectorAll("input").length).toBeGreaterThan(0);
    expect(findCommentBox(target, usableEditor)).toEqual({
      ok: false,
      error: "Reddit's box isn't ready to type in. Click into it, then Insert.",
    });
  });

  it("finds the box inside the composer's shadow root, where Reddit draws it", async () => {
    const target = await captureReply("t1_c040");
    const editor = editorIn(hostFor("t1_c040"), "shadow");
    expect(findCommentBox(target, usableEditor)).toEqual({ ok: true, box: editor });
  });

  it("says what to do when that comment's box isn't open, and never borrows another", async () => {
    const target = await captureReply("t1_c001");
    editorIn(hostFor("t1_c038"));
    expect(findCommentBox(target, usableEditor)).toEqual({
      ok: false,
      error: "Couldn't find the reply box under that comment. Click Reply under it, then Insert.",
    });
  });

  it("refuses while the Insert switch is off", async () => {
    await loadContentScript(false);
    click(replyButtonOf("t1_c039"));
    await flush();
    editorIn(hostFor("t1_c039"));
    const answer = await deliverMessage(chromeMock(), { type: REDDIT_INSERT_MESSAGE_TYPE, text: "x", expect: { postId: "t3_p001", replyToId: "t1_c039" } });
    expect(answer).toMatchObject({ ok: false, error: expect.stringContaining("turned off") });
  });
});
