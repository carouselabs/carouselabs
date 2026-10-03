// The X extension's Reply screen, run as the X build: a captured post shows
// with its author, handle, media and quote; the reply is written in the
// chosen X profile and counted the way X counts; Copy, Insert (into the reply
// box for that post only), Stop and "Rewrite with" behave as on LinkedIn.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.hoisted(() => {
  // Before any import reads it: this is the X extension's build.
  (import.meta.env as Record<string, string>).VITE_ENGAGE_PLATFORM = "x";
});

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { XHomeScreen } from "@/x/sidepanel/screens/XHomeScreen";
import { X_INSERT_MESSAGE_TYPE, X_LAST_POST_STORAGE_KEY, type XCapturedPost } from "@/x/lib/xPost";
import { chromeMock } from "../setup/chrome";

const THOUGHTFUL = { id: "sys-x-thoughtful-reply", name: "CarouseLabs — X Thoughtful Reply", tone: "Conversational", length: "80-220 characters", isDefault: true, isSystem: true, isRecommended: true };
const QUICK = { id: "sys-x-quick-reply", name: "CarouseLabs — X Quick Reply", tone: "Casual", length: "20-100 characters", isDefault: false, isSystem: true, isRecommended: true };
const POST_URL = "https://x.com/priya/status/1840000000000000001";
const captured = (capturedAt = 1, author = "Priya Raman"): XCapturedPost => ({
  capturedAt,
  post: { author, handle: "priya", text: "We cut onboarding from 14 steps to 5. Activation went from 31% to 48%.", url: POST_URL, media: ["image"] },
  thread: [{ author: "Sam Lee", handle: "samlee", text: "What changed first?", url: "", media: [] }],
  quoted: { author: "Growth Weekly", handle: "growthweekly", text: "Onboarding benchmarks for 2026", url: "", media: [] },
  isOwnPost: false,
});
const REPLY = "Moving the invite step after the first win is the part most teams miss.";
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

type Call = { url: string; body: Record<string, unknown> | null; signal?: AbortSignal | null };
let calls: Call[] = [];
let replyBody: (body: Record<string, unknown>) => string = () => REPLY;
let hangReply = false;
// Shorter / Longer: what the rewrite returns, and a gate to hold it back.
let rewritten = "Invite after the first win.";
let rewriteGate: Promise<void> | null = null;

function server() {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, body, signal: init?.signal });
      if (url.endsWith("/api/ext/x/reply")) {
        if (hangReply) {
          return new Promise<Response>((_, reject) =>
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
          );
        }
        const text = replyBody(body!);
        return new Response(
          frame("start", {}) + frame("text", { text: text.slice(0, 20) }) +
            frame("final", { comment: text, freeRemaining: null, historyId: "h1", length: text.length, maxLength: 280 }),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      }
      if (url.endsWith("/api/ext/x/rewrite")) {
        if (rewriteGate) await rewriteGate;
        return json({ comment: rewritten, freeRemaining: null });
      }
      if (url.endsWith("/api/ext/x/profiles")) return json({ profiles: [THOUGHTFUL, QUICK], defaultProfileId: null });
      if (url.endsWith("/api/ext/x/settings")) return json({ maxReplyLength: 280, insertButtonHidden: false, defaultProfileId: null });
      if (url.endsWith("/api/ext/me")) return json({ extension: null });
      if (url.endsWith("/api/ext/config")) return json({ insertEnabled: true });
      return json({});
    }),
  );
}

const replyBox = () => screen.getByRole("textbox", { name: "Your reply" }) as HTMLTextAreaElement;

async function writeReply() {
  const write = await screen.findByRole("button", { name: "Write reply" });
  await waitFor(() => expect((write as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(write);
}

beforeEach(() => {
  calls = [];
  replyBody = () => REPLY;
  hangReply = false;
  rewritten = "Invite after the first win.";
  rewriteGate = null;
  Object.assign(chromeMock().__store, { extensionToken: "cl_cmt_x" });
  (chromeMock().tabs.query as Mock).mockResolvedValue([{ id: 4, url: POST_URL }]);
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("X Reply screen", () => {
  it("says what to do until Reply is clicked, and offers to open X off it", async () => {
    render(<XHomeScreen />);
    expect(await screen.findByText("Pick a post on X")).toBeTruthy();
    cleanup();
    (chromeMock().tabs.query as Mock).mockResolvedValue([{ id: 4, url: undefined }]);
    render(<XHomeScreen />);
    expect(await screen.findByText("Open X to start")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Open X/ }));
    expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: "https://x.com/home" });
  });

  it("shows the captured post and writes a reply in the default X profile, sending the whole context", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    render(<XHomeScreen />);
    expect(await screen.findByText("Priya Raman")).toBeTruthy();
    expect(screen.getByText("@priya")).toBeTruthy();
    expect(screen.getByText("Image")).toBeTruthy();
    expect(screen.getByText("Quotes @growthweekly")).toBeTruthy();
    expect(screen.getByText("In a conversation with 1 post above it")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "X profile" }).textContent).toContain("X Thoughtful Reply"));

    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(REPLY));
    const sent = calls.find((c) => c.url.endsWith("/api/ext/x/reply"))!.body!;
    expect(sent).toMatchObject({ profileId: THOUGHTFUL.id, post: { handle: "priya", url: POST_URL }, isOwnPost: false });
    expect((sent.thread as unknown[]).length).toBe(1);
    expect(sent.quoted).toMatchObject({ handle: "growthweekly" });
    expect(screen.getByText(`${REPLY.length}/280`)).toBeTruthy();
  });

  it("counts the way X does and blocks Insert when the reply is too long", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    render(<XHomeScreen />);
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(REPLY));
    // 260 letters and a link: 260 + 1 + 23 = 284 as X counts it.
    fireEvent.change(replyBox(), { target: { value: `${"a".repeat(260)} https://example.com/${"b".repeat(80)}` } });
    expect(screen.getByText("284/280")).toBeTruthy();
    expect(screen.getByText(/Too long for X/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Insert" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("inserts into the reply box for that post only, and records it", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    render(<XHomeScreen />);
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(REPLY));
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    await waitFor(() =>
      expect(chromeMock().tabs.sendMessage).toHaveBeenCalledWith(4, { type: X_INSERT_MESSAGE_TYPE, text: REPLY, expect: { postUrl: POST_URL } }),
    );
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/ext/history/h1") && c.body?.action === "INSERTED")).toBe(true));
  });

  it("shows the page's refusal when the reply box is for another post", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    (chromeMock().tabs.sendMessage as Mock).mockResolvedValue({ ok: false, error: "This reply was written for a different post. Click Reply on it again." });
    render(<XHomeScreen />);
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(REPLY));
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect(await screen.findByText(/written for a different post/)).toBeTruthy();
  });

  it("Stop ends a slow reply; a new post cancels the old one's", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    hangReply = true;
    render(<XHomeScreen />);
    await writeReply();
    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));
    const first = calls.find((c) => c.url.endsWith("/api/ext/x/reply"))!;
    expect(first.signal?.aborted).toBe(true);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).toBeNull());

    await writeReply();
    await screen.findByRole("button", { name: "Stop" });
    const second = calls.filter((c) => c.url.endsWith("/api/ext/x/reply"))[1];
    await act(async () => {
      await chrome.storage.local.set({ [X_LAST_POST_STORAGE_KEY]: captured(2, "Anthony N.") });
    });
    expect(second.signal?.aborted).toBe(true);
    expect(await screen.findByText("Anthony N.")).toBeTruthy();
  });

  it("offers Rewrite with another X profile once a reply is written", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    replyBody = (body) => `Reply by ${body.profileId}`;
    render(<XHomeScreen />);
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(`Reply by ${THOUGHTFUL.id}`));

    const trigger = screen.getByRole("combobox", { name: "X profile" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(await screen.findByRole("option", { name: /X Quick Reply/ }), { key: "Enter" });
    const rewrite = await screen.findByRole("button", { name: "Rewrite with CarouseLabs — X Quick Reply" });
    expect(screen.getByText("Current reply: CarouseLabs — X Thoughtful Reply")).toBeTruthy();
    fireEvent.click(rewrite);
    await waitFor(() => expect(replyBox().value).toBe(`Reply by ${QUICK.id}`));
  });

  it("Shorter resizes what is in the box now, for X, and keeps the history row in step", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    render(<XHomeScreen />);
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(REPLY));
    fireEvent.change(replyBox(), { target: { value: `${REPLY} Edited.` } });

    fireEvent.click(screen.getByRole("button", { name: "Shorter" }));
    await waitFor(() => expect(replyBox().value).toBe("Invite after the first win."));
    const sent = calls.find((c) => c.url.endsWith("/api/ext/x/rewrite"))!.body;
    expect(sent).toEqual({ currentComment: `${REPLY} Edited.`, direction: "shorter", historyId: "h1" });
    expect(screen.getByText("27/280")).toBeTruthy();

    rewritten = "Moving the invite step after the first win is the part most teams miss, and it shows in activation.";
    fireEvent.click(screen.getByRole("button", { name: "Longer" }));
    await waitFor(() => expect(replyBox().value).toBe(rewritten));
    expect(calls.filter((c) => c.url.endsWith("/api/ext/x/rewrite"))[1].body).toMatchObject({ direction: "longer" });
  });

  it("holds every action while a resize runs, and shows which one", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    let release!: () => void;
    rewriteGate = new Promise<void>((resolve) => (release = resolve));
    render(<XHomeScreen />);
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(REPLY));

    fireEvent.click(screen.getByRole("button", { name: "Longer" }));
    expect(await screen.findByText("Lengthening…")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Insert" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Shorter" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => release());
    await waitFor(() => expect(replyBox().value).toBe("Invite after the first win."));
    expect((screen.getByRole("button", { name: "Insert" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("drops a resize that comes back after a new post arrived", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    let release!: () => void;
    rewriteGate = new Promise<void>((resolve) => (release = resolve));
    render(<XHomeScreen />);
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(REPLY));

    fireEvent.click(screen.getByRole("button", { name: "Shorter" }));
    await screen.findByText("Shortening…");
    await act(async () => {
      await chrome.storage.local.set({ [X_LAST_POST_STORAGE_KEY]: captured(2, "Anthony N.") });
    });
    expect(await screen.findByText("Anthony N.")).toBeTruthy();
    expect(screen.queryByText("Shortening…")).toBeNull();

    // A reply for the new post is written before the old resize comes back.
    replyBody = () => "A reply to Anthony's post.";
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe("A reply to Anthony's post."));
    await act(async () => release());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(replyBox().value).toBe("A reply to Anthony's post.");
    expect((screen.getByRole("button", { name: "Shorter" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows a failed resize and leaves the reply as it was", async () => {
    chromeMock().__store[X_LAST_POST_STORAGE_KEY] = captured();
    render(<XHomeScreen />);
    await writeReply();
    await waitFor(() => expect(replyBox().value).toBe(REPLY));
    const ok = fetch as unknown as Mock;
    const original = ok.getMockImplementation()!;
    ok.mockImplementation(async (url: string, init?: RequestInit) =>
      url.endsWith("/api/ext/x/rewrite")
        ? new Response(JSON.stringify({ error: "Couldn't make it shorter without losing the point" }), { status: 422 })
        : original(url, init),
    );
    fireEvent.click(screen.getByRole("button", { name: "Shorter" }));
    expect(await screen.findByText("Couldn't make it shorter without losing the point")).toBeTruthy();
    expect(replyBox().value).toBe(REPLY);
  });
});
