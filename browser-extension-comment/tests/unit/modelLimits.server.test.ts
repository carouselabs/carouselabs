// @vitest-environment node
// lib/ai/commentModel.ts's time limits: a model that hangs, or a stream that
// goes quiet half-way, is cut off and the other model tried, and the whole
// request stops once its budget is spent, so no route can keep the side panel
// waiting. The SDK clients are stood in for by calls that never answer until
// they are aborted, the way a stalled connection behaves.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Behaviour = "hang" | { text: string } | { stallAfter: string };

const sdk = vi.hoisted(() => ({
  luna: [] as Behaviour[],
  haiku: [] as Behaviour[],
  lunaCalls: 0,
  haikuCalls: 0,
}));

const aborted = () => Object.assign(new Error("Request was aborted."), { name: "AbortError" });

function untilAborted(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_, reject) => {
    if (signal?.aborted) reject(aborted());
    signal?.addEventListener("abort", () => reject(aborted()), { once: true });
  });
}

// One call's answer: never (until aborted), all at once, or a stream that
// sends some text and then goes quiet.
async function answer(
  behaviour: Behaviour | undefined,
  stream: boolean,
  signal: AbortSignal | undefined,
  wrap: (text: string) => unknown,
  whole: (text: string) => unknown,
) {
  if (!behaviour) throw new Error("test ran out of scripted answers");
  if (behaviour === "hang") return untilAborted(signal);
  if (!stream) return whole("text" in behaviour ? behaviour.text : behaviour.stallAfter);
  return (async function* () {
    if ("text" in behaviour) {
      yield wrap(behaviour.text);
      return;
    }
    yield wrap(behaviour.stallAfter);
    await untilAborted(signal);
  })();
}

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: (body: { stream?: boolean }, opts?: { signal?: AbortSignal }) => {
          sdk.lunaCalls += 1;
          return answer(
            sdk.luna.shift(),
            !!body.stream,
            opts?.signal,
            (content) => ({ choices: [{ delta: { content } }] }),
            (content) => ({ choices: [{ message: { content } }] }),
          );
        },
      },
    };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: (body: { stream?: boolean }, opts?: { signal?: AbortSignal }) => {
        sdk.haikuCalls += 1;
        return answer(
          sdk.haiku.shift(),
          !!body.stream,
          opts?.signal,
          (text) => ({ type: "content_block_delta", delta: { type: "text_delta", text } }),
          (text) => ({ content: [{ type: "text", text }] }),
        );
      },
    };
  },
}));

import {
  callCommentModel,
  generationDeadline,
  GenerationTimeout,
  GENERATION_BUDGET_MS,
  streamCommentModel,
  FALLBACK_MODEL,
  PRIMARY_MODEL,
} from "../../../lib/ai/commentModel";

const OK = '{"comment":"Fine."}';

// Runs `promise` while fake time moves on in 1s steps, and returns how long
// it took to settle (in fake ms) along with its outcome.
async function timed<T>(promise: Promise<T>, maxMs = 120_000) {
  const start = Date.now();
  let outcome: { value?: T; error?: unknown } | null = null;
  promise.then(
    (value) => (outcome = { value }),
    (error) => (outcome = { error }),
  );
  while (!outcome && Date.now() - start < maxMs) await vi.advanceTimersByTimeAsync(1_000);
  return { ms: Date.now() - start, ...(outcome ?? { error: new Error("never settled") }) };
}

beforeEach(() => {
  vi.useFakeTimers();
  sdk.luna = [];
  sdk.haiku = [];
  sdk.lunaCalls = 0;
  sdk.haikuCalls = 0;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("one-shot calls (rewrite, notes, messages, profile test)", () => {
  it("gives up on a Luna that never answers after 15s and asks Haiku", async () => {
    sdk.luna = ["hang"];
    sdk.haiku = [{ text: OK }];
    const result = await timed(callCommentModel("s", "u", "test", { deadline: generationDeadline() }));
    expect(result.value).toBe(OK);
    expect(result.ms).toBeGreaterThanOrEqual(15_000);
    expect(result.ms).toBeLessThanOrEqual(16_000);
  });

  it("fails, rather than waits, when both models hang", async () => {
    sdk.luna = ["hang"];
    sdk.haiku = ["hang"];
    const result = await timed(callCommentModel("s", "u", "test", { deadline: generationDeadline() }));
    expect(result.error).toBeInstanceOf(Error);
    expect(result.ms).toBeLessThanOrEqual(36_000);
  });

  it("starts no call once the request's budget is spent", async () => {
    const deadline = generationDeadline();
    vi.setSystemTime(Date.now() + GENERATION_BUDGET_MS - 1_000);
    await expect(callCommentModel("s", "u", "test", { deadline })).rejects.toBeInstanceOf(GenerationTimeout);
    expect(sdk.lunaCalls).toBe(0);
  });

  it("cuts Haiku's time to what the budget has left", async () => {
    const deadline = generationDeadline();
    vi.setSystemTime(Date.now() + GENERATION_BUDGET_MS - 12_000);
    sdk.luna = ["hang"];
    sdk.haiku = ["hang"];
    // Luna gets the 12s left, then nothing is left for Haiku.
    const result = await timed(callCommentModel("s", "u", "test", { deadline }));
    expect(result.error).toBeInstanceOf(GenerationTimeout);
    expect(result.ms).toBeLessThanOrEqual(13_000);
    expect(sdk.haikuCalls).toBe(0);
  });
});

describe("streamed calls (Generate)", () => {
  it("answers straight away when nothing stalls", async () => {
    sdk.luna = [{ text: OK }];
    const result = await timed(streamCommentModel("s", "u", "test", { deadline: generationDeadline() }));
    expect(result.value).toMatchObject({ raw: OK, model: PRIMARY_MODEL });
    expect(result.ms).toBeLessThanOrEqual(1_000);
  });

  it("drops a Luna stream that goes quiet half-way, and Haiku starts over", async () => {
    sdk.luna = [{ stallAfter: '{"comment":"Half' }];
    sdk.haiku = [{ text: OK }];
    const onReset = vi.fn();
    const result = await timed(streamCommentModel("s", "u", "test", { deadline: generationDeadline(), onReset }));
    expect(result.value).toMatchObject({ raw: OK, model: FALLBACK_MODEL });
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(result.ms).toBeGreaterThanOrEqual(10_000);
    expect(result.ms).toBeLessThanOrEqual(11_000);
  });

  it("drops a Luna stream that never starts", async () => {
    sdk.luna = ["hang"];
    sdk.haiku = [{ text: OK }];
    const result = await timed(streamCommentModel("s", "u", "test", { deadline: generationDeadline() }));
    expect(result.value).toMatchObject({ model: FALLBACK_MODEL });
    expect(result.ms).toBeLessThanOrEqual(11_000);
  });

  it("fails, rather than waits, when Haiku stalls too", async () => {
    sdk.luna = [{ stallAfter: "{" }];
    sdk.haiku = [{ stallAfter: "{" }];
    const result = await timed(streamCommentModel("s", "u", "test", { deadline: generationDeadline() }));
    expect(String((result.error as Error)?.message)).toMatch(/quiet/);
    expect(result.ms).toBeLessThanOrEqual(21_000);
  });

  it("a stop asked for by the caller (an invented figure) is not treated as a stall", async () => {
    sdk.luna = [{ stallAfter: "{" }];
    const controller = new AbortController();
    const promise = streamCommentModel("s", "u", "test", { deadline: generationDeadline(), signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow();
    expect(sdk.haikuCalls).toBe(0);
  });
});
