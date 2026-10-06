// apiStream (src/lib/api.ts): reads Generate's server-sent events however the
// network splits them, reports each piece, resolves with the final result,
// and fails exactly the way apiFetch does — so the paywall and error handling
// in the panel don't care which one made the request. A server from before
// streaming answers JSON, which must still work.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiStream, ApiError } from "@/lib/api";
import { chromeMock } from "../setup/chrome";

const encoder = new TextEncoder();
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

// A streaming response delivered in pieces of `size` bytes, so events (and
// the multi-byte "é") straddle chunk boundaries.
function sseResponse(body: string, size: number) {
  const bytes = encoder.encode(body);
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream; charset=utf-8" } },
  );
}

const STREAM =
  frame("start", { beforeModel: 12 }) +
  frame("text", { text: "Café" }) +
  frame("text", { text: "Café order" }) +
  frame("retry", { attempt: 2 }) +
  frame("text", { text: "Order" }) +
  frame("final", { comment: "Order beats count.", freeRemaining: null, historyId: "h1", timing: { ttft: 400 } });

beforeEach(() => {
  chromeMock().__store.extensionToken = "cl_cmt_abc";
});

describe("apiStream", () => {
  it.each([1, 3, 7, 64, 10_000])("parses events split every %i bytes and resolves with the final event", async (size) => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(STREAM, size)));
    const seen: string[] = [];

    const result = await apiStream("/api/ext/generate", { method: "POST" }, {
      onStart: () => seen.push("start"),
      onText: (text) => seen.push(`text:${text}`),
      onRetry: (attempt) => seen.push(`retry:${attempt}`),
    });

    expect(seen).toEqual(["start", "text:Café", "text:Café order", "retry:2", "text:Order"]);
    expect(result).toMatchObject({ comment: "Order beats count.", historyId: "h1", timing: { ttft: 400 } });
  });

  it("asks for a stream, with the bearer token", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => sseResponse(STREAM, 64));
    vi.stubGlobal("fetch", fetchMock);
    await apiStream("/api/ext/generate", { method: "POST" });
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Accept: "text/event-stream",
      Authorization: "Bearer cl_cmt_abc",
    });
  });

  it("takes a plain JSON answer (a server from before streaming) as the result", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ comment: "Old server" }), { status: 200 })));
    const onText = vi.fn();
    await expect(apiStream("/api/ext/generate", {}, { onText })).resolves.toEqual({ comment: "Old server" });
    expect(onText).not.toHaveBeenCalled();
  });

  it("fails a non-2xx answer like apiFetch does, body included (the paywall reads it)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Used up", requiresSubscription: true }), { status: 402 })),
    );
    const err = await apiStream("/api/ext/generate", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 402, message: "Used up", data: { requiresSubscription: true } });
  });

  it("turns an error event into an ApiError with its status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sseResponse(frame("start", {}) + frame("text", { text: "Draft" }) + frame("error", { error: "Something went wrong, try again", status: 502 }), 5)),
    );
    await expect(apiStream("/api/ext/generate", {})).rejects.toMatchObject({ status: 502, message: "Something went wrong, try again" });
  });

  it("fails if the connection ends without a result", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(frame("start", {}) + frame("text", { text: "Half" }), 8)));
    await expect(apiStream("/api/ext/generate", {})).rejects.toMatchObject({ status: 502 });
  });

  it("never calls the network without a token", async () => {
    delete chromeMock().__store.extensionToken;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiStream("/api/ext/generate", {})).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("request id", () => {
  it("sends each Generate a fresh random id, the one the panel's timing line prints", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_abc";
    const fetchMock = vi.fn(async () => sseResponse(frame("start", {}) + frame("final", { comment: "Done" }), 50));
    vi.stubGlobal("fetch", fetchMock);
    const ids: string[] = [];
    await apiStream("/api/ext/generate", {}, { onRequest: (id) => ids.push(id) });
    await apiStream("/api/ext/generate", {}, { onRequest: (id) => ids.push(id) });
    const sent = fetchMock.mock.calls.map(
      (call) => ((call as unknown as [string, RequestInit])[1].headers as Record<string, string>)["X-Engage-Request-Id"],
    );
    expect(sent).toEqual(ids);
    expect(ids[0]).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
