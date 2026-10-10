// The AI agent builder in the panel (AgentBuilder, AgentForm's Refine,
// AgentsScreen): describe → one question at a time (skip, edit an earlier
// answer) → build → review in the form → save; the interview survives
// leaving the panel; the daily limit is explained; Refine updates the form,
// says what changed, and Undo puts it back.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AgentsScreen } from "@/sidepanel/components/screens/AgentsScreen";
import { chromeMock } from "../setup/chrome";

const DESCRIPTION = "I run a SaaS company that helps people create LinkedIn content. I want to connect with founders.";
const DRAFT = {
  name: "Founder outreach",
  description: "Builds relationships with founders",
  purpose: "sales",
  config: {
    business: "SaaS for LinkedIn content",
    offer: "",
    audience: "Founders",
    goals: "Connect with founders",
    nextStep: "",
    strategy: "",
    tone: "Natural",
    length: "auto",
    language: "Match the conversation",
    facts: ["Pro is $29 a month"],
    objections: [],
    alwaysDo: "",
    neverDo: "Never pitch first",
    examples: [],
  },
};

type Call = { url: string; method: string; body: Record<string, unknown> | null };
let calls: Call[];
let questions: Array<{ done: boolean; question?: string; hint?: string; optional?: boolean }>;
let builderStatus: number;

beforeEach(() => {
  calls = [];
  builderStatus = 200;
  questions = [
    { done: false, question: "Who do you talk to?", hint: "Seed-stage founders", optional: false },
    { done: false, question: "Any product facts it may mention?", hint: "Pro is $29 a month", optional: true },
    { done: true },
  ];
  chromeMock().__store.extensionToken = "cl_cmt_abc";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, method, body });
      const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status });
      if (url.endsWith("/api/ext/agents/builder")) {
        if (builderStatus !== 200) return json(builderStatus, { error: "You've used today's free agent-building.", code: "builder_daily_cap" });
        if (body?.action === "interview") return json(200, questions.shift() ?? { done: true });
        if (body?.action === "draft") return json(200, { draft: DRAFT });
        if (body?.action === "refine") {
          const draft = body.draft as typeof DRAFT;
          return json(200, { draft: { ...draft, config: { ...draft.config, tone: "Warm" } }, changed: ["tone"] });
        }
      }
      if (url.endsWith("/api/ext/agents") && method === "GET") return json(200, { agents: [] });
      if (url.endsWith("/api/ext/agents") && method === "POST") return json(201, { agent: { ...DRAFT, id: "new", status: "active", isDefault: false, version: 1 } });
      return json(200, {});
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const builderCalls = (action: string) => calls.filter((c) => c.url.endsWith("/api/ext/agents/builder") && c.body?.action === action);

async function startBuilder() {
  render(<AgentsScreen />);
  fireEvent.click(await screen.findByRole("button", { name: "New agent" }));
  fireEvent.click(await screen.findByRole("button", { name: /Build with AI/ }));
  const box = await screen.findByLabelText("What do you want your AI agent to help you achieve?");
  fireEvent.change(box, { target: { value: DESCRIPTION } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByText("Who do you talk to?");
}

const answerBox = () => screen.getByRole("textbox", { name: "Your answer" });

describe("Build with AI", () => {
  it("interviews one question at a time, builds the agent, and saves it after review", async () => {
    await startBuilder();
    expect((answerBox() as HTMLTextAreaElement).placeholder).toBe("e.g. Seed-stage founders");
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull(); // not optional

    fireEvent.change(answerBox(), { target: { value: "Seed-stage SaaS founders" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Any product facts it may mention?");
    expect(builderCalls("interview")[1].body).toMatchObject({
      description: DESCRIPTION,
      answers: [{ question: "Who do you talk to?", answer: "Seed-stage SaaS founders" }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await screen.findByText(/That's all it needs/);
    expect(screen.getByText("Skipped")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Build my agent" }));
    const name = (await screen.findByLabelText(/Agent name/)) as HTMLInputElement;
    expect(name.value).toBe("Founder outreach");
    expect(builderCalls("draft")[0].body?.answers).toEqual([
      { question: "Who do you talk to?", answer: "Seed-stage SaaS founders" },
      { question: "Any product facts it may mention?", answer: "" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/api/ext/agents"))).toBe(true));
    const saved = calls.find((c) => c.method === "POST" && c.url.endsWith("/api/ext/agents"))!.body;
    expect(saved).toMatchObject({ name: "Founder outreach", status: "active", config: { facts: ["Pro is $29 a month"], neverDo: "Never pitch first" } });
    // Saved: the interview is finished with.
    await waitFor(() => expect(chromeMock().__store.agentBuilderProgress).toBeUndefined());
  });

  it("“Build my agent now” works part-way through", async () => {
    await startBuilder();
    fireEvent.click(screen.getByRole("button", { name: "Build my agent now" }));
    expect(await screen.findByLabelText(/Agent name/)).toBeTruthy();
    expect(builderCalls("draft")[0].body).toMatchObject({ description: DESCRIPTION, answers: [] });
  });

  it("an earlier answer can be edited, and the edit is what's sent next", async () => {
    await startBuilder();
    fireEvent.change(answerBox(), { target: { value: "Founders" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Any product facts it may mention?");

    fireEvent.click(screen.getByRole("button", { name: "Edit your answer to: Who do you talk to?" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your answer to: Who do you talk to?" }), { target: { value: "Seed-stage founders in fintech" } });
    fireEvent.click(screen.getByRole("button", { name: "Save answer" }));
    expect(screen.getByText("Seed-stage founders in fintech")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Build my agent now" }));
    await screen.findByLabelText(/Agent name/);
    expect(builderCalls("draft")[0].body?.answers).toEqual([{ question: "Who do you talk to?", answer: "Seed-stage founders in fintech" }]);
  });

  it("keeps the interview when the panel is left, and offers to continue it", async () => {
    await startBuilder();
    fireEvent.change(answerBox(), { target: { value: "Founders" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Any product facts it may mention?");
    cleanup();

    render(<AgentsScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "New agent" }));
    fireEvent.click(await screen.findByRole("button", { name: /Continue building/ }));
    expect(await screen.findByText("Any product facts it may mention?")).toBeTruthy();
    expect(screen.getByText("Founders")).toBeTruthy();
  });

  it("explains the daily limit instead of failing silently", async () => {
    builderStatus = 429;
    render(<AgentsScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "New agent" }));
    fireEvent.click(await screen.findByRole("button", { name: /Build with AI/ }));
    fireEvent.change(await screen.findByLabelText("What do you want your AI agent to help you achieve?"), { target: { value: DESCRIPTION } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/today's free agent-building/)).toBeTruthy();
  });
});

describe("Refine with AI", () => {
  it("updates the form, says what changed, and Undo puts it back", async () => {
    await startBuilder();
    fireEvent.click(screen.getByRole("button", { name: "Build my agent now" }));
    await screen.findByLabelText(/Agent name/);

    fireEvent.click(screen.getByRole("button", { name: "Friendlier" }));
    expect(await screen.findByText(/Updated tone\. Your facts, examples and rules were kept\./)).toBeTruthy();
    expect(builderCalls("refine")[0].body).toMatchObject({ instruction: expect.stringMatching(/friendlier/i), draft: { name: "Founder outreach" } });
    expect(screen.getByRole("combobox", { name: "Tone" }).textContent).toContain("Warm");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Tone" }).textContent).toContain("Natural"));
  });

  it("takes the person's own instruction", async () => {
    await startBuilder();
    fireEvent.click(screen.getByRole("button", { name: "Build my agent now" }));
    await screen.findByLabelText(/Agent name/);
    fireEvent.change(screen.getByRole("textbox", { name: "What to change" }), { target: { value: "Mention our free plan when price comes up" } });
    fireEvent.click(screen.getByRole("button", { name: "Refine" }));
    await waitFor(() => expect(builderCalls("refine")[0].body?.instruction).toBe("Mention our free plan when price comes up"));
  });
});
