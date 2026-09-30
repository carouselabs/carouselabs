// Splits Luna's time-to-first-token into OpenAI's own processing time (the
// `openai-processing-ms` response header) and everything else (network, TLS),
// and reports prompt size and prompt-cache hits for the real Generate prompts.
// Same cost and run instructions as generateLatency.bench.test.ts.
import { describe, expect, it } from "vitest";
import OpenAI from "openai";
import {
  buildCommentSystemMessage,
  buildCommentUserMessage,
} from "../../../lib/ai/prompts/commentPrompt";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });

const PROFILE = {
  whoIAm: "An experienced professional in this field who adds real value",
  goal: "adds one useful insight",
  tone: "professional",
  length: "Medium (2-3 lines)",
  emoji: "None",
  language: "English",
  alwaysDo: null,
  neverDo: null,
  samples: [],
};
const POST = {
  author: "Priya Raman",
  headline: "Head of Growth at a B2B SaaS company",
  type: "text",
  url: "https://www.linkedin.com/feed/update/urn:li:activity:1",
  text: "We cut our onboarding from 14 steps to 5 last quarter. Activation went from 31% to 48%.\n\nThe biggest win wasn't removing steps. It was moving the \"invite your team\" prompt to AFTER the first real result.",
};

const pct = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]);
};

describe("Luna time-to-first-token breakdown", () => {
  it("measures processing vs network, prompt size and cache hits", async () => {
    const system = buildCommentSystemMessage(PROFILE);
    const user = buildCommentUserMessage(POST);
    const rows: { ttft: number; processing: number; total: number; prompt: number; cached: number; output: number }[] = [];

    for (let i = 0; i < Number(process.env.BENCH_TTFT_RUNS ?? 12); i++) {
      const t0 = performance.now();
      const { data: stream, response } = await openai.chat.completions
        .create({
          model: "gpt-6-luna",
          max_completion_tokens: 1024,
          reasoning_effort: "none",
          stream: true,
          stream_options: { include_usage: true },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        })
        .withResponse();
      let ttft = NaN;
      let usage: OpenAI.CompletionUsage | undefined;
      for await (const chunk of stream) {
        if (Number.isNaN(ttft) && chunk.choices[0]?.delta?.content) ttft = performance.now() - t0;
        if (chunk.usage) usage = chunk.usage;
      }
      rows.push({
        ttft,
        processing: Number(response.headers.get("openai-processing-ms")),
        total: performance.now() - t0,
        prompt: usage?.prompt_tokens ?? NaN,
        cached: usage?.prompt_tokens_details?.cached_tokens ?? 0,
        output: usage?.completion_tokens ?? NaN,
      });
    }

    const col = (k: keyof (typeof rows)[number]) => rows.map((r) => r[k]);
    process.stdout.write(
      [
        "",
        `prompt: ${system.length + user.length} chars, ${rows[0].prompt} tokens; output p50 ${pct(col("output"), 50)} tokens`,
        `cached prompt tokens per run: ${col("cached").join(", ")}`,
        `client TTFT            p50 ${pct(col("ttft"), 50)}  p95 ${pct(col("ttft"), 95)} ms`,
        `openai-processing-ms   p50 ${pct(col("processing"), 50)}  p95 ${pct(col("processing"), 95)} ms`,
        `TTFT minus processing  p50 ${pct(rows.map((r) => r.ttft - r.processing), 50)} ms (network + TLS from this machine)`,
        `total                  p50 ${pct(col("total"), 50)}  p95 ${pct(col("total"), 95)} ms`,
        "",
      ].join("\n"),
    );
    expect(rows.every((r) => !Number.isNaN(r.ttft))).toBe(true);
  });
});
