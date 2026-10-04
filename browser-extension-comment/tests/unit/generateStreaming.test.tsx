// The Home screen while a comment streams in: a skeleton until the first
// words, then the draft as it grows — read-only, with Copy off — and the final
// comment (the one that passed every guardrail) replacing it, editable and
// copyable. A draft that ends in an error must not be left behind: the result
// card goes away and Generate comes back as "Try again".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { chromeMock } from "../setup/chrome";

const encoder = new TextEncoder();
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const PROFILE = { id: "p1", name: "Thoughtful Expert", tone: "Professional", isDefault: true, isSystem: true, isRecommended: false };
const ME = {
  defaultCommentProfileId: "p1",
  commentsToday: 0,
  insertWarningHidden: false,
  extension: { access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null },
};

// The Generate response, fed event by event from the test.
function controlledStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    send: (event: string, data: unknown) => controller.enqueue(encoder.encode(frame(event, data))),
    close: () => controller.close(),
  };
}

function server(generate: () => Response) {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/api/ext/generate")) return generate();
      if (url.endsWith("/api/ext/profiles")) return json({ profiles: [PROFILE] });
      if (url.endsWith("/api/ext/me")) return json(ME);
      if (url.endsWith("/api/ext/config")) return json({ insertEnabled: false });
      if (url.includes("/api/ext/contacts")) return json({ contacts: [] });
      return json({});
    }),
  );
}

async function renderReady() {
  render(<HomeScreen onCreateProfile={() => {}} />);
  const generate = await screen.findByRole("button", { name: "Generate" });
  await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
  return generate;
}

const box = () => screen.getByRole("textbox", { name: "Your comment" }) as HTMLTextAreaElement;
const copy = () => screen.getByRole("button", { name: "Copy" }) as HTMLButtonElement;

beforeEach(() => {
  const store = chromeMock().__store;
  store.extensionToken = "cl_cmt_abc";
  store.lastSelectedPost = {
    mode: "comment",
    authorName: "Priya Raman",
    authorHeadline: "Head of Growth",
    text: "We cut our onboarding from 14 steps to 5.",
    type: "text",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1",
    capturedAt: 1,
  };
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
});

describe("streaming Generate in the side panel", () => {
  it("shows a skeleton, then the growing draft read-only, then the final comment", async () => {
    const stream = controlledStream();
    server(() => stream.response);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    fireEvent.click(await renderReady());
    expect(await screen.findByLabelText("Generating comment")).toBeTruthy();

    stream.send("start", { beforeModel: 20 });
    stream.send("text", { text: "Moving from 14" });
    await waitFor(() => expect(box().value).toBe("Moving from 14"));
    expect(box().readOnly).toBe(true);
    expect(copy().disabled).toBe(true);

    stream.send("text", { text: "Moving from 14 steps to 5" });
    await waitFor(() => expect(box().value).toBe("Moving from 14 steps to 5"));

    stream.send("final", {
      comment: "Moving from 14 steps to 5 is the real story.",
      freeRemaining: null,
      historyId: "h1",
      timing: { beforeModel: 20, ttft: 400, attempts: 1, model: "gpt-6-luna" },
    });
    stream.close();

    await waitFor(() => expect(box().value).toBe("Moving from 14 steps to 5 is the real story."));
    await waitFor(() => expect(copy().disabled).toBe(false));
    expect(box().readOnly).toBe(false);
    expect(info.mock.calls.flat().join(" ")).toMatch(/\[perf\] generate: FIRST VISIBLE TEXT \d+ ms \| TOTAL \d+ ms/);
  });

  it("goes back to the skeleton when a draft is discarded for a retry", async () => {
    const stream = controlledStream();
    server(() => stream.response);

    fireEvent.click(await renderReady());
    stream.send("text", { text: "First draft" });
    await waitFor(() => expect(box().value).toBe("First draft"));

    stream.send("retry", { attempt: 2 });
    expect(await screen.findByLabelText("Generating comment")).toBeTruthy();
  });

  it("wipes the draft when generation fails, so an unchecked draft can never be copied", async () => {
    const stream = controlledStream();
    server(() => stream.response);

    fireEvent.click(await renderReady());
    stream.send("text", { text: "Unchecked draft text" });
    await waitFor(() => expect(box().value).toBe("Unchecked draft text"));

    stream.send("error", { error: "Something went wrong, try again", status: 502 });
    stream.close();

    expect(await screen.findByText("Something went wrong, try again")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Your comment" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("still works against a server from before streaming (plain JSON)", async () => {
    server(() => new Response(JSON.stringify({ comment: "Whole comment at once.", freeRemaining: null, historyId: "h1" }), { status: 200 }));

    fireEvent.click(await renderReady());

    await waitFor(() => expect(box().value).toBe("Whole comment at once."));
    await waitFor(() => expect(copy().disabled).toBe(false));
  });
});
