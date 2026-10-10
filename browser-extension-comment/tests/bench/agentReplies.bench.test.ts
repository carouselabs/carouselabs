// Stage 3 of the AI agents with the REAL route code and REAL models (database,
// sign-in and limits stood in for): reply actions, Shorter / More persuasive
// on a draft, alternatives, and the agent's test with its "why". Prints every
// reply so their quality can be read; checks only what the code guarantees.
//
// Costs about a cent per run.
//   npx vitest run --config vitest.bench.config.ts tests/bench/agentReplies.bench.test.ts
import { describe, expect, it, vi } from "vitest";

const AGENT_CONFIG = {
  business: "SaaS company that helps people create LinkedIn content.",
  offer: "Turns one idea into a week of LinkedIn posts in the founder's own voice.",
  audience: "Seed to Series A B2B SaaS founders and solo creators who struggle to post consistently.",
  goals: "Connect with founders and creators, understand their challenges, build relationships, and introduce the product when it is relevant.",
  nextStep: "A 15-minute call, but only once they've said consistency is a real problem.",
  strategy: "Ask about their content process first; mention the product only if they share a problem it solves.",
  tone: "Friendly and direct, like a peer founder, no emojis",
  length: "short",
  language: "Match the conversation",
  facts: ["Pro is $29 a month and there's a free plan.", "It turns one idea into a week of posts."],
  objections: ["Too busy: that's exactly why it exists, then drop it.", "Uses ChatGPT: ask what's missing from that."],
  alwaysDo: "Answer their question first.",
  neverDo: "Never send links in the first messages; never pitch before they've shared a problem; don't claim customer results.",
  examples: [],
};

vi.mock("../../../lib/db", () => ({
  db: {
    messageProfile: { findFirst: vi.fn(async () => null) },
    engageAgent: { findFirst: vi.fn(async () => ({ id: "bench-agent", userId: "bench-user", name: "Founder outreach", config: AGENT_CONFIG })) },
    commentHistory: { create: vi.fn(async () => ({ id: "bench-history" })) },
    engageAiCall: { create: vi.fn(() => Promise.resolve({})) },
  },
}));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => ({ id: "bench-user", email: "bench@example.com" })),
  extensionCallerPlatform: vi.fn(() => "linkedin"),
}));
vi.mock("../../../lib/engage/gate", () => ({
  engagePreflight: vi.fn(async () => ({ response: null, loaded: null })),
  reserveEngageGeneration: vi.fn(async () => ({ ok: true, freeRemaining: null, release: async () => {} })),
}));

import { POST as messagePOST } from "../../../app/api/ext/message/route";
import { POST as testPOST } from "../../../app/api/ext/agents/test/route";

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

const contact = { name: "Maya Chen", headline: "Founder at Loopwise (B2B SaaS, seed)" };
const reply = (thread: { sender: string; text: string }[], extra: Record<string, unknown> = {}) =>
  call(messagePOST, { contact, threadPath: "/messaging/thread/2-bench/", thread, agentId: "bench-agent", ...extra });

const PUSHBACK = [
  { sender: "me", text: "Saw your post on hiring your first AE. Do you write those yourself?" },
  { sender: "them", text: "I do, but honestly I'm not looking for another tool right now, we're stretched thin." },
];
const NO_NEED = [
  { sender: "me", text: "Congrats on the seed round!" },
  { sender: "them", text: "Thanks! Busy few weeks. What are you working on these days?" },
];
const ASKED_PRICE = [
  { sender: "me", text: "Loved your post about posting consistently." },
  { sender: "them", text: "Thanks. That's my struggle honestly, 3 hours a post. Is your tool expensive?" },
];

describe("an agent's replies with real models", () => {
  it("actions, changes, alternatives and the test", async () => {
    const show = (label: string, r: Awaited<ReturnType<typeof call>>) => {
      console.log(`\n[${label}] ${r.status} ${r.ms} ms\n  ${String(r.data.message ?? r.data.reply ?? r.data.error)}`);
      expect(r.status).toBe(200);
    };

    show("best reply to pushback", await reply(PUSHBACK));
    show("handle an objection", await reply(PUSHBACK, { action: "objection" }));
    show("discovery question", await reply(NO_NEED, { action: "discover" }));
    show("bring up the product (no need shown yet)", await reply(NO_NEED, { action: "introduce" }));
    const answered = await reply(ASKED_PRICE, { action: "answer" });
    show("answer their question (price)", answered);
    const draft = String(answered.data.message);
    show("shorter", await reply(ASKED_PRICE, { adjust: "shorter", draft }));
    show("more persuasive", await reply(ASKED_PRICE, { adjust: "persuasive", draft }));

    const alts = await reply(ASKED_PRICE, { alternatives: true });
    expect(alts.status).toBe(200);
    const options = alts.data.alternatives as string[];
    console.log(`\n[alternatives] ${alts.ms} ms, ${options.length} options:\n${options.map((o, i) => `  ${i + 1}. ${o}`).join("\n")}`);
    expect(new Set(options).size).toBe(options.length);

    const test = await call(testPOST, {
      draft: { name: "Founder outreach", purpose: "sales", config: AGENT_CONFIG },
      message: "Sounds interesting. Does it actually work? How many customers do you have?",
      action: "best",
    });
    console.log(`\n[test] ${test.status} ${test.ms} ms\n  reply: ${test.data.reply}\n  why: ${test.data.why}`);
    expect(test.status).toBe(200);
    expect(String(test.data.why).length).toBeGreaterThan(0);
  });
});
