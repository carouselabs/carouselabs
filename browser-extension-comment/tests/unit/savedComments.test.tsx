// Saved comments on the Write screen (src/lib/savedComments.ts,
// src/sidepanel/components/SavedComments.tsx): the list with one-tap Insert
// and Copy, Save on a comment Engage wrote, writing a new one, and the
// reminder the first time a post is opened — on your own posts or on any,
// once per post, never again after.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { markReminded, postKey, remindedPosts, remindersFor, type SavedComment } from "@/lib/savedComments";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { chromeMock } from "../setup/chrome";

const PROFILE = { id: "p1", name: "Thoughtful Expert", tone: "Professional", isDefault: true, isSystem: true, isRecommended: false };
const ME = {
  defaultCommentProfileId: "p1",
  commentsToday: 0,
  insertWarningHidden: false,
  extension: { access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null },
};

function savedComment(over: Partial<SavedComment> & { id: string; body: string }): SavedComment {
  return {
    title: over.body.split("\n")[0],
    tags: [],
    favorite: false,
    remindOn: "own",
    useCount: 0,
    lastUsedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...over,
  };
}

const PINNED = savedComment({ id: "s1", title: "Pinned newsletter", body: "Thanks for watching!\nJoin my newsletter: https://example.com", favorite: true });
const ANY = savedComment({ id: "s2", title: "Great point", body: "Great point, saving this one.", remindOn: "any" });
const QUIET = savedComment({ id: "s3", title: "Quiet one", body: "Never offered by itself.", remindOn: "off" });

function post(over: Record<string, unknown> = {}) {
  return {
    mode: "comment",
    authorName: "Anant Goyal",
    authorHeadline: "Founder",
    text: "New video: how we ship every Friday.",
    type: "video",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7001/",
    postUrn: "urn:li:activity:7001",
    capturedAt: 100,
    isOwnPost: true,
    target: { captureId: "c1", postKey: "k1", postUrn: "urn:li:activity:7001" },
    ...over,
  };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function server(list: SavedComment[]) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method, body });
    if (url.endsWith("/api/ext/saved-comments") && method === "GET") return json({ savedComments: list });
    if (url.endsWith("/api/ext/saved-comments") && method === "POST") {
      return json(
        { savedComment: savedComment({ id: `new${calls.length}`, body: body.body, title: body.title || body.body.split("\n")[0], remindOn: body.remindOn ?? "own" }) },
        201,
      );
    }
    if (url.includes("/api/ext/saved-comments/") && method === "PATCH") {
      const id = url.split("/").at(-1)!;
      const row = list.find((c) => c.id === id)!;
      return json({ savedComment: { ...row, ...body } });
    }
    if (url.includes("/api/ext/saved-comments/") && url.endsWith("/use")) return json({ ok: true });
    if (url.includes("/api/ext/saved-comments/") && method === "DELETE") return json({ ok: true });
    if (url.endsWith("/api/ext/generate")) {
      return new Response(`event: final\ndata: ${JSON.stringify({ comment: "A comment Engage wrote.", freeRemaining: null, historyId: "h1" })}\n\n`, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    if (url.endsWith("/api/ext/profiles")) return json({ profiles: [PROFILE] });
    if (url.endsWith("/api/ext/me")) return json(ME);
    if (url.endsWith("/api/ext/config")) return json({ insertEnabled: true });
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

async function renderReady() {
  render(<HomeScreen onCreateProfile={() => {}} />);
  const generate = await screen.findByRole("button", { name: "Generate" });
  await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
}

const insertsSent = () =>
  (chromeMock().tabs.sendMessage as unknown as Mock).mock.calls
    .map(([, message]) => message as { type?: string; text?: string; mode?: string; target?: unknown })
    .filter((m) => m.type === "carouselabs:insert-comment");

beforeEach(() => {
  const chrome = chromeMock();
  (chrome.tabs.query as unknown as Mock).mockResolvedValue([{ id: 5, url: "https://www.linkedin.com/feed/" }]);
  (chrome.tabs.sendMessage as unknown as Mock).mockResolvedValue({ ok: true });
  chrome.__store.extensionToken = "cl_cmt_abc";
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("which posts get a reminder", () => {
  it("one key per post however it was reached; the feed is no post", () => {
    expect(postKey("urn:li:activity:7001")).toBe("activity:7001");
    expect(postKey("https://www.linkedin.com/feed/update/urn:li:activity:7001/?utm=x")).toBe("activity:7001");
    expect(postKey("https://www.linkedin.com/posts/anant_ship-ugcPost-7002-abc")).toBe("www.linkedin.com/posts/anant_ship-ugcPost-7002-abc");
    expect(postKey("https://www.linkedin.com/feed/")).toBeNull();
    expect(postKey("https://evil.example/feed/update/x")).toBeNull();
    expect(postKey(undefined)).toBeNull();
  });

  it("own: only on your own posts; any: everywhere; off: never", () => {
    const list = [PINNED, ANY, QUIET];
    expect(remindersFor(list, { isOwnPost: true }).map((c) => c.id)).toEqual(["s1", "s2"]);
    expect(remindersFor(list, { isOwnPost: false }).map((c) => c.id)).toEqual(["s2"]);
    expect(remindersFor(list, { isOwnPost: null }).map((c) => c.id)).toEqual(["s2"]);
  });

  it("remembers the posts it reminded on, keeping the newest thousand", async () => {
    for (let i = 0; i < 1002; i++) await markReminded(`activity:${i}`);
    const seen = await remindedPosts();
    expect(seen.size).toBe(1000);
    expect(seen.has("activity:0")).toBe(false);
    expect(seen.has("activity:1001")).toBe(true);
  });
});

describe("the saved comments list", () => {
  it("lists them; Insert puts one into this post's box exactly as written and counts it", async () => {
    chromeMock().__store.lastSelectedPost = post({ isOwnPost: false });
    const calls = server([PINNED, QUIET]);
    await renderReady();

    const section = (await screen.findByText("Saved comments")).closest("section")!;
    await waitFor(() => expect(within(section).getByText("Pinned newsletter")).toBeTruthy());
    expect(within(section).getByText("(2)")).toBeTruthy();

    fireEvent.click(within(section).getByRole("button", { name: "Insert: Pinned newsletter" }));
    await waitFor(() => expect(insertsSent()).toHaveLength(1));
    expect(insertsSent()[0]).toMatchObject({ text: PINNED.body, mode: "comment", target: post().target });
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/ext/saved-comments/s1/use") && c.method === "POST")).toBe(true));
  });

  it("Copy puts it on the clipboard; without a post picked there's no Insert", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    chromeMock().__store.lastSelectedPost = undefined;
    server([PINNED]);
    render(<HomeScreen onCreateProfile={() => {}} />);

    const copy = await screen.findByRole("button", { name: "Copy: Pinned newsletter" });
    expect(screen.queryByRole("button", { name: "Insert: Pinned newsletter" })).toBeNull();
    expect(screen.getByText("Click Comment under a post on LinkedIn to insert one there.")).toBeTruthy();
    fireEvent.click(copy);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(PINNED.body));
    expect(await screen.findByRole("button", { name: "Copy: Pinned newsletter" })).toBeTruthy();
    expect(screen.getByText("Copied")).toBeTruthy();
  });

  it("a list that can't be loaded says so quietly, not as an alert, and loads on Try again", async () => {
    chromeMock().__store.lastSelectedPost = post({ isOwnPost: false });
    server([PINNED]);
    const working = globalThis.fetch as unknown as Mock;
    let failing = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) =>
        failing && url.endsWith("/api/ext/saved-comments") ? json({ error: "Not found" }, 404) : working(url, init),
      ),
    );
    await renderReady();
    expect(await screen.findByText("Couldn't load your saved comments.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    failing = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Pinned newsletter")).toBeTruthy();
  });

  it("writes a new one, which then shows in the list", async () => {
    chromeMock().__store.lastSelectedPost = post({ isOwnPost: false });
    const calls = server([]);
    await renderReady();

    fireEvent.click(await screen.findByRole("button", { name: "New saved comment" }));
    const form = screen.getByRole("form", { name: "New saved comment" });
    fireEvent.change(within(form).getByLabelText("Comment"), { target: { value: "Thanks for being here!" } });
    fireEvent.click(within(form).getByText("Every post"));
    fireEvent.click(within(form).getByRole("button", { name: "Save comment" }));

    await waitFor(() => expect(screen.getByText("Thanks for being here!", { selector: "span" })).toBeTruthy());
    const created = calls.find((c) => c.method === "POST" && c.url.endsWith("/api/ext/saved-comments"));
    expect(created?.body).toEqual({ title: "", body: "Thanks for being here!", remindOn: "any" });
  });

  it("stars, and deletes only after asking", async () => {
    chromeMock().__store.lastSelectedPost = post({ isOwnPost: false });
    const calls = server([PINNED, QUIET]);
    await renderReady();

    fireEvent.click(await screen.findByRole("button", { name: "Add to favorites: Quiet one" }));
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ favorite: true }));

    fireEvent.click(screen.getByRole("button", { name: "Delete: Pinned newsletter" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/s1"))).toBe(true));
    await waitFor(() => expect(screen.queryByText("Pinned newsletter")).toBeNull());
  });
});

describe("Save on a comment Engage wrote", () => {
  it("on your own post: saved to be offered on your posts; the button then says Saved", async () => {
    chromeMock().__store.lastSelectedPost = post({ isOwnPost: true, postUrn: "urn:li:activity:9" });
    await markReminded("activity:9");
    const calls = server([]);
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    const save = await screen.findByRole("button", { name: "Save to your saved comments" });
    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(save);

    await waitFor(() => expect(screen.getByRole("button", { name: "Saved to your saved comments" })).toBeTruthy());
    expect(calls.find((c) => c.method === "POST" && c.url.endsWith("/api/ext/saved-comments"))?.body).toEqual({
      body: "A comment Engage wrote.",
      remindOn: "own",
    });
  });

  it("on someone else's post: saved without a reminder", async () => {
    chromeMock().__store.lastSelectedPost = post({ isOwnPost: false });
    const calls = server([]);
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    const save = await screen.findByRole("button", { name: "Save to your saved comments" });
    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/api/ext/saved-comments"))).toBe(true));
    expect(calls.find((c) => c.method === "POST" && c.url.endsWith("/api/ext/saved-comments"))?.body).toMatchObject({ remindOn: "off" });
  });
});

describe("the first time a post is opened", () => {
  it("your own post: your usual comment is offered, ready to insert, with how to pin it", async () => {
    chromeMock().__store.lastSelectedPost = post();
    const calls = server([PINNED, ANY, QUIET]);
    await renderReady();

    const reminder = await screen.findByRole("region", { name: "Your usual comment" });
    expect(within(reminder).getByText("First time on this post")).toBeTruthy();
    expect(within(reminder).getByText(/Thanks for watching!/)).toBeTruthy();
    expect(within(reminder).getByText(/choose Pin/)).toBeTruthy();
    // The other one set to remind can be picked instead; the quiet one isn't offered.
    expect(within(reminder).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Pinned newsletter", "Great point"]);

    fireEvent.click(within(reminder).getByRole("button", { name: "Insert" }));
    await waitFor(() => expect(insertsSent()[0]).toMatchObject({ text: PINNED.body, mode: "comment" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Your usual comment" })).toBeNull());
    expect(calls.some((c) => c.url.endsWith("/s1/use"))).toBe(true);
  });

  it("only the first time: the same post opened again gets no reminder", async () => {
    chromeMock().__store.lastSelectedPost = post();
    server([PINNED]);
    await renderReady();
    await screen.findByRole("region", { name: "Your usual comment" });
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    cleanup();

    chromeMock().__store.lastSelectedPost = post({ capturedAt: 200 });
    server([PINNED]);
    await renderReady();
    await screen.findByText("Pinned newsletter", { selector: "span" });
    expect(screen.queryByRole("region", { name: "Your usual comment" })).toBeNull();
  });

  it("someone else's post: only comments set to every post", async () => {
    chromeMock().__store.lastSelectedPost = post({ isOwnPost: false, postUrn: "urn:li:activity:8001", url: "https://www.linkedin.com/feed/" });
    server([PINNED, ANY]);
    await renderReady();
    const reminder = await screen.findByRole("region", { name: "Your usual comment" });
    expect(within(reminder).getByText("Great point, saving this one.")).toBeTruthy();
    expect(within(reminder).queryByText(/choose Pin/)).toBeNull();
  });

  it("nothing set to remind, a reply, or no way to tell the post apart: no reminder", async () => {
    for (const selected of [
      post({ isOwnPost: false, postUrn: "urn:li:activity:8101" }),
      post({ mode: "reply", postUrn: "urn:li:activity:8102", reply: { thread: [], targetText: "Nice", targetAuthor: "Sam", isOwnPost: true } }),
      post({ postUrn: null, url: "https://www.linkedin.com/feed/" }),
    ]) {
      chromeMock().__store.lastSelectedPost = selected;
      server([PINNED]);
      render(<HomeScreen onCreateProfile={() => {}} />);
      await screen.findByText("Pinned newsletter", { selector: "span" });
      await new Promise((r) => setTimeout(r, 20));
      expect(screen.queryByRole("region", { name: "Your usual comment" })).toBeNull();
      cleanup();
    }
  });
});
