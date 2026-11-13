import { describe, expect, it, vi } from "vitest";
import { byFixture, click, importContentScript, loadFixture, sendToContentScript, SERVER_CONFIG, storedPost } from "./helpers";
import { chromeMock } from "../setup/chrome";

const INSERT = "carouselabs:insert-comment";

async function feed(config: Record<string, unknown> = SERVER_CONFIG) {
  loadFixture("feed.html", "/feed/");
  await importContentScript({ config });
}

function commentButton(postId: string) {
  return byFixture(postId).querySelector<HTMLButtonElement>("button[aria-label^='Comment']")!;
}

describe("capturing a post from its Comment button", () => {
  it("captures a text post's author, text, type and permalink", async () => {
    await feed();
    await click(commentButton("post-1"));
    const post = await storedPost();
    expect(post).toMatchObject({
      mode: "comment",
      authorName: "Jane Doe",
      type: "text",
      url: "https://www.linkedin.com/feed/update/urn:li:activity:111/",
    });
    expect(post!.text).toBe("Shipping small beats shipping big. Here’s what 3 years of weekly releases taught us.");
  });

  it("strips follower counts from a company author and classifies an image post", async () => {
    await feed();
    await click(commentButton("post-2"));
    expect(await storedPost()).toMatchObject({ authorName: "Acme Corp", type: "image" });
  });

  it("captures an image-only post with empty text rather than inventing some", async () => {
    await feed();
    await click(commentButton("post-3"));
    expect(await storedPost()).toMatchObject({ authorName: "Raj Patel", text: "", type: "image" });
  });

  it("still works on the built-in selectors when the config route is down", async () => {
    loadFixture("feed.html", "/feed/");
    await importContentScript({ configStatus: 503 });
    await click(commentButton("post-1"));
    expect(await storedPost()).toMatchObject({ authorName: "Jane Doe" });
  });

  it("ignores clicks that are not on a Comment control", async () => {
    await feed();
    await click(byFixture("post-1").querySelector("[data-testid='expandable-text-box']")!);
    expect(await storedPost()).toBeUndefined();
  });
});

describe("a post's pictures and videos", () => {
  const FEEDSHARE = "https://media.licdn.com/dms/image/v2/D4E22AQ/feedshare-shrink_800/0/1700000000000?e=1&v=beta&t=x";
  const COVER = "https://media.licdn.com/dms/image/v2/D4E05AQ/videocover-high/0/1700000000000?e=1&v=beta&t=y";

  it("sends the post's own pictures, never profile photos, logos or pictures in the comments", async () => {
    await feed();
    const post = byFixture("post-2");
    post.querySelector(".update-components-image img")!.setAttribute("src", FEEDSHARE);
    post.querySelector("[componentkey^='feed-header']")!.insertAdjacentHTML(
      "afterbegin",
      '<img src="https://media.licdn.com/dms/image/v2/C4D0BAQ/company-logo_100_100/0/1?e=1&t=z" alt="" />',
    );
    byFixture("comment-900").insertAdjacentHTML(
      "afterbegin",
      '<img src="https://media.licdn.com/dms/image/v2/D4E22AQ/feedshare-shrink_480/0/2?e=1&t=w" alt="" />',
    );
    await click(commentButton("post-2"));
    expect(await storedPost()).toMatchObject({ type: "image", images: [FEEDSHARE], video: false });
  });

  it("a video post: its cover frame, flagged as a video", async () => {
    await feed();
    byFixture("post-3").querySelector(".update-components-image")!.innerHTML = `<video poster="${COVER}"></video>`;
    await click(commentButton("post-3"));
    expect(await storedPost()).toMatchObject({ type: "video", images: [COVER], video: true });
  });

  it("only LinkedIn's own image servers, and at most six", async () => {
    await feed();
    const box = byFixture("post-3").querySelector(".update-components-image")!;
    box.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8]
      .map((n) => `<img src="https://media.licdn.com/dms/image/v2/X/feedshare-shrink_800/0/${n}" alt="" />`)
      .concat(['<img src="https://evil.example/feedshare-shrink_800/0/9" alt="" />'])
      .join("");
    await click(commentButton("post-3"));
    const post = await storedPost();
    expect(post!.images).toHaveLength(6);
    expect(post!.images.every((url: string) => url.startsWith("https://media.licdn.com/"))).toBe(true);
  });
});

describe("capturing a reply from a comment's Reply button", () => {
  it("captures the whole thread, marks the target, and knows the post author", async () => {
    await feed();
    await click(byFixture("comment-901").querySelector("button")!);
    const post = await storedPost();
    expect(post?.mode).toBe("reply");
    expect(post?.reply.targetAuthor).toBe("Acme Corp");
    expect(post?.reply.thread.map((e: { author: string }) => e.author)).toEqual(["Sam Lee", "Acme Corp"]);
    expect(post?.reply.thread.find((e: { isTarget: boolean }) => e.isTarget).text).toMatch(/±3h of CET/);
    expect(post?.reply.thread[1].isPostAuthor).toBe(true);
  });
});

describe("Insert into a reply box", () => {
  it("finds a reply box LinkedIn draws outside the comment, after it in the same post", async () => {
    await feed();
    await click(byFixture("comment-901").querySelector("button")!);
    // Outside both comments' wrappers, before the post's own box.
    byFixture("comment-900").insertAdjacentHTML(
      "afterend",
      '<div contenteditable="true" role="textbox" aria-label="Text editor for creating a reply" data-fixture="reply-box"><p><br /></p></div>',
    );
    const res = await sendToContentScript({ type: INSERT, text: "Thanks, that helps!", mode: "reply" });
    expect(res).toEqual({ ok: true });
    expect(byFixture("reply-box").textContent).toContain("Thanks, that helps!");
    // Never the post's own box: that would publish it as a new comment.
    expect(byFixture("post-2-comment-box").textContent).not.toContain("Thanks, that helps!");
  });

  it("with only the post's own box on the page, refuses rather than post a reply as a comment", async () => {
    await feed();
    await click(byFixture("comment-901").querySelector("button")!);
    const res = (await sendToContentScript({ type: INSERT, text: "Thanks!", mode: "reply" })) as { ok: boolean; error?: string };
    expect(res.ok).toBe(false);
    expect(byFixture("post-2-comment-box").textContent).not.toContain("Thanks!");
  });
});

describe("Insert into a comment box", () => {
  it("fills the captured post's comment box", async () => {
    await feed();
    await click(commentButton("post-2"));
    const res = await sendToContentScript({ type: INSERT, text: "Congrats on the hires 🎉", mode: "comment" });
    expect(res).toEqual({ ok: true });
    expect(byFixture("post-2-comment-box").textContent).toContain("Congrats on the hires 🎉");
  });

  it("refuses when this page never captured a post (panel is showing a stale capture)", async () => {
    await feed();
    const res = (await sendToContentScript({ type: INSERT, text: "Congrats!", mode: "comment" })) as { ok: boolean };
    expect(res.ok).toBe(false);
    expect(byFixture("post-2-comment-box").textContent).toBe("");
  });

  it("remembers which post a capture was for: its card's componentkey and permalink", async () => {
    await feed();
    await click(commentButton("post-2"));
    expect((await storedPost())?.target).toEqual({
      captureId: expect.any(String),
      postKey: "update-card-focusBBB222FeedType_MAIN_FEED",
      postUrn: "urn:li:activity:222",
    });
  });

  it("finds the post again after LinkedIn redraws its card", async () => {
    await feed();
    await click(commentButton("post-2"));
    const target = (await storedPost())?.target;
    const card = byFixture("post-2");
    card.replaceWith(card.cloneNode(true));
    const res = await sendToContentScript({ type: INSERT, text: "After the redraw", mode: "comment", target });
    expect(res).toEqual({ ok: true });
    expect(byFixture("post-2-comment-box").textContent).toContain("After the redraw");
  });

  it("puts a comment captured elsewhere (another tab) in its own post's box, never the post this page captured last", async () => {
    await feed();
    await click(commentButton("post-2"));
    const elsewhere = { ...((await storedPost())?.target as object), captureId: "another-tab" };
    // This page's own last capture is post 1, with a box of its own.
    const box1 = document.createElement("div");
    box1.setAttribute("contenteditable", "true");
    box1.setAttribute("role", "textbox");
    byFixture("post-1").append(box1);
    await click(commentButton("post-1"));

    const res = await sendToContentScript({ type: INSERT, text: "For post two", mode: "comment", target: elsewhere });
    expect(res).toEqual({ ok: true });
    expect(box1.textContent).toBe("");
    expect(byFixture("post-2-comment-box").textContent).toContain("For post two");
  });

  it("refuses, typing nowhere, when the post a comment was written for isn't on this page", async () => {
    await feed();
    const target = { captureId: "another-tab", postKey: "update-card-focusZZZ999FeedType_MAIN_FEED", postUrn: "urn:li:activity:999" };
    vi.useFakeTimers();
    try {
      const pending = sendToContentScript({ type: INSERT, text: "Lost", mode: "comment", target });
      await vi.advanceTimersByTimeAsync(2_100);
      const res = (await pending) as { ok: boolean; error: string };
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/isn't open in this tab/);
      expect(document.body.textContent).not.toContain("Lost");
    } finally {
      vi.useRealTimers();
    }
  });

  it("types one Insert once, however many times its message arrives", async () => {
    await feed();
    await click(commentButton("post-2"));
    const message = { type: INSERT, text: "Only once", mode: "comment", insertId: "click-1", target: (await storedPost())?.target };
    const answers = await Promise.all([sendToContentScript(message), sendToContentScript(message)]);
    expect(answers).toEqual([{ ok: true }, { ok: true }]);
    expect(byFixture("post-2-comment-box").textContent?.split("Only once").length).toBe(2);
  });

  it("never lands a comment in a chat pop-up's message box", async () => {
    await feed();
    byFixture("post-2-comment-box").remove();
    await sendToContentScript({ type: INSERT, text: "Congrats!", mode: "comment" });
    expect(byFixture("overlay-compose").textContent).toBe("");
  });

  // The connection stalls: no answer until the request is given up on.
  const stallFetch = () =>
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
      ),
    );

  it("still inserts when the connection stalls, using the switch the page read when it loaded", async () => {
    // Insert used to re-read the switch every time and refuse whenever that
    // failed: "Insert sometimes doesn't work".
    await feed();
    await click(commentButton("post-2"));
    stallFetch();
    const res = await sendToContentScript({ type: INSERT, text: "Congrats!", mode: "comment" });
    expect(res).toEqual({ ok: true });
    expect(byFixture("post-2-comment-box").textContent).toContain("Congrats!");
  });

  it("with no reading of the switch at all, says it couldn't reach CarouseLabs within 4s instead of hanging", async () => {
    loadFixture("feed.html", "/feed/");
    await importContentScript({ configStatus: 503 });
    await click(commentButton("post-2"));
    stallFetch();
    vi.useFakeTimers();
    try {
      const pending = sendToContentScript({ type: INSERT, text: "Congrats!", mode: "comment" });
      await vi.advanceTimersByTimeAsync(4_000);
      const res = (await pending) as { ok: boolean; error: string };
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Couldn't reach CarouseLabs/);
      expect(byFixture("post-2-comment-box").textContent).toBe("");
    } finally {
      vi.useRealTimers();
    }
  });

  it("honours the server kill switch at the moment of Insert", async () => {
    await feed({ ...SERVER_CONFIG, insertEnabled: false });
    await click(commentButton("post-2"));
    const res = (await sendToContentScript({ type: INSERT, text: "Congrats!", mode: "comment" })) as { ok: boolean };
    expect(res.ok).toBe(false);
    expect(byFixture("post-2-comment-box").textContent).toBe("");
  });

  it("keeps a comment the user already started, adding the new text after it", async () => {
    await feed();
    await click(commentButton("post-2"));
    byFixture("post-2-comment-box").innerHTML = "<p>Love this.</p>";
    await sendToContentScript({ type: INSERT, text: "Congrats on the hires", mode: "comment" });
    const text = byFixture("post-2-comment-box").textContent ?? "";
    expect(text).toContain("Love this.");
    expect(text.indexOf("Love this.")).toBeLessThan(text.indexOf("Congrats on the hires"));
  });
});

describe("messages the content script does not own", () => {
  it("leaves unrelated messages unanswered so other listeners can respond", async () => {
    await feed();
    expect(await sendToContentScript({ type: "something-else" })).toBeUndefined();
    expect(await sendToContentScript({ type: INSERT, text: 42 })).toBeUndefined();
  });
});

// A Comment click is read with the selectors at hand. Waiting for the config
// route made Comment seem to do nothing on a slow connection, and lost the
// click when LinkedIn redrew the button meanwhile.
describe("a Comment click never waits for the network", () => {
  it("is captured at once while the config route hasn't answered", async () => {
    loadFixture("feed.html", "/feed/");
    await importContentScript({ configHangs: true });
    await click(commentButton("post-1"));
    expect(await storedPost()).toMatchObject({ mode: "comment", authorName: "Jane Doe" });
  });

  it("uses the selectors the last page got from the server until this page's arrive", async () => {
    loadFixture("feed.html", "/feed/");
    const button = commentButton("post-1");
    button.removeAttribute("aria-label");
    button.textContent = "Discuss"; // matches no built-in rule
    button.classList.add("feed-comment-action");
    chromeMock().__store.contentScriptConfig = { ...SERVER_CONFIG, commentButtonSelector: "button.feed-comment-action" };
    await importContentScript({ configHangs: true });
    await click(button);
    expect(await storedPost()).toMatchObject({ mode: "comment", authorName: "Jane Doe" });
  });

  it("keeps what the server sent for next time, and fills in a key it left out", async () => {
    const { commentButtonSelector: _left, ...partial } = SERVER_CONFIG;
    await feed(partial);
    expect(chromeMock().__store.contentScriptConfig).toMatchObject({
      postContainerSelector: SERVER_CONFIG.postContainerSelector,
      commentButtonSelector: expect.stringContaining("button[aria-label^='Comment']"),
    });
    await click(commentButton("post-2"));
    expect(await storedPost()).toMatchObject({ authorName: "Acme Corp" });
  });
});

describe("telling a Comment button apart", () => {
  it("counts a button that says just “Comment” even without the expected label", async () => {
    loadFixture("feed.html", "/feed/");
    const button = commentButton("post-1");
    button.removeAttribute("aria-label");
    await importContentScript({ config: SERVER_CONFIG });
    await click(button);
    expect(await storedPost()).toMatchObject({ mode: "comment", authorName: "Jane Doe" });
  });

  it("never takes the comment box's own “Comment” (post) button for one", async () => {
    await feed();
    const form = document.createElement("form");
    form.innerHTML = '<button type="submit">Comment</button>';
    byFixture("post-2").append(form);
    await click(form.querySelector("button")!);
    expect(await storedPost()).toBeUndefined();
  });
});

describe("a Comment click whose post can't be found", () => {
  it("is recorded for the panel (when, and nothing from the page) instead of being dropped silently", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await feed();
    const stray = document.createElement("button");
    stray.setAttribute("aria-label", "Comment");
    document.querySelector("main")!.append(stray); // outside every post card, on a page of several
    await click(stray);
    expect(await storedPost()).toBeUndefined();
    expect(chromeMock().__store.lastCaptureFailure).toEqual({ mode: "comment", at: expect.any(Number) });
  });
});

// A video post's whole file, for the panel to have watched (src/lib/postVideo.ts).
describe("a video post's file", () => {
  const COVER = "https://media.licdn.com/dms/image/v2/D4E05AQabcdefghij/videocover-high/0/1700000000000?e=1&v=beta&t=y";
  const MP4 = (p: number) => `https://dms.licdn.com/playlist/vid/v2/D4E05AQabcdefghij/mp4-${p}p-30fp-crf28/0/1700000000000?e=1&v=beta&t=z`;
  async function capture(html: string) {
    await feed();
    byFixture("post-3").querySelector(".update-components-image")!.innerHTML = html;
    await click(commentButton("post-3"));
    return storedPost();
  }

  it("the smallest whole MP4 the player lists", async () => {
    const sources = JSON.stringify([
      { src: MP4(720), type: "video/mp4" },
      { src: MP4(360), type: "video/mp4" },
      { src: MP4(540), type: "video/mp4" },
    ]).replace(/"/g, "&quot;");
    expect(await capture(`<video poster="${COVER}" data-sources="${sources}"></video>`)).toMatchObject({
      type: "video",
      video: true,
      images: [COVER],
      videoUrl: MP4(360),
    });
  });

  it("a file played straight from src", async () => {
    expect(await capture(`<video poster="${COVER}" src="${MP4(720)}"></video>`)).toMatchObject({ videoUrl: MP4(720) });
  });

  it("a file in a <source>", async () => {
    expect(await capture(`<video poster="${COVER}"><source src="${MP4(540)}" type="video/mp4" /></video>`)).toMatchObject({
      videoUrl: MP4(540),
    });
  });

  it.each([
    ["streamed in pieces", `<video poster="${COVER}" src="blob:https://www.linkedin.com/1234"></video>`],
    ["a playlist", `<video poster="${COVER}"><source src="https://dms.licdn.com/playlist/vid/v2/X/master.m3u8" /></video>`],
    ["another site", `<video poster="${COVER}" src="https://evil.example/playlist/vid/v2/X/mp4-360p/0/1"></video>`],
    ["a broken list", `<video poster="${COVER}" data-sources="[{oops"></video>`],
  ])("none when there's no whole file to read: %s", async (_name, html) => {
    const post = await capture(html);
    expect(post).toMatchObject({ video: true, images: [COVER] });
    expect(post!.videoUrl).toBeUndefined();
  });

  it("never a video inside the comments", async () => {
    await feed();
    byFixture("comment-900").insertAdjacentHTML("afterbegin", `<video src="${MP4(360)}"></video>`);
    await click(commentButton("post-2"));
    const post = await storedPost();
    expect(post!.videoUrl).toBeUndefined();
    expect(post).toMatchObject({ type: "image", video: false });
  });
});

// Whether the post is the person's own, and its id: the panel offers a saved
// comment the first time a post is opened (src/lib/savedComments.ts).
describe("whose post it is", () => {
  it("someone else's post, with its permalink id", async () => {
    await feed();
    await click(commentButton("post-1"));
    expect(await storedPost()).toMatchObject({ authorName: "Jane Doe", isOwnPost: false, postUrn: "urn:li:activity:111" });
  });

  it("your own post when its author is the signed-in member", async () => {
    await feed();
    document.querySelector("#global-nav img")!.setAttribute("alt", "Jane Doe");
    await click(commentButton("post-1"));
    expect(await storedPost()).toMatchObject({ authorName: "Jane Doe", isOwnPost: true });
  });
});
