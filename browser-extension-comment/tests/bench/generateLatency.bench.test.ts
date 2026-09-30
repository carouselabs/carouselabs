// End-to-end latency of POST /api/ext/generate, with the REAL route code and
// the REAL AI models. Only the in-region infrastructure is stood in for —
// Prisma, the bearer-token lookup, the Upstash daily limit and the free-use
// reservation — because Supabase and Upstash both sit in ap-south-1 next to
// the bom1 functions (a few ms each in production), and because the database
// this machine would reach is production data.
//
//   BENCH_MODES=json,stream  which response modes to time (default: both)
//   BENCH_REPS=2              passes over every post x profile combination
//   BENCH_OUT=path.json       also write every run's raw numbers (and the
//                             comments themselves, for review) there
//   BENCH_MODEL=haiku         skip Luna (fails instantly, no network) so the
//                             route runs on its Haiku fallback: what the
//                             numbers would be with Haiku as the primary
//
// "First visible text" is when the panel would first have comment text to
// show: the whole JSON body for the non-streaming response, the first `text`
// event for the streaming one.
import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ profile: null as null | Record<string, unknown>, modelCalls: 0 }));

vi.mock("../../../lib/db", () => ({
  db: {
    commentProfile: { findFirst: vi.fn(async () => state.profile) },
    commentHistory: { create: vi.fn(async () => ({ id: "bench-history" })) },
  },
}));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => ({ id: "bench-user", email: "bench@example.com" })),
}));
vi.mock("../../../lib/extDailyLimit", () => ({ extDailyLimitResponse: vi.fn(async () => null) }));
vi.mock("openai", async (importOriginal) => {
  const real = await importOriginal<{ default: unknown }>();
  if (process.env.BENCH_MODEL !== "haiku") return real;
  return {
    ...real,
    default: class {
      chat = {
        completions: {
          create: async () => {
            throw new Error("benchmark: Luna disabled, measuring the Haiku path");
          },
        },
      };
    },
  };
});
vi.mock("../../../lib/extAccess", () => ({
  reserveExtGeneration: vi.fn(async () => ({ ok: true, freeRemaining: null, release: async () => {} })),
}));
// Counts model calls per request, so retries (a second full generation) show
// up in the numbers rather than hiding inside them.
vi.mock("../../../lib/ai/commentModel", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  const wrap = (fn: unknown) =>
    typeof fn === "function"
      ? (...args: unknown[]) => {
          state.modelCalls += 1;
          return (fn as (...a: unknown[]) => unknown)(...args);
        }
      : fn;
  return { ...real, callCommentModel: wrap(real.callCommentModel), streamCommentModel: wrap(real.streamCommentModel) };
});

import { POST } from "../../../app/api/ext/generate/route";
import { POSTS, PROFILES } from "./fixtures";

type Mode = "json" | "stream";

interface Run {
  mode: Mode;
  profile: string;
  post: number;
  ok: boolean;
  status: number;
  firstVisibleMs: number;
  totalMs: number;
  modelCalls: number;
  chars: number;
  comment: string;
  // The route's own "[ext/generate] attempt N: ..." rejection messages.
  rejections: string[];
  serverTiming?: unknown;
}

function request(mode: Mode, profileId: string, post: (typeof POSTS)[number]) {
  return new Request("https://carouselabs.com/api/ext/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer cl_cmt_bench",
      ...(mode === "stream" ? { Accept: "text/event-stream" } : {}),
    },
    body: JSON.stringify({ profileId, post }),
  });
}

async function runOnce(mode: Mode, profile: (typeof PROFILES)[number], postIndex: number): Promise<Run> {
  const rejections: string[] = [];
  const warn = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const line = args.map(String).join(" ");
    if (line.includes("[ext/generate]")) rejections.push(line.slice(0, 200));
  });
  try {
    return await timeOnce(mode, profile, postIndex, rejections);
  } finally {
    warn.mockRestore();
  }
}

async function timeOnce(
  mode: Mode,
  profile: (typeof PROFILES)[number],
  postIndex: number,
  rejections: string[],
): Promise<Run> {
  state.profile = profile;
  state.modelCalls = 0;
  const post = POSTS[postIndex];
  const t0 = performance.now();
  const res = await POST(request(mode, profile.id, post));
  const base = { mode, profile: profile.name, post: postIndex, status: res.status, rejections };

  const streaming = (res.headers.get("content-type") ?? "").includes("text/event-stream");
  if (!streaming) {
    const body = (await res.json()) as { comment?: string };
    const totalMs = performance.now() - t0;
    return {
      ...base,
      ok: res.ok && !!body.comment,
      firstVisibleMs: totalMs,
      totalMs,
      modelCalls: state.modelCalls,
      chars: body.comment?.length ?? 0,
      comment: body.comment ?? "",
      serverTiming: res.headers.get("server-timing"),
    };
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let firstVisibleMs = NaN;
  let final: { comment?: string; timing?: unknown } | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const event = /^event: (.*)$/m.exec(frame)?.[1];
      const data = JSON.parse(/^data: (.*)$/m.exec(frame)?.[1] ?? "{}");
      if (event === "text" && data.text && Number.isNaN(firstVisibleMs)) firstVisibleMs = performance.now() - t0;
      if (event === "final") final = data;
    }
  }
  const totalMs = performance.now() - t0;
  return {
    ...base,
    ok: !!final?.comment,
    firstVisibleMs: Number.isNaN(firstVisibleMs) ? totalMs : firstVisibleMs,
    totalMs,
    modelCalls: state.modelCalls,
    chars: final?.comment?.length ?? 0,
    comment: final?.comment ?? "",
    serverTiming: final?.timing,
  };
}

const pct = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

describe("Generate latency (real models)", () => {
  it("times every post x profile combination", async () => {
    const modes = (process.env.BENCH_MODES ?? "json,stream").split(",") as Mode[];
    const reps = Number(process.env.BENCH_REPS ?? 2);
    const runs: Run[] = [];

    for (let rep = 0; rep < reps; rep++) {
      for (let postIndex = 0; postIndex < POSTS.length; postIndex++) {
        for (const profile of PROFILES) {
          // Alternated per combination, so drift in API latency over the run
          // hits both modes equally.
          const order = rep % 2 === 0 ? modes : [...modes].reverse();
          for (const mode of order) runs.push(await runOnce(mode, profile, postIndex));
        }
      }
    }

    if (process.env.BENCH_OUT) fs.writeFileSync(process.env.BENCH_OUT, JSON.stringify(runs, null, 2));

    const lines: string[] = [];
    for (const mode of modes) {
      const mine = runs.filter((r) => r.mode === mode && r.ok);
      const fv = mine.map((r) => r.firstVisibleMs);
      const total = mine.map((r) => r.totalMs);
      const retried = mine.filter((r) => r.modelCalls > 1).length;
      lines.push(
        `${mode.padEnd(6)} n=${mine.length}/${runs.filter((r) => r.mode === mode).length}` +
          ` | first visible p50 ${Math.round(pct(fv, 50))} p75 ${Math.round(pct(fv, 75))} p95 ${Math.round(pct(fv, 95))} ms` +
          ` | total p50 ${Math.round(pct(total, 50))} p75 ${Math.round(pct(total, 75))} p95 ${Math.round(pct(total, 95))} ms` +
          ` | runs with >1 model call: ${retried}`,
      );
    }
    // Straight to stdout: vitest hides console output from passing tests.
    process.stdout.write(`\n${lines.join("\n")}\n\n`);
    expect(runs.some((r) => r.ok)).toBe(true);
  });
});
