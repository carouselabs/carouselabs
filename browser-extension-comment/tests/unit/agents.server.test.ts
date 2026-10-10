// @vitest-environment node
// Custom AI agents (model EngageAgent, lib/engageAgents.ts, app/api/ext/
// agents): what's accepted, what the reply prompt gets from one, and the API
// both the panel and the website use — only the owner's agents, a limit, one
// default, and an edit from an out-of-date copy refused rather than saved
// over a newer one. Prisma and sign-in are stood in for.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string;
  userId: string;
  name: string;
  description: string;
  purpose: string;
  config: unknown;
  status: string;
  isDefault: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

const state = vi.hoisted(() => ({ rows: [] as Row[], user: { id: "u1", email: "u1@example.com" } as { id: string; email: string } | null, next: 1 }));

function matches(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "NOT") return !matches(row, value as Record<string, unknown>);
    return (row as unknown as Record<string, unknown>)[key] === value;
  });
}

vi.mock("../../../lib/db", () => {
  const engageAgent = {
    findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      state.rows.filter((r) => matches(r, where)).sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    ),
    findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.rows.find((r) => matches(r, where)) ?? null),
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.rows.find((r) => r.id === where.id) ?? null),
    count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.rows.filter((r) => matches(r, where)).length),
    create: vi.fn(async ({ data }: { data: Partial<Row> }) => {
      const row = {
        id: `a${state.next++}`,
        description: "",
        purpose: "other",
        status: "active",
        isDefault: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as Row;
      state.rows.push(row);
      return row;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = state.rows.filter((r) => matches(r, where));
      for (const row of hit) {
        for (const [key, value] of Object.entries(data)) {
          if (key === "version" && value && typeof value === "object") row.version += (value as { increment: number }).increment;
          else (row as unknown as Record<string, unknown>)[key] = value;
        }
      }
      return { count: hit.length };
    }),
    deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const before = state.rows.length;
      state.rows = state.rows.filter((r) => !matches(r, where));
      return { count: before - state.rows.length };
    }),
  };
  const db = { engageAgent, $transaction: async (fn: (tx: unknown) => unknown) => fn(db) };
  return { db };
});
vi.mock("../../../lib/extensionCommentAuth", () => ({ getExtensionUser: vi.fn(async () => state.user) }));

import { GET, POST } from "../../../app/api/ext/agents/route";
import { PUT, DELETE } from "../../../app/api/ext/agents/[id]/route";
import { agentPromptSections, normalizeAgentConfig, parseAgentInput, AGENT_LIMITS } from "../../../lib/engageAgents";
import { parseContactContext } from "../../../lib/extensionPreferences";

const CONFIG = {
  business: "I run a SaaS company that helps people create LinkedIn content",
  offer: "Turns one idea into a week of posts",
  audience: "Founders and creators",
  goals: "Build real relationships; mention the product only when it fits",
  nextStep: "A 15-minute call",
  strategy: "Ask about their content process first",
  tone: "Warm",
  length: "short",
  language: "Match the conversation",
  facts: ["Pro is $29 a month", "  ", "There is a free plan"],
  objections: ["Too expensive: mention the free plan, don't push"],
  alwaysDo: "Answer their question first",
  neverDo: "Never pitch in the first reply",
  examples: ["Love that you batch your posts. What does a typical week look like?"],
};

const json = (method: string, path: string, body?: unknown) =>
  new Request(`https://carouselabs.com${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_x" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function create(body: Record<string, unknown> = {}) {
  const res = await POST(json("POST", "/api/ext/agents", { name: "Founder outreach", purpose: "sales", config: CONFIG, ...body }));
  return { res, data: (await res.json()) as { agent: { id: string; version: number; isDefault: boolean }; error?: string } };
}

beforeEach(() => {
  state.rows = [];
  state.user = { id: "u1", email: "u1@example.com" };
  state.next = 1;
});

describe("what an agent may hold", () => {
  it("needs a name, and a goal once it's in use (a draft may be unfinished)", () => {
    expect(parseAgentInput({ config: CONFIG })).toEqual({ ok: false, error: "Agent name is required" });
    expect(parseAgentInput({ name: "A", config: { ...CONFIG, goals: "" } })).toMatchObject({ ok: false });
    expect(parseAgentInput({ name: "A", status: "draft", config: {} })).toMatchObject({ ok: true });
  });

  it("drops empty list items, caps lengths and counts, and fills in missing fields", () => {
    const parsed = parseAgentInput({
      name: "x".repeat(200),
      purpose: "world-domination",
      config: { ...CONFIG, facts: Array.from({ length: 40 }, (_, i) => `fact ${i}`) },
    });
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.name).toHaveLength(AGENT_LIMITS.name);
    expect(parsed.value.purpose).toBe("other");
    expect(parsed.value.config.facts).toHaveLength(AGENT_LIMITS.facts);
    expect(normalizeAgentConfig({ goals: "g" })).toMatchObject({ tone: "Natural", length: "auto", language: "Match the conversation", facts: [] });
    expect(normalizeAgentConfig({ ...CONFIG }).facts).toEqual(["Pro is $29 a month", "There is a free plan"]);
  });
});

describe("the reply prompt an agent makes", () => {
  it("carries the business, goal, next step, facts, situations, rules, examples and style", () => {
    const { sections, tone } = agentPromptSections("Founder outreach", normalizeAgentConfig(CONFIG));
    const prompt = sections.join("\n\n");
    for (const part of [CONFIG.business, CONFIG.offer, CONFIG.audience, CONFIG.goals, CONFIG.nextStep, CONFIG.strategy, "Pro is $29 a month", CONFIG.objections[0], CONFIG.alwaysDo, CONFIG.neverDo, CONFIG.examples[0]]) {
      expect(prompt).toContain(part);
    }
    expect(prompt).toMatch(/ONLY things you may state/);
    expect(prompt).toMatch(/one to three sentences/);
    expect(prompt).toMatch(/language the conversation is in/);
    expect(tone).toBe("Warm");
  });

  it("without verified facts, forbids product claims; and always respects a no", () => {
    const prompt = agentPromptSections("A", normalizeAgentConfig({ ...CONFIG, facts: [] })).sections.join("\n");
    expect(prompt).toMatch(/Never state prices, features, numbers/);
    expect(prompt).toMatch(/ask not to be contacted,\s+respect it/);
    expect(prompt).toMatch(/Do not pitch the offer or push the next\s+step before they have shown interest/);
  });

  it("a tone picked for one reply wins over the agent's own", () => {
    expect(agentPromptSections("A", normalizeAgentConfig(CONFIG), "Professional").tone).toBe("Professional");
  });
});

describe("the agents API (panel and website)", () => {
  it("creates an agent and lists only the caller's own", async () => {
    const { res } = await create();
    expect(res.status).toBe(201);
    state.rows.push({ ...state.rows[0], id: "theirs", userId: "u2" });
    const list = (await (await GET(json("GET", "/api/ext/agents"))).json()) as { agents: { id: string; config: { facts: string[] } }[] };
    expect(list.agents.map((a) => a.id)).toEqual(["a1"]);
    expect(list.agents[0].config.facts).toEqual(["Pro is $29 a month", "There is a free plan"]);
  });

  it("refuses a signed-out caller and a bad body", async () => {
    state.user = null;
    expect((await GET(json("GET", "/api/ext/agents"))).status).toBe(401);
    state.user = { id: "u1", email: "u1@example.com" };
    const res = await POST(json("POST", "/api/ext/agents", { config: CONFIG }));
    expect(res.status).toBe(400);
  });

  it(`stops at ${AGENT_LIMITS.agentsPerUser} agents`, async () => {
    for (let i = 0; i < AGENT_LIMITS.agentsPerUser; i += 1) await create({ name: `Agent ${i}` });
    const { res, data } = await create({ name: "One too many" });
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Delete one/);
  });

  it("keeps one default: a new default replaces the old, and can be switched off", async () => {
    const first = (await create({ setAsDefault: true })).data.agent;
    const second = (await create({ name: "Recruiter", setAsDefault: true })).data.agent;
    expect(state.rows.find((r) => r.id === first.id)?.isDefault).toBe(false);
    expect(state.rows.find((r) => r.id === second.id)?.isDefault).toBe(true);

    const res = await PUT(json("PUT", `/api/ext/agents/${second.id}`, { name: "Recruiter", config: CONFIG, version: 1, setAsDefault: false }), params(second.id));
    expect(res.status).toBe(200);
    expect(state.rows.some((r) => r.isDefault)).toBe(false);
  });

  it("an edit from an out-of-date copy is refused with the current agent, never saved over it", async () => {
    const { agent } = (await create()).data;
    // The website saves first (version 1 → 2)...
    const site = await PUT(json("PUT", `/api/ext/agents/${agent.id}`, { name: "Edited on the website", config: CONFIG, version: 1 }), params(agent.id));
    expect(site.status).toBe(200);
    // ...then the panel, still holding version 1.
    const panel = await PUT(json("PUT", `/api/ext/agents/${agent.id}`, { name: "Edited in the panel", config: CONFIG, version: 1 }), params(agent.id));
    expect(panel.status).toBe(409);
    const body = (await panel.json()) as { error: string; agent: { name: string; version: number } };
    expect(body.agent).toMatchObject({ name: "Edited on the website", version: 2 });
    expect(state.rows[0].name).toBe("Edited on the website");
  });

  it("an edit needs the version it started from", async () => {
    const { agent } = (await create()).data;
    const res = await PUT(json("PUT", `/api/ext/agents/${agent.id}`, { name: "No version", config: CONFIG }), params(agent.id));
    expect(res.status).toBe(400);
  });

  it("someone else's agent can't be edited or deleted (it reads as not found)", async () => {
    const { agent } = (await create()).data;
    state.user = { id: "u2", email: "u2@example.com" };
    expect((await PUT(json("PUT", `/api/ext/agents/${agent.id}`, { name: "Mine now", config: CONFIG, version: 1 }), params(agent.id))).status).toBe(404);
    expect((await DELETE(json("DELETE", `/api/ext/agents/${agent.id}`), params(agent.id))).status).toBe(404);
    expect(state.rows).toHaveLength(1);
    state.user = { id: "u1", email: "u1@example.com" };
    expect((await DELETE(json("DELETE", `/api/ext/agents/${agent.id}`), params(agent.id))).status).toBe(200);
    expect(state.rows).toHaveLength(0);
  });
});

describe("a conversation remembers its agent", () => {
  it("accepts the agent choice, and leaves the agent alone when a caller doesn't send one", () => {
    expect(parseContactContext({ contactUrl: "/in/jane", choice: "agent", agentId: "a1", profileId: "", purpose: "", tone: "" })).toMatchObject({
      ok: true,
      value: { choice: "agent", agentId: "a1" },
    });
    const older = parseContactContext({ contactUrl: "/in/jane", choice: "profile", profileId: "mp1", purpose: "", tone: "" });
    expect(older.ok && "agentId" in older.value).toBe(false);
  });
});
