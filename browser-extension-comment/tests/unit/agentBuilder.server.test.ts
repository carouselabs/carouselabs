// @vitest-environment node
// The AI agent builder (app/api/ext/agents/builder, lib/engage/agentBuilder):
// extension-only, free but capped per day, an interview that asks one thing
// at a time and stops, a draft held to what the person said (no invented
// facts or example replies), and refining that can't remove their facts,
// examples or rules. Models, Prisma, auth and the gate are stood in for.
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  prompts: [] as { system: string; user: string }[],
  answers: [] as string[],
  callsToday: 0,
  user: { id: "u1", email: "u1@example.com" } as { id: string; email: string } | null,
  platform: "linkedin" as "linkedin" | "x",
}));

const nextAnswer = () => calls.answers.shift() ?? JSON.stringify({ done: true });
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (body: { messages: { content: string }[] }) => {
          calls.prompts.push({ system: body.messages[0].content, user: body.messages[1].content });
          return { choices: [{ message: { content: nextAnswer() } }] };
        },
      },
    };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: async () => ({ content: [{ type: "text", text: nextAnswer() }], usage: { input_tokens: 1, output_tokens: 1 } }) };
  },
}));
vi.mock("../../../lib/db", () => ({
  db: {
    engageAiCall: {
      count: vi.fn(async () => calls.callsToday),
      create: vi.fn(() => Promise.resolve({})),
    },
  },
}));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => calls.user),
  extensionCallerPlatform: vi.fn(() => calls.platform),
}));
vi.mock("../../../lib/engage/gate", () => ({ engagePreflight: vi.fn(async () => ({ response: null, loaded: null })) }));

import { POST } from "../../../app/api/ext/agents/builder/route";
import { BUILDER_DAILY_CALLS, MAX_QUESTIONS } from "../../../lib/engage/agentBuilder";

const DESCRIPTION =
  "I run a SaaS company that helps people create LinkedIn content. I want to connect with founders, understand their challenges and introduce our product when relevant. Pro costs $29 a month.";

const post = async (body: unknown) => {
  const res = await POST(
    new Request("https://carouselabs.com/api/ext/agents/builder", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_x" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, data: (await res.json()) as Record<string, unknown> };
};

const CURRENT = {
  name: "Founder outreach",
  description: "Builds relationships with founders",
  purpose: "sales",
  config: {
    goals: "Build relationships; mention the product only when it fits",
    tone: "Natural",
    facts: ["Pro is $29 a month"],
    objections: ["Too expensive: mention the free plan"],
    alwaysDo: "Answer their question first",
    neverDo: "Never pitch in the first reply",
    examples: ["What does your content week look like?"],
  },
};

beforeEach(() => {
  calls.prompts = [];
  calls.answers = [];
  calls.callsToday = 0;
  calls.user = { id: "u1", email: "u1@example.com" };
  calls.platform = "linkedin";
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("who may build", () => {
  it("only the extension (its token): the website never generates", async () => {
    calls.user = null;
    expect((await post({ action: "interview", description: DESCRIPTION })).status).toBe(401);
    expect(calls.prompts).toHaveLength(0);
  });

  it(`is free but capped at ${BUILDER_DAILY_CALLS} AI calls a day, and says so`, async () => {
    calls.callsToday = BUILDER_DAILY_CALLS;
    const { status, data } = await post({ action: "interview", description: DESCRIPTION });
    expect(status).toBe(429);
    expect(data).toMatchObject({ code: "builder_daily_cap" });
    expect(String(data.error)).toMatch(/agents and replies aren't affected/);
    expect(calls.prompts).toHaveLength(0);
  });

  it("asks for a description first, at no cost", async () => {
    const { status } = await post({ action: "interview", description: "hi" });
    expect(status).toBe(400);
    expect(calls.prompts).toHaveLength(0);
  });
});

describe("the interview", () => {
  it("asks one question at a time, from the description and answers so far, as data", async () => {
    calls.answers = [JSON.stringify({ done: false, question: "What's the next step you'd like conversations to lead to?", hint: "A 15-minute demo call", optional: true, topic: "nextStep" })];
    const { status, data } = await post({
      action: "interview",
      description: DESCRIPTION,
      answers: [{ question: "Who do you talk to?", answer: "Seed-stage founders" }],
    });
    expect(status).toBe(200);
    expect(data).toEqual({ done: false, question: "What's the next step you'd like conversations to lead to?", hint: "A 15-minute demo call", optional: true, topic: "nextStep" });
    const { system, user } = calls.prompts[0];
    expect(system).toMatch(/LinkedIn/);
    expect(system).toMatch(new RegExp(`At most ${MAX_QUESTIONS} questions`));
    expect(user).toContain("<description>");
    expect(user).toContain("Seed-stage founders");
  });

  it("stops by itself after the most questions, without asking the AI", async () => {
    const answers = Array.from({ length: MAX_QUESTIONS }, (_, i) => ({ question: `Q${i}`, answer: "" }));
    const { data } = await post({ action: "interview", description: DESCRIPTION, answers });
    expect(data).toEqual({ done: true });
    expect(calls.prompts).toHaveLength(0);
  });

  it("stops when the AI repeats a question already asked", async () => {
    calls.answers = [JSON.stringify({ done: false, question: "Who do you talk to?" })];
    const { data } = await post({ action: "interview", description: DESCRIPTION, answers: [{ question: "Who do you talk to?", answer: "" }] });
    expect(data).toEqual({ done: true });
  });

  it("never asks about a covered topic again in other words: one reminder, then it's done", async () => {
    // Seen with real models: the same topic over and over after a skip.
    calls.answers = [
      JSON.stringify({ done: false, question: "What does your product actually do?", topic: "offer" }),
      JSON.stringify({ done: false, question: "And what makes it valuable?", topic: "offer" }),
    ];
    const answers = [{ question: "What does your product help people do?", answer: "", topic: "offer" }];
    const { data } = await post({ action: "interview", description: DESCRIPTION, answers });
    expect(data).toEqual({ done: true });
    expect(calls.prompts[0].user).toContain("<covered>offer</covered>");
    expect(calls.prompts[1].user).toMatch(/Your last question was about a topic in <covered>/);
  });

  it("after the reminder, a new topic is asked", async () => {
    calls.answers = [
      JSON.stringify({ done: false, question: "And what makes it valuable?", topic: "offer" }),
      JSON.stringify({ done: false, question: "How should replies sound?", topic: "tone" }),
    ];
    const { data } = await post({ action: "interview", description: DESCRIPTION, answers: [{ question: "What does it do?", answer: "Posts", topic: "offer" }] });
    expect(data).toMatchObject({ done: false, question: "How should replies sound?", topic: "tone" });
  });

  it("speaks of X in the X extension", async () => {
    calls.platform = "x";
    calls.answers = [JSON.stringify({ done: true })];
    await post({ action: "interview", description: DESCRIPTION });
    expect(calls.prompts[0].system).toMatch(/X \(formerly Twitter\)/);
  });
});

describe("the draft", () => {
  it("keeps only what the person said: no invented facts, no invented example replies", async () => {
    calls.answers = [
      JSON.stringify({
        name: "Founder outreach",
        description: "Builds relationships with founders",
        purpose: "sales",
        config: {
          goals: "",
          facts: ["Pro costs $29 a month", "Customers grow 3x in 90 days"],
          examples: ["Love what you're building, how do you plan your posts?", "Totally get it, we post three times a week too"],
          tone: "Warm",
        },
      }),
    ];
    const answers = [{ question: "Any reply you've sent that sounds right?", answer: "Totally get it, we post three times a week too!" }];
    const { status, data } = await post({ action: "draft", description: DESCRIPTION, answers });
    expect(status).toBe(200);
    const draft = data.draft as { name: string; status: string; config: { goals: string; facts: string[]; examples: string[]; tone: string } };
    expect(draft.config.facts).toEqual(["Pro costs $29 a month"]);
    expect(draft.config.examples).toEqual(["Totally get it, we post three times a week too"]);
    // No goal written: their description stands in.
    expect(draft.config.goals).toContain("connect with founders");
    expect(draft).toMatchObject({ name: "Founder outreach", status: "draft", config: { tone: "Warm" } });
  });

  it("a description that runs long is cut at a word, not mid-word; a long tone is kept whole", async () => {
    const tone = "Friendly and direct, like a peer founder, no corporate speak, no emojis";
    calls.answers = [JSON.stringify({ name: "A", description: `${"word ".repeat(60)}end`, config: { goals: "g", tone } })];
    const { data } = await post({ action: "draft", description: DESCRIPTION, answers: [] });
    const draft = data.draft as { description: string; config: { tone: string } };
    expect(draft.description.length).toBeLessThanOrEqual(200);
    expect(draft.description).toMatch(/word…$/);
    expect(draft.config.tone).toBe(tone);
  });

  it("tries once more when the AI's answer isn't JSON, then says so", async () => {
    calls.answers = ["Sure! Here's your agent.", "Still not JSON"];
    const { status, data } = await post({ action: "draft", description: DESCRIPTION, answers: [] });
    expect(status).toBe(502);
    expect(String(data.error)).toMatch(/Try again/);
    expect(calls.prompts).toHaveLength(2);
  });
});

describe("Refine with AI", () => {
  it("improves the wording but keeps their facts, examples, rules and name; rules can only be added to", async () => {
    calls.answers = [
      JSON.stringify({
        name: "Something else",
        description: "Warm, low-pressure outreach to founders",
        config: {
          goals: "Build genuine relationships with founders; bring up the product only once it clearly fits",
          tone: "Warm",
          facts: ["Pro is $9 a month", "Used by 10,000 founders"],
          examples: ["An AI-written example"],
          objections: [],
          alwaysDo: "",
          neverDo: "",
        },
        alwaysAdd: "Use their first name",
        neverAdd: "",
      }),
    ];
    const { status, data } = await post({ action: "refine", draft: CURRENT, instruction: "Make it warmer" });
    expect(status).toBe(200);
    const draft = data.draft as typeof CURRENT & { config: Record<string, unknown> };
    expect(draft.name).toBe("Founder outreach");
    expect(draft.config.facts).toEqual(["Pro is $29 a month"]);
    expect(draft.config.examples).toEqual(["What does your content week look like?"]);
    expect(draft.config.objections).toEqual(["Too expensive: mention the free plan"]);
    expect(draft.config.neverDo).toBe("Never pitch in the first reply");
    expect(draft.config.alwaysDo).toBe("Answer their question first\nUse their first name");
    expect(draft.config.tone).toBe("Warm");
    expect(data.changed).toEqual(expect.arrayContaining(["goals", "tone", "alwaysDo", "description"]));
    expect(calls.prompts[0].user).toContain("Make it warmer");
  });

  it("an answer that empties a field leaves theirs in place", async () => {
    calls.answers = [JSON.stringify({ config: { goals: "", tone: "" } })];
    const { data } = await post({ action: "refine", draft: CURRENT, instruction: "" });
    const draft = data.draft as typeof CURRENT;
    expect(draft.config.goals).toBe(CURRENT.config.goals);
    expect(data.changed).toEqual([]);
  });
});
