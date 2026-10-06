// Paired comparison of the Generate rules before and after 2026-10-06, with
// the REAL route code and the REAL models (same stand-ins as
// generateLatency.bench.test.ts: no database, sign-in, limits or free-use
// gate). Each post x profile is run once under each rule set, back to back,
// the order swapped every pair, so drift in the providers' speed during the
// run falls on both sides alike.
//
//   baseline  the older rules: no hand-over to the backup model before the
//             10s stream-idle limit (ENGAGE_FIRST_TEXT_MS=10000), and any
//             comment outside its length range written again (no slack)
//   updated   today's rules: hand-over after 4s without words, 10% slack on
//             the rough length buckets (explicit ranges stay exact)
//
// What is timed is the whole logical request the person waits for: every
// attempt, any fallback, until the final checked comment (or the failure).
//
//   BENCH_PAIRS_REPS=2       passes over every post x profile (default 2)
//   BENCH_OUT=path.json      also write every run's numbers there
//
// Costs a few cents per pass (Luna first, Haiku when it falls back).
import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ profile: null as null | Record<string, unknown>, modelCalls: 0, baseline: false }));

vi.mock("../../../lib/db", () => ({
  db: {
    commentProfile: { findFirst: vi.fn(async () => state.profile) },
    commentHistory: { create: vi.fn(async () => ({ id: "bench-history" })) },
  },
}));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => ({ id: "bench-user", email: "bench@example.com" })),
}));
vi.mock("../../../lib/engage/gate", () => ({
  engagePreflight: vi.fn(async () => ({ response: null, loaded: null })),
  reserveEngageGeneration: vi.fn(async () => ({ ok: true, freeRemaining: null, release: async () => {} })),
}));
// The baseline's "no slack": every comment outside min-max is written again.
vi.mock("../../../lib/ai/prompts/commentPrompt", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return { ...real, lengthSlack: (length: string) => (state.baseline ? 0 : (real.lengthSlack as (l: string) => number)(length)) };
});
vi.mock("../../../lib/ai/commentModel", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  const streamCommentModel = real.streamCommentModel as (...a: unknown[]) => unknown;
  return {
    ...real,
    streamCommentModel: (...args: unknown[]) => {
      state.modelCalls += 1;
      return streamCommentModel(...args);
    },
  };
});

import { POST } from "../../../app/api/ext/generate/route";
import { POSTS, PROFILES } from "./fixtures";

type Variant = "baseline" | "updated";

interface Run {
  variant: Variant;
  pair: number;
  profile: string;
  post: number;
  ok: boolean;
  firstVisibleMs: number;
  totalMs: number;
  attempts: number;
  model: string;
  rejections: string[];
}

async function runOnce(variant: Variant, pair: number, profile: (typeof PROFILES)[number], postIndex: number): Promise<Run> {
  state.baseline = variant === "baseline";
  if (state.baseline) process.env.ENGAGE_FIRST_TEXT_MS = "10000";
  else delete process.env.ENGAGE_FIRST_TEXT_MS;
  state.profile = profile;
  state.modelCalls = 0;
  const rejections: string[] = [];
  const warn = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const line = args.map(String).join(" ");
    if (line.includes("[ext/generate]")) rejections.push(line.slice(0, 160));
  });
  const t0 = performance.now();
  try {
    const res = await POST(
      new Request("https://carouselabs.com/api/ext/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_bench", Accept: "text/event-stream" },
        body: JSON.stringify({ profileId: profile.id, post: POSTS[postIndex] }),
      }),
    );
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let firstVisibleMs = NaN;
    let final: { comment?: string; timing?: { model?: string } } | null = null;
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
      variant,
      pair,
      profile: profile.name,
      post: postIndex,
      ok: !!final?.comment,
      firstVisibleMs: Number.isNaN(firstVisibleMs) ? totalMs : firstVisibleMs,
      totalMs,
      attempts: state.modelCalls,
      model: final?.timing?.model ?? "-",
      rejections,
    };
  } finally {
    warn.mockRestore();
    delete process.env.ENGAGE_FIRST_TEXT_MS;
  }
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length === 0 ? NaN : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

describe("Generate rules, paired (real models)", () => {
  it("runs every post x profile under both rule sets, alternating", async () => {
    const reps = Number(process.env.BENCH_PAIRS_REPS ?? 2);
    const runs: Run[] = [];
    let pair = 0;
    for (let rep = 0; rep < reps; rep++) {
      for (let postIndex = 0; postIndex < POSTS.length; postIndex++) {
        for (const profile of PROFILES) {
          const order: Variant[] = pair % 2 === 0 ? ["baseline", "updated"] : ["updated", "baseline"];
          for (const variant of order) runs.push(await runOnce(variant, pair, profile, postIndex));
          pair += 1;
        }
      }
    }
    if (process.env.BENCH_OUT) fs.writeFileSync(process.env.BENCH_OUT, JSON.stringify(runs, null, 2));

    const lines: string[] = [];
    for (const variant of ["baseline", "updated"] as Variant[]) {
      const mine = runs.filter((r) => r.variant === variant);
      const ok = mine.filter((r) => r.ok);
      const total = ok.map((r) => r.totalMs);
      lines.push(
        `${variant.padEnd(8)} n=${mine.length} failures=${mine.length - ok.length}` +
          ` | total median ${Math.round(median(total))} max ${Math.round(Math.max(...total))} ms` +
          ` | first text median ${Math.round(median(ok.map((r) => r.firstVisibleMs)))} ms` +
          ` | second generations ${mine.filter((r) => r.attempts > 1).length}` +
          ` | answered by Haiku ${mine.filter((r) => r.model.includes("haiku")).length}`,
      );
    }
    // Per pair: updated minus baseline, the same post and profile.
    const diffs: number[] = [];
    for (let p = 0; p < pair; p++) {
      const b = runs.find((r) => r.pair === p && r.variant === "baseline");
      const u = runs.find((r) => r.pair === p && r.variant === "updated");
      if (b?.ok && u?.ok) diffs.push(u.totalMs - b.totalMs);
    }
    lines.push(`paired difference (updated - baseline), median ${Math.round(median(diffs))} ms over ${diffs.length} pairs`);
    process.stdout.write(`\n${lines.join("\n")}\n\n`);
    expect(runs.some((r) => r.ok)).toBe(true);
  });
});
