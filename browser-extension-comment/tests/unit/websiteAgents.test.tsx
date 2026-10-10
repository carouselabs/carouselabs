// The website's Extension → AI agents (components/extension/AgentsManager):
// the same agents and routes as the panel. Lists them, creates and edits
// them (sending the version the edit started from), loads the newer version
// when the panel changed the agent meanwhile, deletes after a check, and the
// Extension tabs link to it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AgentsManager } from "../../../components/extension/AgentsManager";
import { ExtensionTabs } from "../../../components/extension/ExtensionTabs";

vi.mock("next/navigation", () => ({ usePathname: () => "/extension/agents" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const AGENT = {
  id: "ag1",
  name: "Founder outreach",
  description: "Builds relationships with founders",
  purpose: "sales",
  status: "active",
  isDefault: true,
  version: 2,
  config: {
    business: "SaaS for LinkedIn content",
    offer: "",
    audience: "",
    goals: "Build relationships with founders",
    nextStep: "",
    strategy: "",
    tone: "Natural",
    length: "auto",
    language: "Match the conversation",
    facts: ["Pro is $29 a month"],
    objections: [],
    alwaysDo: "",
    neverDo: "",
    examples: [],
  },
  updatedAt: "2026-10-01T00:00:00.000Z",
};

type Call = { url: string; method: string; body: Record<string, unknown> | null };
let calls: Call[];
let agents: unknown[];
let putAnswer: { status: number; body: unknown } | null;

beforeEach(() => {
  calls = [];
  agents = [AGENT];
  putAnswer = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, method, body });
      const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status });
      if (method === "GET") return json(200, { agents });
      if (method === "POST") return json(201, { agent: { ...AGENT, id: "new" } });
      if (method === "PUT") return putAnswer ? json(putAnswer.status, putAnswer.body) : json(200, { agent: AGENT });
      return json(200, { ok: true });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const lastCall = (method: string) => [...calls].reverse().find((c) => c.method === method);

describe("Extension → AI agents on the website", () => {
  it("lists the agents with their kind and default", async () => {
    render(<AgentsManager />);
    expect(await screen.findByText("Founder outreach")).toBeTruthy();
    expect(screen.getByText("Default")).toBeTruthy();
    expect(screen.getByText("Sales")).toBeTruthy();
    expect(calls[0].url).toBe("/api/ext/agents");
  });

  it("explains agents when there are none", async () => {
    agents = [];
    render(<AgentsManager />);
    expect(await screen.findByText("No agents yet")).toBeTruthy();
  });

  it("edits through the same route as the panel, with the version", async () => {
    render(<AgentsManager />);
    fireEvent.click(await screen.findByRole("button", { name: /Edit/ }));
    fireEvent.change(screen.getByDisplayValue("Founder outreach"), { target: { value: "Founder chats" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(lastCall("PUT")).toBeTruthy());
    expect(lastCall("PUT")!.url).toBe("/api/ext/agents/ag1");
    expect(lastCall("PUT")!.body).toMatchObject({ name: "Founder chats", version: 2, config: { facts: ["Pro is $29 a month"] } });
  });

  it("an agent changed in the panel meanwhile loads the newer version instead of being overwritten", async () => {
    putAnswer = { status: 409, body: { error: "This agent was changed somewhere else", agent: { ...AGENT, name: "Renamed in the panel", version: 3 } } };
    render(<AgentsManager />);
    fireEvent.click(await screen.findByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/changed somewhere else/)).toBeTruthy();
    expect(screen.getByDisplayValue("Renamed in the panel")).toBeTruthy();
  });

  it("creates an agent", async () => {
    agents = [];
    render(<AgentsManager />);
    fireEvent.click(await screen.findByRole("button", { name: /New agent/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Founder outreach"), { target: { value: "Recruiter" } });
    fireEvent.change(screen.getByPlaceholderText(/Understand their challenges/), { target: { value: "Hire senior engineers" } });
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));
    await waitFor(() => expect(lastCall("POST")!.body).toMatchObject({ name: "Recruiter", config: { goals: "Hire senior engineers" } }));
  });

  it("deletes only after a check", async () => {
    render(<AgentsManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const check = screen.getByRole("group", { name: "Delete Founder outreach?" });
    expect(lastCall("DELETE")).toBeUndefined();
    fireEvent.click(within(check).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(lastCall("DELETE")!.url).toBe("/api/ext/agents/ag1"));
  });

  it("has its own tab in the Extension section", () => {
    render(<ExtensionTabs />);
    expect(screen.getByRole("link", { name: "AI agents" }).getAttribute("href")).toBe("/extension/agents");
  });
});
