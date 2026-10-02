import { describe, expect, it, vi } from "vitest";
import { byFixture, click, importContentScript, loadFixture, sendToContentScript, SERVER_CONFIG, storedPost } from "./helpers";

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

  it("never lands a comment in a chat pop-up's message box", async () => {
    await feed();
    byFixture("post-2-comment-box").remove();
    await sendToContentScript({ type: INSERT, text: "Congrats!", mode: "comment" });
    expect(byFixture("overlay-compose").textContent).toBe("");
  });

  it("says it couldn't reach CarouseLabs, instead of hanging, when the switch can't be checked", async () => {
    await feed();
    await click(commentButton("post-2"));
    // The connection stalls: no answer until the request is given up on.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
      ),
    );
    vi.useFakeTimers();
    try {
      const pending = sendToContentScript({ type: INSERT, text: "Congrats!", mode: "comment" });
      await vi.advanceTimersByTimeAsync(8_000);
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
