// The Reddit extension's Home, run as the Reddit build: a captured comment
// (or post) shows with its subreddit and thread; the comment is written in
// the chosen Reddit profile with everything the page gave (rules, thread, top
// comments); Insert goes only to the box for that comment or post; Shorter /
// Longer use Reddit's own route.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.hoisted(() => {
  // Before any import reads it: this is the Reddit extension's build.
  (import.meta.env as Record<string, string>).VITE_ENGAGE_PLATFORM = "reddit";
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { RedditHomeScreen } from "@/reddit/sidepanel/screens/RedditHomeScreen";
import { REDDIT_INSERT_MESSAGE_TYPE, REDDIT_LAST_TARGET_STORAGE_KEY, type RedditCapturedTarget } from "@/reddit/lib/redditPost";
import { chromeMock } from "../setup/chrome";

const HELPFUL = {
  id: "sys-reddit-helpful",
  name: "CarouseLabs — Reddit Helpful",
  tone: "Friendly and down to earth",
  length: "120-500 characters",
  isDefault: true,
  isSystem: true,
  isRecommended: true,
};
const CASUAL = { ...HELPFUL, id: "sys-reddit-casual", name: "CarouseLabs — Reddit Casual", isDefault: false };
const POST_URL = "https://www.reddit.com/r/startups/comments/p001/how_do_you_price/";
const COMMENT_URL = "https://www.reddit.com/r/startups/comments/p001/comment/c002/";

const captured = (overrides: Partial<RedditCapturedTarget> = {}): RedditCapturedTarget => ({
  capturedAt: 1,
  subreddit: "r/startups",
  rules: [{ title: "No self-promotion", text: "No links to your own product." }],
  post: { title: "How do you price a first product?", author: "founder_jane", text: "We have ten users.", url: POST_URL, flair: "", kind: "text" },
  postId: "t3_p001",
  replyTo: { author: "asker", text: "What did you charge at first?", url: COMMENT_URL },
  replyToId: "t1_c002",
  chain: [{ author: "top_user", text: "Charge more than you think.", url: "" }],
  others: [],
  isOwnPost: false,
  ...overrides,
});

const COMMENT = "We started at a price that felt too high, and almost nobody pushed back.";
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

type Call = { url: string; body: Record<string, unknown> | null };
let calls: Call[] = [];

function server() {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, body });
      if (url.endsWith("/api/ext/reddit/comment")) {
        return new Response(
          frame("start", {}) + frame("text", { text: COMMENT.slice(0, 20) }) +
            frame("final", { comment: COMMENT, freeRemaining: null, historyId: "h1", length: COMMENT.length, maxLength: 500 }),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      }
      if (url.endsWith("/api/ext/reddit/rewrite")) return json({ comment: "Shorter one.", freeRemaining: null });
      if (url.endsWith("/api/ext/reddit/profiles")) return json({ profiles: [HELPFUL, CASUAL], defaultProfileId: null });
      if (url.endsWith("/api/ext/reddit/settings")) return json({ insertButtonHidden: false, defaultProfileId: null });
      if (url.endsWith("/api/ext/me")) return json({ extension: null });
      if (url.includes("/api/ext/config")) return json({ insertEnabled: true });
      return json({});
    }),
  );
}

const box = (noun: "reply" | "comment") => screen.getByRole("textbox", { name: `Your ${noun}` }) as HTMLTextAreaElement;

async function write(label: "Write reply" | "Write comment") {
  const button = await screen.findByRole("button", { name: label });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
}

beforeEach(() => {
  calls = [];
  Object.assign(chromeMock().__store, { extensionToken: "cl_cmt_reddit" });
  (chromeMock().tabs.query as Mock).mockResolvedValue([{ id: 7, url: POST_URL }]);
  (chromeMock().tabs.sendMessage as Mock).mockResolvedValue({ ok: true });
  server();
});

afterAll(() => {
  // Back to the LinkedIn build for any test file that runs after this one.
  delete (import.meta.env as Record<string, string | undefined>).VITE_ENGAGE_PLATFORM;
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  delete chromeMock().__store[REDDIT_LAST_TARGET_STORAGE_KEY];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Reddit Home", () => {
  it("says what to do until Reply is clicked, and offers to open Reddit off it", async () => {
    render(<RedditHomeScreen />);
    expect(await screen.findByText("Pick a post on Reddit")).toBeTruthy();
    cleanup();
    (chromeMock().tabs.query as Mock).mockImplementation(async (info: chrome.tabs.QueryInfo) => (info.url ? [] : [{ id: 7, url: undefined }]));
    render(<RedditHomeScreen />);
    expect(await screen.findByText("Open Reddit to start")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Open Reddit/ }));
    await waitFor(() => expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: "https://www.reddit.com/" }));
  });

  it("shows the comment being answered and writes a reply with everything the page gave", async () => {
    chromeMock().__store[REDDIT_LAST_TARGET_STORAGE_KEY] = captured();
    render(<RedditHomeScreen />);
    expect(await screen.findByText("Replying to a comment in r/startups")).toBeTruthy();
    expect(screen.getByText("u/asker")).toBeTruthy();
    expect(screen.getByText("What did you charge at first?")).toBeTruthy();
    expect(screen.getByText("In a thread with 1 comment above it")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Reddit profile" }).textContent).toContain("Reddit Helpful"));

    await write("Write reply");
    await waitFor(() => expect(box("reply").value).toBe(COMMENT));
    const sent = calls.find((c) => c.url.endsWith("/api/ext/reddit/comment"))!.body!;
    expect(sent).toMatchObject({
      profileId: HELPFUL.id,
      subreddit: "r/startups",
      rules: [{ title: "No self-promotion", text: "No links to your own product." }],
      post: { title: "How do you price a first product?", url: POST_URL },
      replyTo: { author: "asker", url: COMMENT_URL },
      chain: [{ author: "top_user" }],
      isOwnPost: false,
    });
    expect(screen.getByText(`${COMMENT.length} characters`)).toBeTruthy();
  });

  it("writes a comment on the post itself, with its top comments", async () => {
    chromeMock().__store[REDDIT_LAST_TARGET_STORAGE_KEY] = captured({
      replyTo: null,
      replyToId: null,
      chain: [],
      others: [{ author: "someone", text: "Charge more.", url: "" }],
    });
    render(<RedditHomeScreen />);
    expect(await screen.findByText("Commenting on a post in r/startups")).toBeTruthy();
    expect(screen.getByText("How do you price a first product?")).toBeTruthy();
    await write("Write comment");
    await waitFor(() => expect(box("comment").value).toBe(COMMENT));
    const sent = calls.find((c) => c.url.endsWith("/api/ext/reddit/comment"))!.body!;
    expect(sent).toMatchObject({ replyTo: null, others: [{ text: "Charge more." }] });
  });

  it("inserts only into the box for that comment, and records it", async () => {
    chromeMock().__store[REDDIT_LAST_TARGET_STORAGE_KEY] = captured();
    render(<RedditHomeScreen />);
    await write("Write reply");
    await waitFor(() => expect(box("reply").value).toBe(COMMENT));
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    await waitFor(() =>
      expect(chromeMock().tabs.sendMessage).toHaveBeenCalledWith(7, {
        type: REDDIT_INSERT_MESSAGE_TYPE,
        text: COMMENT,
        expect: { postId: "t3_p001", replyToId: "t1_c002" },
        insertId: expect.any(String),
      }),
    );
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/ext/history/h1") && c.body?.action === "INSERTED")).toBe(true));
  });

  it("uses Reddit's own Shorter / Longer and Insert switch", async () => {
    chromeMock().__store[REDDIT_LAST_TARGET_STORAGE_KEY] = captured();
    render(<RedditHomeScreen />);
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/ext/config?platform=reddit"))).toBe(true));
    await write("Write reply");
    await waitFor(() => expect(box("reply").value).toBe(COMMENT));
    fireEvent.click(screen.getByRole("button", { name: "Shorter" }));
    await waitFor(() => expect(box("reply").value).toBe("Shorter one."));
    expect(calls.find((c) => c.url.endsWith("/api/ext/reddit/rewrite"))!.body).toMatchObject({ direction: "shorter", historyId: "h1" });
  });
});
