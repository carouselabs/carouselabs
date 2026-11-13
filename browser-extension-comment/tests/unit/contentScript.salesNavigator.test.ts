// Sales Navigator opens a post in a frame of LinkedIn's own post page
// (www.linkedin.com/feed/sales-navigator/<urn>), in LinkedIn's older,
// class-based layout. The content script runs in that frame too (the
// manifest's all_frames), reads that layout (src/content/classicPost.ts),
// and answers an Insert only in the frame that captured the post.
import { afterEach, describe, expect, it, vi } from "vitest";
import { byFixture, click, importContentScript, loadFixture, sendToContentScript, SERVER_CONFIG, storedPost } from "./helpers";
import { READ_CONVERSATION_MESSAGE_TYPE } from "@/lib/messageThread";
import { READ_SELF_PROFILE_MESSAGE_TYPE } from "@/lib/connectionNote";
import { PING_MESSAGE_TYPE } from "@/lib/tabs";

const INSERT = "carouselabs:insert-comment";
const FRAME_PATH = "/feed/sales-navigator/urn:li:share:123";
const POST_IMAGE = "https://media.licdn.com/dms/image/v2/D4E22AQ/feedshare-shrink_800/0/1700000000001?e=1&t=b";

// The script reads window.top once, as it loads: this makes the test window a
// frame inside another page.
const topDescriptor = Object.getOwnPropertyDescriptor(window, "top");
function asFrame() {
  Object.defineProperty(window, "top", { configurable: true, get: () => ({}) });
}
afterEach(() => {
  if (topDescriptor) Object.defineProperty(window, "top", topDescriptor);
  else delete (window as { top?: unknown }).top;
});

async function salesNavigatorPost(path = FRAME_PATH) {
  loadFixture("sales-navigator-post.html", path);
  return importContentScript({ config: SERVER_CONFIG });
}

type Thread = { author: string; text: string; isTarget: boolean; isPostAuthor: boolean }[];

describe("a post in LinkedIn's older layout (Sales Navigator)", () => {
  it("captures its author, headline, text, pictures and own address", async () => {
    await salesNavigatorPost();
    await click(byFixture("sn-comment-button"));
    const post = await storedPost();
    expect(post).toMatchObject({
      mode: "comment",
      authorName: "Maya Lindqvist",
      authorHeadline: "CISO",
      text: "Boards ask about risk in dollars, not in alerts. Here is how we report it every quarter.",
      type: "image",
      // The post's picture only: never a profile photo or a picture in a comment.
      images: [POST_IMAGE],
      video: false,
      url: "https://www.linkedin.com/feed/update/urn:li:activity:456/",
      postUrn: "urn:li:activity:456",
    });
    // Captured in the page itself (not a frame): no frame on the target.
    expect(post?.target).toEqual({ captureId: expect.any(String), postKey: null, postUrn: "urn:li:activity:456" });
  });

  it("Insert fills the post's own comment box, and finds it again after a redraw", async () => {
    await salesNavigatorPost();
    await click(byFixture("sn-comment-button"));
    const target = (await storedPost())?.target;
    expect(await sendToContentScript({ type: INSERT, text: "Dollars, every time.", mode: "comment", target })).toEqual({ ok: true });
    expect(byFixture("sn-comment-box").textContent).toContain("Dollars, every time.");

    const card = byFixture("sn-post");
    card.replaceWith(card.cloneNode(true));
    const res = await sendToContentScript({ type: INSERT, text: " Again.", mode: "comment", target: { ...(target as object), captureId: "elsewhere" } });
    expect(res).toEqual({ ok: true });
    expect(byFixture("sn-comment-box").textContent).toContain("Again.");
  });

  it("Reply reads the comment and its thread, with each person's name", async () => {
    await salesNavigatorPost();
    await click(byFixture("sn-reply-790"));
    const post = await storedPost();
    expect(post).toMatchObject({ mode: "reply", authorName: "Maya Lindqvist", text: expect.stringMatching(/^Boards ask/) });
    expect(post?.reply.targetAuthor).toBe("Maya Lindqvist");
    expect(post?.reply.targetText).toBe("Exactly why we stopped sending alert counts.");
    const thread = post?.reply.thread as Thread;
    expect(thread.map((e) => e.author)).toEqual(["Tom Okafor", "Maya Lindqvist"]);
    expect(thread[0].text).toBe("Dollars get budget. Alerts get ignored.");
    expect(thread[1]).toMatchObject({ isTarget: true, isPostAuthor: true });
    expect(post?.target).toMatchObject({ commentUrn: "activity:456,790", rootUrn: "activity:456,789" });
  });

  it("Insert in reply mode fills the box opened under the comment, never the post's own", async () => {
    await salesNavigatorPost();
    await click(byFixture("sn-reply-791"));
    byFixture("sn-comment-791").insertAdjacentHTML(
      "beforeend",
      '<div class="ql-editor" contenteditable="true" role="textbox" data-fixture="sn-reply-box"><p><br /></p></div>',
    );
    const target = (await storedPost())?.target;
    expect(await sendToContentScript({ type: INSERT, text: "Dollars lost per hour.", mode: "reply", target })).toEqual({ ok: true });
    expect(byFixture("sn-reply-box").textContent).toContain("Dollars lost per hour.");
    expect(byFixture("sn-comment-box").textContent).not.toContain("Dollars lost per hour.");
  });
});

describe("Sales Navigator's post frame", () => {
  it("captures a Comment click inside the frame, marked with the frame, and answers its Insert", async () => {
    asFrame();
    await salesNavigatorPost();
    await click(byFixture("sn-comment-button"));
    const target = (await storedPost())?.target as Record<string, unknown>;
    expect(target.frame).toBe(FRAME_PATH);
    expect(await sendToContentScript({ type: INSERT, text: "From the frame", mode: "comment", target })).toEqual({ ok: true });
    expect(byFixture("sn-comment-box").textContent).toContain("From the frame");
  });

  it("leaves everything else to the page: conversations, profiles, notes, messages, other captures", async () => {
    asFrame();
    await salesNavigatorPost();
    expect(await sendToContentScript({ type: PING_MESSAGE_TYPE })).toEqual({ ok: true });
    expect(await sendToContentScript({ type: READ_CONVERSATION_MESSAGE_TYPE })).toBeUndefined();
    expect(await sendToContentScript({ type: READ_SELF_PROFILE_MESSAGE_TYPE })).toBeUndefined();
    expect(await sendToContentScript({ type: INSERT, text: "Hi", mode: "connect" })).toBeUndefined();
    expect(await sendToContentScript({ type: INSERT, text: "Hi", mode: "message" })).toBeUndefined();
    const fromThePage = { captureId: "page", postKey: null, postUrn: "urn:li:activity:456" };
    expect(await sendToContentScript({ type: INSERT, text: "Not here", mode: "comment", target: fromThePage })).toBeUndefined();
    expect(byFixture("sn-comment-box").textContent).not.toContain("Not here");
  });

  it("any other LinkedIn frame: the script stays idle", async () => {
    asFrame();
    const { fetchMock } = await salesNavigatorPost("/preload/");
    expect(fetchMock).not.toHaveBeenCalled();
    await click(byFixture("sn-comment-button"));
    expect(await storedPost()).toBeUndefined();
    expect(await sendToContentScript({ type: PING_MESSAGE_TYPE })).toBeUndefined();
  });
});

describe("the page around a post frame", () => {
  const fromTheFrame = { captureId: "frame", postKey: null, postUrn: "urn:li:activity:456", frame: FRAME_PATH };
  const standIns: HTMLIFrameElement[] = [];

  function addFrameShowing(path: string): HTMLIFrameElement {
    const frame = document.createElement("iframe");
    // jsdom never loads a frame: stand in for the one LinkedIn loaded.
    Object.defineProperty(frame, "contentWindow", { get: () => ({ location: { pathname: path } }) });
    document.body.append(frame);
    standIns.push(frame);
    return frame;
  }

  // jsdom closes every frame's window when the test file ends, which a stand-in
  // can't do.
  afterEach(() => {
    for (const frame of standIns.splice(0)) frame.remove();
  });

  it("leaves a frame's capture to that frame while it shows the post, then says the post isn't open", async () => {
    loadFixture("feed.html", "/sales/home");
    await importContentScript({ config: SERVER_CONFIG });
    const frame = addFrameShowing(FRAME_PATH);
    expect(await sendToContentScript({ type: INSERT, text: "Hello", mode: "comment", target: fromTheFrame })).toBeUndefined();

    frame.remove();
    vi.useFakeTimers();
    try {
      const pending = sendToContentScript({ type: INSERT, text: "Hello", mode: "comment", target: fromTheFrame });
      await vi.advanceTimersByTimeAsync(2_100);
      const res = (await pending) as { ok: boolean; error: string };
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/isn't open in this tab/);
      expect(document.body.textContent).not.toContain("Hello");
    } finally {
      vi.useRealTimers();
    }
  });

  it("still answers its own captures with a post frame on the page", async () => {
    loadFixture("feed.html", "/feed/");
    await importContentScript({ config: SERVER_CONFIG });
    addFrameShowing(FRAME_PATH);
    await click(byFixture("post-2").querySelector("button[aria-label^='Comment']")!);
    const target = (await storedPost())?.target;
    expect(await sendToContentScript({ type: INSERT, text: "Page comment", mode: "comment", target })).toEqual({ ok: true });
    expect(byFixture("post-2-comment-box").textContent).toContain("Page comment");
  });
});
