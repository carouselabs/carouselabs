// The AI agent builder with the REAL route code and the REAL models (no
// database, sign-in or limits: stood in for, as in the other benches). One
// person, answering from a script, goes through the whole flow:
//   describe → interview (until done or MAX_QUESTIONS) → draft → refine →
//   a reply to a sample conversation written by the agent they built.
// Prints every question, the setup and the reply, so their quality can be
// read, and checks what the code guarantees: valid answers, no repeated
// question, no invented fact, the person's rules kept through refining.
//
// Costs about a cent per run (Luna first, Haiku when it falls back).
//   npx vitest run --config vitest.bench.config.ts tests/bench/agentBuilder.bench.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/db", () => ({
  db: {
    engageAiCall: { count: vi.fn(async () => 0), create: vi.fn(() => Promise.resolve({})) },
    messageProfile: { findFirst: vi.fn(async () => null) },
    engageAgent: { findFirst: vi.fn(async () => state.agent) },
    commentHistory: { create: vi.fn(async () => ({ id: "bench-history" })) },
  },
}));
const state = vi.hoisted(() => ({ agent: null as null | Record<string, unknown> }));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => ({ id: "bench-user", email: "bench@example.com" })),
  extensionCallerPlatform: vi.fn(() => "linkedin"),
}));
vi.mock("../../../lib/engage/gate", () => ({
  engagePreflight: vi.fn(async () => ({ response: null, loaded: null })),
  reserveEngageGeneration: vi.fn(async () => ({ ok: true, freeRemaining: null, release: async () => {} })),
}));

import { POST as builderPOST } from "../../../app/api/ext/agents/builder/route";
import { POST as messagePOST } from "../../../app/api/ext/message/route";
import { MAX_QUESTIONS } from "../../../lib/engage/agentBuilder";

const DESCRIPTION =
  "I run a SaaS company that helps people create LinkedIn content. I want to connect with founders and creators, understand their challenges, build relationships, and introduce our product when it is relevant. My messages should sound natural and not overly promotional.";

// What the scripted person says to each kind of question (by keyword).
const SCRIPT: [RegExp, string][] = [
  [/what does (your|the) (product|tool)|product (help|do)|valuable|your offer|service/i, "It turns one idea into a week of LinkedIn posts in the founder's own voice, so they can post consistently in about 20 minutes a week."],
  [/avoid|never|restrict|not say|off-limits|beyond/i, "Never send links in the first messages, never pitch before they've shared a problem, no competitor talk."],
  [/price|cost|fact|feature|claim|result|number/i, "Pro is $29 a month and there's a free plan. It turns one idea into a week of posts. Don't claim any customer results."],
  [/audience|who|ideal|talk to|founder|creator|customer/i, "Seed to Series A B2B SaaS founders and solo creators who struggle to post consistently."],
  [/next step|call|demo|meeting|goal|achieve|success/i, "A 15-minute call, but only once they've said consistency is a real problem."],
  [/tone|sound|voice|personality|style/i, "Friendly and direct, like a peer founder. No corporate speak, no emojis."],
  [/length|long|short/i, "Short, two or three sentences."],
  [/objection|push ?back|hesitat|concern|situation/i, "If they say they're too busy, say that's exactly why it exists, then drop it. If they say they use ChatGPT, ask what's missing from that."],
  [/avoid|never|restrict|not say|off-limits/i, "Never send links in the first messages, never pitch before they've shared a problem."],
  [/example|sample|written|sent/i, "Something like: \"Love that you're posting about hiring. How do you find time to write these with everything else going on?\""],
];
const answerFor = (question: string) => SCRIPT.find(([pattern]) => pattern.test(question))?.[1] ?? "";

async function call(handler: (req: Request) => Promise<Response>, body: unknown) {
  const start = performance.now();
  const res = await handler(
    new Request("https://carouselabs.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_bench" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, data: (await res.json()) as Record<string, unknown>, ms: Math.round(performance.now() - start) };
}

describe("the agent builder with real models", () => {
  it("interviews, builds, refines, and the agent writes a reply", async () => {
    // ── interview ──
    const answers: { question: string; answer: string; topic?: string }[] = [];
    for (let i = 0; i <= MAX_QUESTIONS; i += 1) {
      const step = await call(builderPOST, { action: "interview", description: DESCRIPTION, answers });
      expect(step.status).toBe(200);
      if (step.data.done) {
        console.log(`[interview] done after ${answers.length} questions (${step.ms} ms)`);
        break;
      }
      const question = String(step.data.question);
      const answer = answerFor(question);
      console.log(`[interview] Q${answers.length + 1} (${step.ms} ms, ${step.data.topic}, optional ${step.data.optional}): ${question}\n            hint: ${step.data.hint}\n            → ${answer || "(skipped)"}`);
      expect(answers.map((a) => a.question)).not.toContain(question);
      answers.push({ question, answer, topic: String(step.data.topic) });
    }
    expect(answers.length).toBeLessThanOrEqual(MAX_QUESTIONS);

    // ── draft ──
    const draftRes = await call(builderPOST, { action: "draft", description: DESCRIPTION, answers });
    expect(draftRes.status).toBe(200);
    const draft = draftRes.data.draft as { name: string; config: { goals: string; facts: string[]; neverDo: string; examples: string[] } };
    console.log(`[draft] ${draftRes.ms} ms\n${JSON.stringify(draft, null, 2)}`);
    expect(draft.config.goals).toBeTruthy();
    // Every figure in a fact is one the person gave.
    const said = [DESCRIPTION, ...answers.map((x) => x.answer)].join(" ");
    for (const fact of draft.config.facts) for (const n of fact.match(/\d+/g) ?? []) expect(said).toContain(n);
    expect((draft as unknown as { description: string }).description.length).toBeLessThanOrEqual(200);

    // ── refine ──
    const refineRes = await call(builderPOST, { action: "refine", draft, instruction: "Make it a bit warmer, and mention the free plan when price comes up" });
    expect(refineRes.status).toBe(200);
    const refined = refineRes.data.draft as typeof draft;
    console.log(`[refine] ${refineRes.ms} ms, changed: ${JSON.stringify(refineRes.data.changed)}\n${JSON.stringify(refined.config, null, 2)}`);
    expect(refined.config.facts).toEqual(draft.config.facts);
    expect(refined.config.examples).toEqual(draft.config.examples);
    if (draft.config.neverDo) expect(refined.config.neverDo.startsWith(draft.config.neverDo)).toBe(true);

    // ── the agent writes a reply ──
    state.agent = { id: "bench-agent", userId: "bench-user", name: refined.name, config: refined.config };
    const reply = await call(messagePOST, {
      contact: { name: "Maya Chen", headline: "Founder at Loopwise (B2B SaaS, seed)" },
      threadPath: "/messaging/thread/2-bench/",
      thread: [
        { sender: "me", text: "Loved your post about hiring your first AE. How are you finding the time to write so consistently?" },
        { sender: "them", text: "Honestly I'm not, that post took me 3 hours. What do you do?" },
      ],
      agentId: "bench-agent",
    });
    expect(reply.status).toBe(200);
    console.log(`[reply] ${reply.ms} ms: ${reply.data.message}`);
  });
});
