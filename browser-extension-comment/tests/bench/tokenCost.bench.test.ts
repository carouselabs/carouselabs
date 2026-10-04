// What one comment costs in AI fees, measured rather than estimated: the real
// Generate prompts for every post x profile in ./fixtures go to both models
// once each, and the token counts the APIs report are priced at list rates.
// Same cost and run instructions as generateLatency.bench.test.ts.
import { describe, expect, it } from "vitest";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { buildCommentSystemMessage, buildCommentUserMessage } from "../../../lib/ai/prompts/commentPrompt";
import { POSTS, PROFILES } from "./fixtures";

// USD per 1M tokens, list prices checked 2026-09-30:
// developers.openai.com/api/docs/pricing (gpt-6-luna, Standard, short context)
// platform.claude.com/docs/en/about-claude/pricing (Claude Haiku 4.5)
const PRICE = {
  luna: { input: 0.1, output: 0.5 },
  haiku: { input: 1, output: 5 },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });

interface Usage {
  input: number;
  output: number;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

describe("AI cost per comment", () => {
  it("prices real token usage for Luna and Haiku", async () => {
    const luna: Usage[] = [];
    const haiku: Usage[] = [];

    for (const post of POSTS) {
      for (const profile of PROFILES) {
        const system = buildCommentSystemMessage(profile);
        const user = buildCommentUserMessage(post);

        const l = await openai.chat.completions.create({
          model: "gpt-6-luna",
          max_completion_tokens: 1024,
          reasoning_effort: "none",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });
        luna.push({ input: l.usage?.prompt_tokens ?? NaN, output: l.usage?.completion_tokens ?? NaN });

        const h = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system,
          messages: [{ role: "user", content: user }],
        });
        haiku.push({ input: h.usage.input_tokens, output: h.usage.output_tokens });
      }
    }

    const line = (name: string, usage: Usage[], price: { input: number; output: number }) => {
      const input = mean(usage.map((u) => u.input));
      const output = mean(usage.map((u) => u.output));
      const perCall = (input * price.input + output * price.output) / 1_000_000;
      return `${name.padEnd(6)} avg ${Math.round(input)} in / ${Math.round(output)} out tokens -> $${perCall.toFixed(6)} per model call`;
    };
    process.stdout.write(`\n${line("Luna", luna, PRICE.luna)}\n${line("Haiku", haiku, PRICE.haiku)}\n\n`);

    expect(luna.every((u) => u.input > 0) && haiku.every((u) => u.input > 0)).toBe(true);
  });
});
