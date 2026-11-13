// A LinkedIn video post on the Write screen (src/lib/postVideo.ts): watched
// first ("Watching the video…"), once per video, and its stills and speech
// sent with the comment request. A video that can't be watched is written
// about from its text and cover, as before; Stop while watching writes nothing.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { forgetWatchedVideos, watchPostVideo } from "@/lib/postVideo";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { chromeMock } from "../setup/chrome";

const PROFILE = { id: "p1", name: "Thoughtful Expert", tone: "Professional", isDefault: true, isSystem: true, isRecommended: false };
const ME = {
  defaultCommentProfileId: "p1",
  commentsToday: 0,
  insertWarningHidden: false,
  extension: { access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null },
};
const COVER = "https://media.licdn.com/dms/image/v2/D4E05AQabcdefghij/videocover-high/0/1?e=1&t=y";
const VIDEO = "https://dms.licdn.com/playlist/vid/v2/D4E05AQabcdefghij/mp4-360p-30fp-crf28/0/1?e=1&t=z";
const WATCHED = { frames: ["/9j/AAAA", "/9j/BBBB"], transcript: "Here's what we learned shipping weekly.", seconds: 40 };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const finished = (comment: string) =>
  new Response(`event: final\ndata: ${JSON.stringify({ comment, freeRemaining: null, historyId: "h1" })}\n\n`, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });

// The video route answers when the test says so.
function server(video: () => Promise<Response>) {
  const generated: Record<string, unknown>[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/api/ext/video")) return video();
    if (url.endsWith("/api/ext/generate")) {
      generated.push(JSON.parse(String(init?.body)).post);
      return finished(`Comment number ${generated.length}.`);
    }
    if (url.endsWith("/api/ext/profiles")) return json({ profiles: [PROFILE] });
    if (url.endsWith("/api/ext/me")) return json(ME);
    if (url.endsWith("/api/ext/config")) return json({ insertEnabled: false });
    if (url.includes("/api/ext/contacts")) return json({ contacts: [] });
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  const videoCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/ext/video"));
  return { generated, videoCalls };
}

function later() {
  let resolve!: (res: Response) => void;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function renderReady() {
  render(<HomeScreen onCreateProfile={() => {}} />);
  const generate = await screen.findByRole("button", { name: "Generate" });
  await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
  return generate;
}

const box = () => screen.getByRole("textbox", { name: "Your comment" }) as HTMLTextAreaElement;

beforeEach(() => {
  forgetWatchedVideos();
  (chromeMock().tabs.query as unknown as Mock).mockResolvedValue([{ id: 5, url: "https://www.linkedin.com/feed/" }]);
  const store = chromeMock().__store;
  store.extensionToken = "cl_cmt_abc";
  store.lastSelectedPost = {
    mode: "comment",
    authorName: "Priya Raman",
    authorHeadline: "Head of Growth",
    text: "Three years of weekly releases, in one minute.",
    type: "video",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1",
    capturedAt: 1,
    images: [COVER],
    video: true,
    videoUrl: VIDEO,
  };
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("a video post", () => {
  it("is watched first, then its stills and speech go with the comment; Regenerate doesn't watch again", async () => {
    const answer = later();
    const { generated, videoCalls } = server(() => answer.promise);
    fireEvent.click(await renderReady());
    expect(screen.getByText("Video · watched and listened to")).toBeTruthy();

    expect(await screen.findByText("Watching the video…")).toBeTruthy();
    expect(JSON.parse(String((videoCalls()[0][1] as RequestInit).body))).toEqual({ url: VIDEO });
    expect(generated).toHaveLength(0);

    answer.resolve(json(WATCHED));
    await waitFor(() => expect(box().value).toBe("Comment number 1."));
    expect(screen.queryByText("Watching the video…")).toBeNull();
    expect(generated[0]).toMatchObject({
      video: true,
      images: [COVER],
      videoFrames: WATCHED.frames,
      videoTranscript: WATCHED.transcript,
    });

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(box().value).toBe("Comment number 2."));
    expect(videoCalls()).toHaveLength(1);
    expect(generated[1]).toMatchObject({ videoFrames: WATCHED.frames, videoTranscript: WATCHED.transcript });
  });

  it("one that can't be watched: written from its text and cover, and not asked for again", async () => {
    const { generated, videoCalls } = server(async () => json({ error: "Couldn't watch this video." }, 422));
    fireEvent.click(await renderReady());
    await waitFor(() => expect(box().value).toBe("Comment number 1."));
    expect(generated[0]).toMatchObject({ video: true, images: [COVER] });
    expect(generated[0]).not.toHaveProperty("videoFrames");
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(box().value).toBe("Comment number 2."));
    expect(videoCalls()).toHaveLength(1);
  });

  it("over the day's videos: written without it this time, asked again next time", async () => {
    let status = 429;
    const { generated, videoCalls } = server(async () => (status === 429 ? json({ code: "video_limit" }, 429) : json(WATCHED)));
    fireEvent.click(await renderReady());
    await waitFor(() => expect(box().value).toBe("Comment number 1."));
    expect(generated[0]).not.toHaveProperty("videoFrames");

    status = 200;
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(box().value).toBe("Comment number 2."));
    // Asked again (the limit isn't remembered), and this time watched.
    expect(videoCalls().length).toBeGreaterThanOrEqual(2);
    expect(generated[1]).toMatchObject({ videoFrames: WATCHED.frames });
  });

  it("watching starts as soon as the post is picked, before Generate", async () => {
    const answer = later();
    const { generated, videoCalls } = server(() => answer.promise);
    await renderReady();
    // Picked (from storage) and already being watched; nothing written yet.
    await waitFor(() => expect(videoCalls()).toHaveLength(1));
    expect(generated).toHaveLength(0);

    answer.resolve(json(WATCHED));
    await new Promise((r) => setTimeout(r, 10));
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(box().value).toBe("Comment number 1."));
    // Generate used the watch already done: no second request, no wait.
    expect(videoCalls()).toHaveLength(1);
    expect(screen.queryByText("Watching the video…")).toBeNull();
    expect(generated[0]).toMatchObject({ videoFrames: WATCHED.frames });
  });

  it("Generate waits only so long for a slow watch, then writes without it; the watch is kept for next time", async () => {
    const answer = later();
    server(() => answer.promise);
    const stop = new AbortController();
    const started = Date.now();
    expect(await watchPostVideo(VIDEO, stop.signal, 50)).toBeNull();
    expect(Date.now() - started).toBeLessThan(1_000);

    answer.resolve(json(WATCHED));
    await new Promise((r) => setTimeout(r, 10));
    expect(await watchPostVideo(VIDEO, stop.signal, 50)).toEqual({ frames: WATCHED.frames, transcript: WATCHED.transcript });
  });

  it("Stop while it's being watched: nothing is written", async () => {
    const answer = later();
    const { generated } = server(() => answer.promise);
    fireEvent.click(await renderReady());
    await screen.findByText("Watching the video…");

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(screen.queryByText("Watching the video…")).toBeNull());
    answer.resolve(json(WATCHED));
    await new Promise((r) => setTimeout(r, 30));
    expect(generated).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Generate" })).toBeTruthy();
  });

  it("a video whose file wasn't found: no watching, written as before", async () => {
    const store = chromeMock().__store;
    store.lastSelectedPost = { ...(store.lastSelectedPost as object), videoUrl: undefined };
    const { generated, videoCalls } = server(async () => json(WATCHED));
    fireEvent.click(await renderReady());
    expect(screen.getByText("Video · reads its cover and the text")).toBeTruthy();
    await waitFor(() => expect(box().value).toBe("Comment number 1."));
    expect(videoCalls()).toHaveLength(0);
    expect(generated[0]).not.toHaveProperty("videoFrames");
  });
});

describe("a video post of 40 words or more", () => {
  it("isn't watched, and its pictures aren't sent: written from the words", async () => {
    const store = chromeMock().__store;
    store.lastSelectedPost = {
      ...(store.lastSelectedPost as object),
      text: "We shipped every Friday for three years and this is what changed for the team. ".repeat(4),
    };
    const { generated, videoCalls } = server(async () => json(WATCHED));
    fireEvent.click(await renderReady());
    await waitFor(() => expect(box().value).toBe("Comment number 1."));
    expect(videoCalls()).toHaveLength(0);
    expect(generated[0]).not.toHaveProperty("videoFrames");
    expect(generated[0].images).toBeUndefined();
    expect(screen.queryByText("Video · watched and listened to")).toBeNull();
  });
});
