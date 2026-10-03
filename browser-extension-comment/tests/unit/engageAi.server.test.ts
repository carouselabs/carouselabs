// @vitest-environment node
// Engage admin phase C: AI usage and cost. Every model call is recorded (model,
// tokens, time, how it ended, whether it was the backup) without ever slowing
// or failing the request; each feature's chosen model goes first; cost is
// tokens × the price set per model; and the AI admin API changes models and
// prices with an audit trail. The AI SDKs are stood in for.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Answer = { text: string; input?: number; output?: number } | "error";

const sdk = vi.hoisted(() => ({
  luna: [] as Answer[],
  haiku: [] as Answer[],
  calls: [] as Array<{ provider: "luna" | "haiku"; body: Record<string, unknown> }>,
}));

const state = vi.hoisted(() => ({
  settings: [] as Array<{ key: string; value: unknown; updatedAt: Date; updatedBy: string | null }>,
  aiCalls: [] as Array<Record<string, unknown>>,
  audit: [] as Array<Record<string, unknown>>,
  raw: [] as Array<{ text: string; values: unknown[] }>,
  rawRows: [] as Array<Array<Record<string, unknown>>>,
  admin: { id: "admin1", email: "owner@carouselabs.com" } as null | { id: string; email: string },
}));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (body: Record<string, unknown>, opts?: { signal?: AbortSignal }) => {
          sdk.calls.push({ provider: "luna", body });
          // Like the SDK: an aborted request rejects.
          if (opts?.signal?.aborted) throw Object.assign(new Error("Request was aborted."), { name: "AbortError" });
          const a = sdk.luna.shift();
          if (!a || a === "error") throw new Error("Luna is down");
          const usage = { prompt_tokens: a.input ?? 100, completion_tokens: a.output ?? 20 };
          if (!body.stream) return { choices: [{ message: { content: a.text } }], usage };
          return (async function* () {
            yield { choices: [{ delta: { content: a.text } }] };
            // With stream_options.include_usage, the last chunk carries usage and no choices.
            if ((body.stream_options as { include_usage?: boolean } | undefined)?.include_usage) yield { choices: [], usage };
          })();
        },
      },
    };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async (body: Record<string, unknown>) => {
        sdk.calls.push({ provider: "haiku", body });
        const a = sdk.haiku.shift();
        if (!a || a === "error") throw new Error("Haiku is down");
        const usage = { input_tokens: a.input ?? 120, output_tokens: a.output ?? 30 };
        if (!body.stream) return { content: [{ type: "text", text: a.text }], usage };
        return (async function* () {
          yield { type: "message_start", message: { usage: { input_tokens: usage.input_tokens, output_tokens: 1 } } };
          yield { type: "content_block_delta", delta: { type: "text_delta", text: a.text } };
          yield { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: usage.output_tokens } };
        })();
      },
    };
  },
}));

const db = vi.hoisted(() => ({
  engageSetting: {
    findMany: vi.fn(async () => state.settings),
    upsert: vi.fn(async ({ where, create, update }: { where: { key: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const existing = state.settings.find((s) => s.key === where.key);
      if (existing) Object.assign(existing, update, { updatedAt: new Date() });
      else state.settings.push({ ...(create as { key: string; value: unknown; updatedBy: string }), updatedAt: new Date() });
      return {};
    }),
  },
  engageAiCall: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      state.aiCalls.push(data);
      return data;
    }),
    groupBy: vi.fn(async () => [
      { model: "claude-haiku-4-5-20251001", _count: { _all: 3 }, _sum: { inputTokens: 600_000, outputTokens: 100_000 } },
      { model: "gpt-6-luna", _count: { _all: 2 }, _sum: { inputTokens: 1000, outputTokens: 200 } },
    ]),
  },
  $queryRaw: vi.fn(async (sql: { text: string; values: unknown[] }) => {
    state.raw.push({ text: sql.text, values: sql.values });
    return state.rawRows.shift() ?? [];
  }),
  auditLog: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { state.audit.push(data); return {}; }) },
}));

vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/adminAuth", () => ({ getAdminUser: vi.fn(async () => state.admin) }));

import { callCommentModelWithInfo, streamCommentModel } from "../../../lib/ai/commentModel";
import { recordAiCall } from "../../../lib/engage/aiUsage";
import { clearGlobalSettingsCache } from "../../../lib/engage/settings";
import { aiUsage, userAiCost } from "../../../lib/engage/aiQueries";
import { callCost, DEFAULT_AI_PRICES, FALLBACK_MODEL, PRIMARY_MODEL } from "../../../lib/ai/models";
import { GET as aiGET, PATCH as aiPATCH } from "../../../app/api/admin/engage/ai/route";
import { GET as promptsGET } from "../../../app/api/admin/engage/prompts/route";
import { ENGAGE_FEATURES } from "../../../lib/engage/features";

const ME = { userId: "u1", kind: "comments" as const };
const flush = () => new Promise((r) => setTimeout(r, 0));
const ADMIN = "https://admin.carouselabs.com";
const patch = (body: unknown) =>
  aiPATCH(new Request(`${ADMIN}/api/admin/engage/ai`, { method: "PATCH", headers: { "content-type": "application/json", origin: ADMIN }, body: JSON.stringify(body) }));

beforeEach(() => {
  sdk.luna = [];
  sdk.haiku = [];
  sdk.calls = [];
  state.settings = [{ key: "_", value: {}, updatedAt: new Date(), updatedBy: null }];
  state.aiCalls = [];
  state.audit = [];
  state.raw = [];
  state.rawRows = [];
  state.admin = { id: "admin1", email: "owner@carouselabs.com" };
  clearGlobalSettingsCache();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("which model goes first", () => {
  it("GPT Luna by default, recording its tokens; Haiku only as backup", async () => {
    sdk.luna = [{ text: '{"comment":"Order beats count."}', input: 900, output: 40 }];
    const res = await callCommentModelWithInfo("system", "user", "ext/generate", { engage: ME });
    expect(res.model).toBe(PRIMARY_MODEL);
    expect(sdk.calls.map((c) => c.provider)).toEqual(["luna"]);
    await flush();
    expect(state.aiCalls).toEqual([
      expect.objectContaining({
        userId: "u1", kind: "comments", feature: "comments", route: "ext/generate", model: PRIMARY_MODEL,
        fallback: false, streamed: false, outcome: "ok", inputTokens: 900, outputTokens: 40, firstTokenMs: null,
      }),
    ]);
    expect(typeof state.aiCalls[0].ms).toBe("number");
  });

  it("the feature's chosen model first (here Haiku for X replies, and so for X's Shorter/Longer)", async () => {
    state.settings.push({ key: "models", value: { x_replies: "haiku" }, updatedAt: new Date(), updatedBy: "owner" });
    sdk.haiku = [{ text: "ok", input: 50, output: 5 }];
    const res = await callCommentModelWithInfo("s", "u", "ext/x/rewrite", { engage: { userId: "u1", kind: "x_rewrites" } });
    expect(res.model).toBe(FALLBACK_MODEL);
    expect(sdk.calls.map((c) => c.provider)).toEqual(["haiku"]);
    await flush();
    expect(state.aiCalls[0]).toMatchObject({ kind: "x_rewrites", feature: "x_replies", model: FALLBACK_MODEL, fallback: false, outcome: "ok" });
    // LinkedIn comments are unaffected.
    sdk.luna = [{ text: "ok" }];
    await callCommentModelWithInfo("s", "u", "ext/generate", { engage: ME });
    expect(sdk.calls.at(-1)!.provider).toBe("luna");
  });

  it("falls back to the other model when the first errors or refuses, recording both calls", async () => {
    sdk.luna = ["error"];
    sdk.haiku = [{ text: "From Haiku", input: 70, output: 9 }];
    const res = await callCommentModelWithInfo("s", "u", "ext/connection-note", { engage: { userId: "u1", kind: "connection_notes" } });
    expect(res).toEqual({ raw: "From Haiku", model: FALLBACK_MODEL });
    await flush();
    expect(state.aiCalls.map((c) => [c.model, c.fallback, c.outcome, c.inputTokens])).toEqual([
      [PRIMARY_MODEL, false, "error", null],
      [FALLBACK_MODEL, true, "ok", 70],
    ]);

    state.aiCalls = [];
    sdk.luna = [{ text: "I'm sorry, I can't help with that." }];
    sdk.haiku = [{ text: "From Haiku" }];
    await callCommentModelWithInfo("s", "u", "ext/generate", { engage: ME });
    await flush();
    expect(state.aiCalls.map((c) => c.outcome)).toEqual(["refused", "ok"]);
  });

  it("records nothing when no caller is given", async () => {
    sdk.luna = [{ text: "ok" }];
    await callCommentModelWithInfo("s", "u", "ext/whatever");
    await flush();
    expect(state.aiCalls).toEqual([]);
  });
});

describe("streamed calls", () => {
  it("asks Luna for usage on the stream and records it, with time to first words", async () => {
    sdk.luna = [{ text: '{"comment":"x"}', input: 800, output: 25 }];
    const res = await streamCommentModel("s", "u", "ext/generate", { engage: ME });
    expect(res.model).toBe(PRIMARY_MODEL);
    expect(sdk.calls[0].body).toMatchObject({ stream: true, stream_options: { include_usage: true } });
    await flush();
    expect(state.aiCalls[0]).toMatchObject({ model: PRIMARY_MODEL, streamed: true, outcome: "ok", inputTokens: 800, outputTokens: 25 });
    expect(typeof state.aiCalls[0].firstTokenMs).toBe("number");
  });

  it("reads Haiku's tokens from message_start and message_delta when it writes", async () => {
    state.settings.push({ key: "models", value: { comments: "haiku" }, updatedAt: new Date(), updatedBy: "owner" });
    sdk.haiku = [{ text: "hi", input: 640, output: 33 }];
    const res = await streamCommentModel("s", "u", "ext/generate", { engage: ME });
    expect(res.model).toBe(FALLBACK_MODEL);
    await flush();
    expect(state.aiCalls[0]).toMatchObject({ model: FALLBACK_MODEL, streamed: true, inputTokens: 640, outputTokens: 33, outcome: "ok" });
  });

  it("a stop asked for by the caller is recorded as cancelled", async () => {
    sdk.luna = [{ text: "x" }];
    const controller = new AbortController();
    controller.abort();
    await expect(streamCommentModel("s", "u", "ext/generate", { engage: ME, signal: controller.signal })).rejects.toBeTruthy();
    await flush();
    expect(state.aiCalls[0]).toMatchObject({ outcome: "cancelled" });
  });
});

describe("recording never breaks a request", () => {
  it("swallows a failed or broken write", async () => {
    db.engageAiCall.create.mockRejectedValueOnce(new Error("db down"));
    expect(() => recordAiCall(ME, "r", { model: "m", fallback: false, streamed: false, outcome: "ok", inputTokens: 1, outputTokens: 1, firstTokenMs: null, ms: 5 })).not.toThrow();
    db.engageAiCall.create.mockImplementationOnce(() => {
      throw new Error("thrown before the promise");
    });
    expect(() => recordAiCall(ME, "r", { model: "m", fallback: false, streamed: false, outcome: "ok", inputTokens: 1, outputTokens: 1, firstTokenMs: null, ms: 5 })).not.toThrow();
    await flush();
  });
});

describe("cost", () => {
  it("is tokens × price per million, unknown without a price or tokens", () => {
    expect(callCost({ input: 1, output: 5 }, 1_000_000, 200_000)).toBe(2);
    expect(callCost(undefined, 10, 10)).toBeNull();
    expect(callCost({ input: 1, output: 5 }, null, 10)).toBeNull();
    expect(DEFAULT_AI_PRICES[FALLBACK_MODEL]).toEqual({ input: 1, output: 5 });
    expect(DEFAULT_AI_PRICES[PRIMARY_MODEL]).toBeUndefined();
  });

  it("adds up per feature, per day and per user, and names models with no price", async () => {
    const from = new Date("2026-10-01T00:00:00Z");
    const to = new Date("2026-10-03T00:00:00Z");
    state.rawRows = [
      [
        { feature: "comments", model: PRIMARY_MODEL, calls: 10n, ok: 9n, fallback: 0n, failed: 1n, refused: 0n, inputTokens: 10000n, outputTokens: 500n, avgMs: 1200.4, p95Ms: 2500, avgFirstTokenMs: 400 },
        { feature: "comments", model: FALLBACK_MODEL, calls: 1n, ok: 1n, fallback: 1n, failed: 0n, refused: 0n, inputTokens: 1_000_000n, outputTokens: 200_000n, avgMs: 3000, p95Ms: 3000, avgFirstTokenMs: null },
      ],
      [{ day: "2026-10-02", model: FALLBACK_MODEL, calls: 1n, inputTokens: 1_000_000n, outputTokens: 200_000n }],
      [{ userId: "u1", email: "sam@example.com", calls: 11n, inputTokens: 1_010_000n, outputTokens: 200_500n, cost: 2 }],
    ];
    const u = await aiUsage(from, to, "all", DEFAULT_AI_PRICES);
    expect(u.recording).toBe(true);
    expect(u.totals).toMatchObject({ calls: 11, ok: 10, fallback: 1, failed: 1, cost: 2, unpricedModels: [PRIMARY_MODEL] });
    expect(u.byFeature.find((r) => r.model === PRIMARY_MODEL)!.cost).toBeNull();
    expect(u.byFeature.find((r) => r.model === FALLBACK_MODEL)!.cost).toBe(2);
    expect(u.series).toEqual([
      { date: "2026-10-01", calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      { date: "2026-10-02", calls: 1, inputTokens: 1_000_000, outputTokens: 200_000, cost: 2 },
    ]);
    expect(u.topUsers[0]).toEqual({ userId: "u1", email: "sam@example.com", calls: 11, inputTokens: 1_010_000, outputTokens: 200_500, cost: 2 });
    // Users are ordered by cost in SQL, at the prices given.
    expect(state.raw[2].values).toEqual(expect.arrayContaining([FALLBACK_MODEL, 1, 5]));
  });

  it("filters to one extension's features", async () => {
    await aiUsage(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-02T00:00:00Z"), "x", {});
    expect(state.raw[0].text).toMatch(/c\.feature IN/);
    expect(state.raw[0].values).toEqual(expect.arrayContaining(["x_replies", "x_messages"]));
    state.raw = [];
    await aiUsage(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-02T00:00:00Z"), "linkedin", {});
    expect(state.raw[0].text).toMatch(/c\.feature NOT IN/);
  });

  it("says nothing is recorded yet before the phase C SQL has run", async () => {
    db.$queryRaw.mockRejectedValueOnce(new Error('Raw query failed. Code: `42P01`. Message: `relation "EngageAiCall" does not exist`'));
    const u = await aiUsage(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-02T00:00:00Z"), "all", {});
    expect(u.recording).toBe(false);
    expect(u.series).toHaveLength(1);
    db.$queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    await expect(aiUsage(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-02T00:00:00Z"), "all", {})).rejects.toThrow("connection refused");
  });

  it("one user's month: priced models cost, unpriced ones are flagged", async () => {
    expect(await userAiCost("u1", new Date("2026-10-01T00:00:00Z"), DEFAULT_AI_PRICES)).toEqual({ calls: 5, cost: 1.1, unpriced: true });
  });
});

describe("AI admin API", () => {
  it("shows usage, the models and the prices; refuses an unknown extension", async () => {
    const res = await aiGET(new Request(`${ADMIN}/api/admin/engage/ai?range=7d&platform=x`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ settingsReady: true, prices: { [FALLBACK_MODEL]: { input: 1, output: 5 } } });
    expect((body.models as Record<string, string>).x_replies).toBe("luna");
    expect((await aiGET(new Request(`${ADMIN}/api/admin/engage/ai?range=7d&platform=fb`))).status).toBe(400);
  });

  it("switches a feature's model and logs it", async () => {
    const res = await patch({ model: { feature: "x_messages", key: "haiku" }, reason: "Luna was slow on X" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { models: Record<string, string> }).models.x_messages).toBe("haiku");
    expect(state.audit[0]).toMatchObject({
      action: "ENGAGE_SET_AI_MODEL",
      details: "X messages now writes with Claude Haiku 4.5 first (GPT Luna as backup)",
      oldValue: { x_messages: "luna" },
      newValue: { x_messages: "haiku" },
      reason: "Luna was slow on X",
    });
  });

  it("sets a price, refuses a nonsense one, and needs the settings table", async () => {
    // A changed Haiku price, then Luna's: Haiku's stays as changed.
    expect((await patch({ price: { model: FALLBACK_MODEL, input: 2, output: 8 } })).status).toBe(200);
    const res = await patch({ price: { model: PRIMARY_MODEL, input: 0.4, output: 1.6 } });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { prices: Record<string, unknown> }).prices).toEqual({
      [FALLBACK_MODEL]: { input: 2, output: 8 },
      [PRIMARY_MODEL]: { input: 0.4, output: 1.6 },
    });
    state.audit.shift();
    expect(state.audit[0]).toMatchObject({ action: "ENGAGE_SET_AI_PRICE", newValue: { [PRIMARY_MODEL]: { input: 0.4, output: 1.6 } } });
    expect((await patch({ price: { model: PRIMARY_MODEL, input: -1, output: 1 } })).status).toBe(400);
    expect((await patch({ model: { feature: "comments", key: "gpt-9" } })).status).toBe(400);
    state.admin = null;
    expect((await patch({ model: { feature: "comments", key: "haiku" } })).status).toBe(403);
    state.admin = { id: "admin1", email: "owner@carouselabs.com" };
    db.engageSetting.findMany.mockRejectedValueOnce(
      Object.assign(new (await import("@prisma/client")).Prisma.PrismaClientKnownRequestError("missing", { code: "P2021", clientVersion: "t" })),
    );
    expect((await patch({ model: { feature: "comments", key: "haiku" } })).status).toBe(409);
  });

  it("shows what every feature sends the AI, read-only", async () => {
    const { prompts } = (await (await promptsGET(new Request(`${ADMIN}/api/admin/engage/prompts`))).json()) as {
      prompts: Array<{ feature: string; system: string; user: string }>;
    };
    expect(new Set(prompts.map((p) => p.feature))).toEqual(new Set(ENGAGE_FEATURES));
    for (const p of prompts) {
      expect(p.system.length).toBeGreaterThan(200);
      expect(p.user.length).toBeGreaterThan(50);
    }
  });
});
