// The Home screen's result card: it stays while the user edits (even down to
// an empty box, so they can write their own), Copy confirms itself and says
// so to screen readers, a failed generation offers Try again, and a new post
// never inherits the previous post's comment; Insert puts the comment straight
// into LinkedIn, with no warning first.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { chromeMock } from "../setup/chrome";

const PROFILE = { id: "p1", name: "Thoughtful Expert", tone: "Professional", isDefault: true, isSystem: true, isRecommended: false };
const ME = {
  defaultCommentProfileId: "p1",
  commentsToday: 0,
  insertWarningHidden: false,
  extension: { access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null },
};
const POST = {
  mode: "comment",
  authorName: "Priya Raman",
  authorHeadline: "Head of Growth",
  text: "We cut our onboarding from 14 steps to 5.",
  type: "text",
  url: "https://www.linkedin.com/feed/update/urn:li:activity:1",
  capturedAt: 1,
};
const COMMENT = "Moving from 14 steps to 5 is the real story.";
let insertEnabled = false;

// Each Generate call takes the next scripted answer.
function server(...answers: Array<{ status: number; body: unknown }>) {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  const generate = vi.fn(async () => {
    const next = answers.shift() ?? { status: 200, body: { comment: COMMENT, freeRemaining: null, historyId: "h1" } };
    return json(next.status, next.body);
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/api/ext/generate")) return generate();
      if (url.endsWith("/api/ext/profiles")) return json(200, { profiles: [PROFILE] });
      if (url.endsWith("/api/ext/me")) return json(200, ME);
      if (url.endsWith("/api/ext/config")) return json(200, { insertEnabled });
      return json(200, {});
    }),
  );
  return generate;
}

async function generateOnce() {
  render(<HomeScreen onCreateProfile={() => {}} />);
  const generate = await screen.findByRole("button", { name: "Generate" });
  await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(generate);
}

const box = () => screen.getByRole("textbox", { name: "Your comment" }) as HTMLTextAreaElement;
const copy = () => screen.getByRole("button", { name: /^Cop(y|ied)$/ }) as HTMLButtonElement;

beforeEach(() => {
  // On LinkedIn: off it, Home points back there instead of writing.
  (chromeMock().tabs.query as unknown as Mock).mockResolvedValue([{ id: 5, url: "https://www.linkedin.com/feed/" }]);
  insertEnabled = false;
  const store = chromeMock().__store;
  store.extensionToken = "cl_cmt_abc";
  store.lastSelectedPost = POST;
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Home result card", () => {
  it("puts the comment straight into LinkedIn on Insert, with no warning first", async () => {
    insertEnabled = true;
    server();
    const chrome = chromeMock();
    chrome.tabs.query.mockResolvedValue([{ id: 5, url: "https://www.linkedin.com/feed/" }]);
    chrome.tabs.sendMessage.mockResolvedValue({ ok: true });
    await generateOnce();
    await waitFor(() => expect(box().value).toBe(COMMENT));

    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    await waitFor(() =>
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ type: "carouselabs:insert-comment", text: COMMENT, mode: "comment" }),
      ),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a double click inserts once, for the post it was written for, and the button says Inserted", async () => {
    insertEnabled = true;
    server();
    const target = { captureId: "c1", postKey: "update-card-focus1", postUrn: "urn:li:activity:1" };
    chromeMock().__store.lastSelectedPost = { ...POST, target };
    const chrome = chromeMock();
    chrome.tabs.sendMessage.mockResolvedValue({ ok: true });
    await generateOnce();
    await waitFor(() => expect(box().value).toBe(COMMENT));

    const insert = screen.getByRole("button", { name: "Insert" });
    fireEvent.click(insert);
    fireEvent.click(insert);
    await screen.findByRole("button", { name: "Inserted" });
    expect((screen.getByRole("button", { name: "Inserted" }) as HTMLButtonElement).disabled).toBe(true);
    const inserts = chrome.tabs.sendMessage.mock.calls.filter(([, m]) => (m as { type?: string }).type === "carouselabs:insert-comment");
    expect(inserts).toHaveLength(1);
    expect(inserts[0][1]).toMatchObject({ text: COMMENT, mode: "comment", target, insertId: expect.any(String) });
  });

  it("a failed Insert keeps the comment, says why, and the next click is a new Insert", async () => {
    insertEnabled = true;
    server();
    const chrome = chromeMock();
    const answers = [
      { ok: false, error: "Couldn't find this post's comment box. Click Comment on the post to open it, then try Insert again." },
      { ok: true },
    ];
    chrome.tabs.sendMessage.mockImplementation(async (_tab: number, m: { type?: string }) =>
      m.type === "carouselabs:insert-comment" ? answers.shift() : { ok: true },
    );
    await generateOnce();
    await waitFor(() => expect(box().value).toBe(COMMENT));

    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    await screen.findByText(/Couldn't find this post's comment box/);
    expect(box().value).toBe(COMMENT);

    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    await screen.findByRole("button", { name: "Inserted" });
    expect(screen.queryByText(/Couldn't find this post's comment box/)).toBeNull();
    const ids = chrome.tabs.sendMessage.mock.calls
      .map(([, m]) => (m as { insertId?: string }).insertId)
      .filter(Boolean);
    expect(new Set(ids).size).toBe(2);
  });

  it("keeps the card when the box is cleared by hand, so the user can write their own", async () => {
    server();
    await generateOnce();
    await waitFor(() => expect(box().value).toBe(COMMENT));

    fireEvent.change(box(), { target: { value: "" } });
    expect(box().value).toBe("");
    expect(copy().disabled).toBe(true);

    fireEvent.change(box(), { target: { value: "My own words." } });
    expect(copy().disabled).toBe(false);
    // The big Generate button stays replaced by the card; Regenerate lives in it.
    expect(screen.queryByRole("button", { name: "Generate" })).toBeNull();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeTruthy();
  });

  it("confirms Copy on the button and to screen readers", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    server();
    await generateOnce();
    await waitFor(() => expect(copy().disabled).toBe(false));

    fireEvent.click(copy());
    await waitFor(() => expect(copy().textContent).toBe("Copied"));
    expect(writeText).toHaveBeenCalledWith(COMMENT);
    expect(screen.getByText("Copied to clipboard")).toBeTruthy();
  });

  it("offers Try again after a failure, and it generates", async () => {
    const generate = server({ status: 502, body: { error: "upstream" } });
    await generateOnce();

    expect(await screen.findByText("Something went wrong, try again")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(box().value).toBe(COMMENT));
    expect(generate).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Something went wrong, try again")).toBeNull();
  });

  it("drops the result when a new post is picked", async () => {
    server();
    await generateOnce();
    await waitFor(() => expect(box().value).toBe(COMMENT));

    await chrome.storage.local.set({ lastSelectedPost: { ...POST, authorName: "Sam Lee", capturedAt: 2 } });

    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Your comment" })).toBeNull());
    expect(screen.getByText("Sam Lee")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate" })).toBeTruthy();
  });

  it("explains the empty state instead of showing an empty form", async () => {
    delete chromeMock().__store.lastSelectedPost;
    server();
    render(<HomeScreen onCreateProfile={() => {}} />);

    expect(await screen.findByText("Pick a post on LinkedIn")).toBeTruthy();
    expect(screen.queryByLabelText(/Extra instruction/)).toBeNull();
    expect((screen.getByRole("button", { name: "Generate" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("off LinkedIn: points back to LinkedIn instead of Generate, and follows tab switches", async () => {
    let active = { id: 12 } as chrome.tabs.Tab;
    (chromeMock().tabs.query as unknown as Mock).mockImplementation(async (info: chrome.tabs.QueryInfo) =>
      info.url ? [{ id: 5, url: "https://www.linkedin.com/feed/" }] : [active],
    );
    server();
    render(<HomeScreen onCreateProfile={() => {}} />);
    expect(await screen.findByText("You're not on LinkedIn")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Generate" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Go to LinkedIn/ }));
    await waitFor(() => expect(chromeMock().tabs.update).toHaveBeenCalledWith(5, { active: true }));

    active = { id: 5, url: "https://www.linkedin.com/feed/" } as chrome.tabs.Tab;
    await act(async () => {
      for (const fn of [...chromeMock().tabs.onActivated.listeners]) fn({ tabId: 5, windowId: 1 });
    });
    await waitFor(() => expect(screen.queryByText("You're not on LinkedIn")).toBeNull());
    expect(screen.getByRole("button", { name: "Generate" })).toBeTruthy();
  });
});
