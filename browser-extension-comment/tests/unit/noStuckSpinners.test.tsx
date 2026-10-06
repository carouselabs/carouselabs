// Nothing in the panel waits forever: a stream that goes quiet fails with a
// message (the server's keep-alives hold a slow one open), every request has
// an overall limit and can be cancelled, Stop ends a generation and puts back
// what was there, a new post cancels the old post's generation, and a
// LinkedIn tab that never answers is given up on (and an Insert never
// retried, so text can't be typed twice).
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiFetch, apiStream, ApiError, isCancelled } from "@/lib/api";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { ensureContentScript, sendToTab, TabTimeout } from "@/lib/tabs";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { MessagesScreen } from "@/sidepanel/components/screens/MessagesScreen";
import { chromeMock } from "../setup/chrome";

const encoder = new TextEncoder();
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

// A streamed response the test writes to as it goes. Like a real fetch, it
// fails once the request is aborted.
function liveStream(signal: AbortSignal | null | undefined) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  signal?.addEventListener("abort", () => {
    try {
      controller.error(new DOMException("The operation was aborted.", "AbortError"));
    } catch {
      // already closed
    }
  });
  return {
    response: new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream; charset=utf-8" } }),
    send: (text: string) => controller.enqueue(encoder.encode(text)),
  };
}

// A fetch whose answer never comes, until it is aborted.
const neverAnswers = (_url: string, init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
    if (init?.signal?.aborted) abort();
    init?.signal?.addEventListener("abort", abort);
  });

async function settleWithin<T>(promise: Promise<T>, stepMs: number, maxMs: number) {
  let outcome: { value?: T; error?: unknown } | null = null;
  promise.then(
    (value) => (outcome = { value }),
    (error) => (outcome = { error }),
  );
  let waited = 0;
  while (!outcome && waited < maxMs) {
    await vi.advanceTimersByTimeAsync(stepMs);
    waited += stepMs;
  }
  return { waited, ...(outcome ?? { error: new Error("never settled") }) };
}

beforeEach(() => {
  chromeMock().__store.extensionToken = "cl_cmt_abc";
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("requests", () => {
  it("gives up on a stream that goes completely quiet, with a message", async () => {
    vi.useFakeTimers();
    let stream!: ReturnType<typeof liveStream>;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => (stream = liveStream(init?.signal)).response));
    const pending = apiStream("/api/ext/generate", { method: "POST" });
    await vi.advanceTimersByTimeAsync(0);
    stream.send(frame("start", {}));

    const result = await settleWithin(pending, 1_000, 60_000);
    expect(result.error).toBeInstanceOf(ApiError);
    expect((result.error as ApiError).status).toBe(408);
    expect((result.error as ApiError).message).toMatch(/connection to CarouseLabs dropped/i);
    expect(result.waited).toBeGreaterThanOrEqual(25_000);
    expect(result.waited).toBeLessThanOrEqual(26_000);
  });

  it("gives up on a stream that never sends anything after its headers", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => liveStream(init?.signal).response));
    const result = await settleWithin(apiStream("/api/ext/generate", { method: "POST" }), 1_000, 90_000);
    expect((result.error as ApiError).message).toMatch(/connection to CarouseLabs dropped/i);
    expect(result.waited).toBeLessThanOrEqual(26_000);
  });

  it("keeps waiting while the server says it is still working", async () => {
    vi.useFakeTimers();
    let stream!: ReturnType<typeof liveStream>;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => (stream = liveStream(init?.signal)).response));
    const pending = apiStream<{ comment: string }>("/api/ext/generate", { method: "POST" });
    await vi.advanceTimersByTimeAsync(0);
    stream.send(frame("start", {}));
    for (let i = 0; i < 5; i += 1) {
      await vi.advanceTimersByTimeAsync(8_000);
      stream.send(": keep-alive\n\n");
    }
    stream.send(frame("final", { comment: "Done." }));
    await expect(pending).resolves.toEqual({ comment: "Done." });
  });

  it("stops at 60s overall, even while bytes keep coming", async () => {
    vi.useFakeTimers();
    let stream!: ReturnType<typeof liveStream>;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => (stream = liveStream(init?.signal)).response));
    const pending = apiStream("/api/ext/generate", { method: "POST" });
    await vi.advanceTimersByTimeAsync(0);
    const timer = setInterval(() => stream.send(": keep-alive\n\n"), 8_000);
    const result = await settleWithin(pending, 1_000, 90_000);
    clearInterval(timer);
    expect((result.error as ApiError).message).toMatch(/took too long/i);
    expect(result.waited).toBeLessThanOrEqual(61_000);
  });

  it("can be cancelled by the caller, which is not an error to show", async () => {
    const fetchMock = vi.fn(neverAnswers);
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const streaming = apiStream("/api/ext/generate", { method: "POST", signal: controller.signal });
    const plain = apiFetch("/api/ext/message", { method: "POST", signal: controller.signal });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    controller.abort();
    for (const pending of [streaming, plain]) {
      const err = await pending.catch((e: unknown) => e);
      expect(isCancelled(err)).toBe(true);
      expect(err).not.toBeInstanceOf(ApiError);
    }
  });

  it("isn't sent at all when cancelled before it goes out", async () => {
    const fetchMock = vi.fn(neverAnswers);
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();
    expect(isCancelled(await apiFetch("/api/ext/message", { signal: controller.signal }).catch((e: unknown) => e))).toBe(true);
    expect(isCancelled(await apiStream("/api/ext/generate", { signal: controller.signal }).catch((e: unknown) => e))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("times out reading a reply that never finishes, not only its first byte", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const stream = liveStream(init?.signal);
        return new Response(stream.response.body, { status: 200, headers: { "Content-Type": "application/json" } });
      }),
    );
    const result = await settleWithin(apiFetch("/api/ext/message", { method: "POST" }), 1_000, 90_000);
    expect((result.error as ApiError).status).toBe(408);
    expect(result.waited).toBeLessThanOrEqual(61_000);
  });
});

describe("LinkedIn tab", () => {
  const TAB = { id: 5, url: "https://www.linkedin.com/feed/" } as chrome.tabs.Tab;

  it("gives up on a tab that never answers, and doesn't send it again", async () => {
    vi.useFakeTimers();
    (chromeMock().tabs.sendMessage as Mock).mockImplementation(() => new Promise(() => {}));
    const result = await settleWithin(sendToTab(TAB, { type: "carouselabs:insert-comment", text: "Hi" }), 1_000, 60_000);
    expect(result.error).toBeInstanceOf(TabTimeout);
    expect(result.waited).toBeLessThanOrEqual(13_000);
    expect(chromeMock().tabs.sendMessage).toHaveBeenCalledTimes(1);
    expect(chromeMock().scripting.executeScript).not.toHaveBeenCalled();
  });

  it("stops trying to repair a tab whose pings never answer within a few seconds", async () => {
    vi.useFakeTimers();
    (chromeMock().tabs.sendMessage as Mock).mockImplementation(() => new Promise(() => {}));
    const result = await settleWithin(ensureContentScript(TAB), 500, 60_000);
    expect(result.value).toBe(false);
    expect(result.waited).toBeLessThanOrEqual(6_000);
  });
});

describe("Home: Stop and a new post", () => {
  const PROFILE = { id: "p1", name: "Thoughtful Expert", tone: "Professional", isDefault: true, isSystem: true, isRecommended: false };
  const post = (capturedAt: number, authorName: string) => ({
    mode: "comment", authorName, authorHeadline: "Founder", text: `${authorName} wrote about onboarding.`, type: "text",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1", capturedAt,
  });
  const FIRST = "Order beats count when people need a first win.";

  let generations: Array<{ signal: AbortSignal; stream: ReturnType<typeof liveStream> }> = [];
  let answerFirstAtOnce = false;

  function server() {
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/api/ext/generate")) {
          if (answerFirstAtOnce && generations.length === 0) {
            generations.push({ signal: init!.signal!, stream: liveStream(init?.signal) });
            return json({ comment: FIRST, freeRemaining: null, historyId: "h1" });
          }
          const stream = liveStream(init?.signal);
          generations.push({ signal: init!.signal!, stream });
          stream.send(frame("start", {}));
          return stream.response;
        }
        if (url.endsWith("/api/ext/profiles")) return json({ profiles: [PROFILE] });
        if (url.endsWith("/api/ext/me")) return json({ defaultCommentProfileId: "p1", commentsToday: 0, extension: null });
        if (url.endsWith("/api/ext/config")) return json({ insertEnabled: false });
        return json({});
      }),
    );
  }

  async function clickGenerate() {
    const generate = await screen.findByRole("button", { name: /^(Generate|Regenerate)$/ });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(generate);
  }

  beforeEach(() => {
    // On LinkedIn: off it, Home points back there instead of writing.
    (chromeMock().tabs.query as Mock).mockResolvedValue([{ id: 5, url: "https://www.linkedin.com/feed/" }]);
    generations = [];
    answerFirstAtOnce = false;
    chromeMock().__store.lastSelectedPost = post(1, "Priya");
    server();
  });

  it("Stop ends the wait: no grey lines, no error, Generate is back", async () => {
    render(<HomeScreen onCreateProfile={() => {}} />);
    await clickGenerate();
    const stop = await screen.findByRole("button", { name: "Stop" });
    expect(screen.getByRole("status", { name: "Generating comment" })).toBeTruthy();

    fireEvent.click(stop);
    expect(generations[0].signal.aborted).toBe(true);
    await waitFor(() => expect(screen.queryByRole("status", { name: "Generating comment" })).toBeNull());
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(((await screen.findByRole("button", { name: "Generate" })) as HTMLButtonElement).disabled).toBe(false);
  });

  it("Generate right after Stop is a new request; the stopped one stays aborted (the server then stops it)", async () => {
    render(<HomeScreen onCreateProfile={() => {}} />);
    await clickGenerate();
    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));
    await clickGenerate();
    await waitFor(() => expect(generations).toHaveLength(2));
    expect(generations[0].signal.aborted).toBe(true);
    expect(generations[1].signal.aborted).toBe(false);
    expect(generations[0].signal).not.toBe(generations[1].signal);
  });

  it("Stop on a regenerate puts the previous comment back", async () => {
    answerFirstAtOnce = true;
    render(<HomeScreen onCreateProfile={() => {}} />);
    await clickGenerate();
    const box = () => screen.getByRole("textbox", { name: "Your comment" }) as HTMLTextAreaElement;
    await waitFor(() => expect(box().value).toBe(FIRST));

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));
    await waitFor(() => expect(box().value).toBe(FIRST));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a new post cancels the old post's generation, whose text never shows", async () => {
    render(<HomeScreen onCreateProfile={() => {}} />);
    await clickGenerate();
    await screen.findByRole("button", { name: "Stop" });
    const first = generations[0];
    first.stream.send(frame("text", { text: "About Priya's post" }));

    await act(async () => {
      await chrome.storage.local.set({ lastSelectedPost: post(2, "Anthony") });
    });
    expect(first.signal.aborted).toBe(true);
    expect(await screen.findByText("Anthony")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).toBeNull());
    expect(screen.queryByDisplayValue(/Priya's post/)).toBeNull();
    expect(((await screen.findByRole("button", { name: "Generate" })) as HTMLButtonElement).disabled).toBe(false);
  });

  it("leaving the screen cancels the generation", async () => {
    const view = render(<HomeScreen onCreateProfile={() => {}} />);
    await clickGenerate();
    await screen.findByRole("button", { name: "Stop" });
    view.unmount();
    expect(generations[0].signal.aborted).toBe(true);
  });
});

describe("Messages: Stop", () => {
  const READ = "carouselabs:read-conversation";
  const TAB = { id: 7, url: "https://www.linkedin.com/messaging/thread/2-bharti/" } as chrome.tabs.Tab;
  const conversation = (name: string, path: string) => ({
    contact: { name, headline: "Founder", profileUrl: `https://www.linkedin.com/in/${name.toLowerCase()}` },
    threadPath: path,
    thread: [{ sender: "them", text: "What are you working on?" }],
  });
  const PROFILE = { id: "mp1", name: "Potential client", goal: "g", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: false };
  let messageSignals: AbortSignal[] = [];
  let open = conversation("Bharti", "/messaging/thread/2-bharti/");

  beforeEach(() => {
    messageSignals = [];
    open = conversation("Bharti", "/messaging/thread/2-bharti/");
    chromeMock().__store.settingsUploadedToAccount = true;
    (chromeMock().tabs.query as Mock).mockResolvedValue([TAB]);
    (chromeMock().tabs.sendMessage as Mock).mockImplementation(async (_id: number, message: { type?: string }) =>
      message.type === READ ? { ok: true, conversation: open } : { ok: true },
    );
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/api/ext/message")) {
          messageSignals.push(init!.signal!);
          return neverAnswers(url, init);
        }
        if (url.endsWith("/api/ext/message-profiles")) return json({ profiles: [PROFILE] });
        if (url.endsWith("/api/ext/me")) return json({ defaultMessageProfileId: "mp1", extension: null });
        if (url.endsWith("/api/ext/config")) return json({ insertEnabled: false });
        if (url.includes("/api/ext/contacts")) return json({ contact: null, contacts: [] });
        return json({});
      }),
    );
  });

  async function readAndGenerate() {
    render(<MessagesScreen onCreateProfile={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
    const generate = await screen.findByRole("button", { name: /^Generate (reply|opener)$/ });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(generate);
  }

  it("Stop ends a reply that is taking too long", async () => {
    await readAndGenerate();
    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));
    expect(messageSignals[0].aborted).toBe(true);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reading another conversation cancels the reply being written for the last one", async () => {
    await readAndGenerate();
    await screen.findByRole("button", { name: "Stop" });
    open = conversation("Emma", "/messaging/thread/2-emma/");
    fireEvent.click(screen.getByRole("button", { name: "Re-read this conversation" }));
    expect(await screen.findByText("Emma")).toBeTruthy();
    expect(messageSignals[0].aborted).toBe(true);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).toBeNull());
  });
});
