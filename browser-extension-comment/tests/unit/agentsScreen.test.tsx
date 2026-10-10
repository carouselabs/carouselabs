// The panel's Agents tab (AgentsScreen + AgentForm): empty state, create,
// edit, duplicate, delete after a check, the default switched on and off, and
// an edit made from an out-of-date copy loading the newer version instead of
// overwriting it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AgentsScreen } from "@/sidepanel/components/screens/AgentsScreen";
import { chromeMock } from "../setup/chrome";

const baseConfig = {
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
};
const AGENT = {
  id: "ag1",
  name: "Founder outreach",
  description: "Builds relationships with founders",
  purpose: "sales",
  status: "active",
  isDefault: false,
  version: 3,
  config: baseConfig,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

type Call = { url: string; method: string; body: Record<string, unknown> | null };
let calls: Call[];
let agents: unknown[];
let putAnswer: { status: number; body: unknown } | null;

beforeEach(() => {
  calls = [];
  agents = [];
  putAnswer = null;
  chromeMock().__store.extensionToken = "cl_cmt_abc";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, method, body });
      const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status });
      if (url.endsWith("/api/ext/agents") && method === "GET") return json(200, { agents });
      if (url.endsWith("/api/ext/agents") && method === "POST") return json(201, { agent: { ...AGENT, id: "new", ...body } });
      if (url.includes("/api/ext/agents/") && method === "PUT") return putAnswer ? json(putAnswer.status, putAnswer.body) : json(200, { agent: { ...AGENT, ...body } });
      if (url.includes("/api/ext/agents/") && method === "DELETE") return json(200, { ok: true });
      return json(200, {});
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const lastCall = (method: string) => [...calls].reverse().find((c) => c.method === method);

describe("the Agents tab", () => {
  it("explains agents when there are none, and creates one with what the form holds", async () => {
    render(<AgentsScreen />);
    expect(await screen.findByText("No agents yet")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "New agent" }));
    // New agent offers the AI builder or the form by hand.
    expect(await screen.findByRole("button", { name: /Build with AI/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Fill it in myself/ }));
    const create = screen.getByRole("button", { name: "Create agent" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true); // needs a name and a goal
    fireEvent.change(screen.getByLabelText(/Agent name/), { target: { value: "Founder outreach" } });
    fireEvent.change(screen.getByLabelText(/What these conversations are for/), { target: { value: "Build relationships" } });
    fireEvent.change(screen.getByLabelText("Fact 1"), { target: { value: "  Pro is $29 a month " } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Start new conversations with this agent/ }));
    fireEvent.click(create);

    await waitFor(() => expect(lastCall("POST")).toBeTruthy());
    expect(lastCall("POST")!.body).toMatchObject({
      name: "Founder outreach",
      status: "active",
      setAsDefault: true,
      config: { goals: "Build relationships", facts: ["Pro is $29 a month"], objections: [], examples: [] },
    });
  });

  it("edits with the version it started from", async () => {
    agents = [AGENT];
    render(<AgentsScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Agent name/), { target: { value: "Founder chats" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(lastCall("PUT")).toBeTruthy());
    expect(lastCall("PUT")!.url).toMatch(/\/api\/ext\/agents\/ag1$/);
    expect(lastCall("PUT")!.body).toMatchObject({ name: "Founder chats", version: 3 });
  });

  it("an agent changed elsewhere meanwhile loads the newer version and says so, rather than overwriting it", async () => {
    agents = [AGENT];
    putAnswer = {
      status: 409,
      body: { error: "This agent was changed somewhere else", agent: { ...AGENT, name: "Renamed on the website", version: 4 } },
    };
    render(<AgentsScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Agent name/), { target: { value: "My local edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/changed somewhere else/)).toBeTruthy();
    expect((screen.getByLabelText(/Agent name/) as HTMLInputElement).value).toBe("Renamed on the website");
    putAnswer = null;
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(lastCall("PUT")!.body).toMatchObject({ version: 4 }));
  });

  it("duplicates into a new agent", async () => {
    agents = [AGENT];
    render(<AgentsScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Duplicate" }));
    expect((screen.getByLabelText(/Agent name/) as HTMLInputElement).value).toBe("Founder outreach copy");
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));
    await waitFor(() => expect(lastCall("POST")!.body).toMatchObject({ name: "Founder outreach copy", config: { facts: ["Pro is $29 a month"] } }));
  });

  it("deletes only after a check", async () => {
    agents = [AGENT];
    render(<AgentsScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const check = screen.getByRole("group", { name: "Delete Founder outreach?" });
    expect(within(check).getByText("Delete this agent?")).toBeTruthy();
    expect(lastCall("DELETE")).toBeUndefined();
    fireEvent.click(within(check).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(lastCall("DELETE")!.url).toMatch(/\/api\/ext\/agents\/ag1$/));
  });

  it("makes an agent the default, and stops using it by default", async () => {
    agents = [AGENT];
    render(<AgentsScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Make default" }));
    await waitFor(() => expect(lastCall("PUT")!.body).toMatchObject({ setAsDefault: true, version: 3 }));

    cleanup();
    agents = [{ ...AGENT, isDefault: true }];
    render(<AgentsScreen />);
    expect(await screen.findByText("Default")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stop using by default" }));
    await waitFor(() => expect(lastCall("PUT")!.body).toMatchObject({ setAsDefault: false }));
  });
});
