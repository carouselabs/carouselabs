// @vitest-environment node
// A connection note's History row names the AI model that actually wrote it:
// GPT Luna normally, Claude Haiku when Luna failed and the backup wrote it
// (it used to say Luna either way). Each call is recorded for admin → AI.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  lunaDown: false,
  // Luna never answers (until the call is given up on).
  lunaHangs: false,
  // Luna fails only this many times, then answers.
  lunaFailures: 0,
  // What both models write (a note too long for the range, to test the fallback).
  text: "",
  history: [] as Array<Record<string, unknown>>,
  aiCalls: [] as Array<Record<string, unknown>>,
}));
const NOTE = "Hi Maya, I hire for platform teams too and would be glad to compare notes on what works.";

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (_body: unknown, opts?: { signal?: AbortSignal }) => {
          if (state.lunaHangs) {
            return new Promise((_, reject) => {
              opts?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("Request was aborted."), { name: "AbortError" })), { once: true });
            });
          }
          if (state.lunaDown) throw new Error("Luna is down");
          if (state.lunaFailures > 0) {
            state.lunaFailures -= 1;
            throw new Error("Luna is down this once");
          }
          return { choices: [{ message: { content: JSON.stringify({ comment: state.text || NOTE }) } }], usage: { prompt_tokens: 400, completion_tokens: 30 } };
        },
      },
    };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async () => ({ content: [{ type: "text", text: JSON.stringify({ comment: state.text || NOTE }) }], usage: { input_tokens: 420, output_tokens: 31 } }),
    };
  },
}));
vi.mock("../../../lib/db", () => ({
  db: {
    connectionProfile: { findFirst: vi.fn(async () => null) },
    commentHistory: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.history.push(data);
        return { id: "h1" };
      }),
    },
    engageSetting: { findMany: vi.fn(async () => []) },
    engageAiCall: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.aiCalls.push(data);
        return data;
      }),
    },
  },
}));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => ({ id: "u1" })),
  VERSION_HEADER: "x-engage-version",
}));
vi.mock("../../../lib/engage/gate", () => ({
  engagePreflight: vi.fn(async () => ({ response: null, loaded: null })),
  reserveEngageGeneration: vi.fn(async () => ({ ok: true, freeRemaining: null, release: vi.fn() })),
}));

import { POST } from "../../../app/api/ext/connection-note/route";
import { clearGlobalSettingsCache } from "../../../lib/engage/settings";

const request = () =>
  new Request("https://carouselabs.com/api/ext/connection-note", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_x" },
    body: JSON.stringify({
      target: { name: "Maya Lindqvist", headline: "Talent Partner", currentRole: "Talent Partner at Northwind", about: "", url: "https://www.linkedin.com/in/maya" },
      context: { kind: "none" },
      length: { min: 80, max: 220 },
    }),
  });

beforeEach(() => {
  state.lunaDown = false;
  state.lunaHangs = false;
  state.lunaFailures = 0;
  state.text = "";
  state.history = [];
  state.aiCalls = [];
  clearGlobalSettingsCache();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("connection note: the model that wrote it", () => {
  it("GPT Luna, normally", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(state.history[0]).toMatchObject({ kind: "connection_note", model: "gpt-6-luna" });
    await new Promise((r) => setTimeout(r, 0));
    expect(state.aiCalls[0]).toMatchObject({ userId: "u1", kind: "connection_notes", feature: "connection_notes", model: "gpt-6-luna", inputTokens: 400 });
  });

  it("Claude Haiku, when Luna failed and the backup wrote it", async () => {
    state.lunaDown = true;
    expect((await POST(request())).status).toBe(200);
    expect(state.history[0]).toMatchObject({ model: "claude-haiku-4-5-20251001" });
  });

  it("a Luna that never answers is handed to Haiku after 8s, not 15s", async () => {
    vi.useFakeTimers();
    try {
      state.lunaHangs = true;
      let status: number | null = null;
      const start = Date.now();
      void POST(request()).then((res) => (status = res.status));
      while (status === null && Date.now() - start < 60_000) await vi.advanceTimersByTimeAsync(500);
      expect(status).toBe(200);
      expect(state.history[0]).toMatchObject({ model: "claude-haiku-4-5-20251001" });
      expect(Date.now() - start).toBeLessThanOrEqual(9_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the model of the earlier attempt whose text is kept when no attempt fits", async () => {
    // Both attempts write a note longer than the range: the first one is kept,
    // trimmed, and it was Haiku's (Luna failed on that attempt only).
    state.text = `Hi Maya, ${"I hire for platform teams and would be glad to compare notes on what works. ".repeat(5)}`;
    state.lunaFailures = 1;
    expect((await POST(request())).status).toBe(200);
    expect(state.history[0]).toMatchObject({ model: "claude-haiku-4-5-20251001" });
  });
});
