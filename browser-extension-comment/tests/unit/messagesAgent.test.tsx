// The Messages screen with AI agents (src/lib/agents.ts): a new conversation
// starts with the default agent, an agent writes instead of the reason (which
// steps aside), the choice is remembered per conversation, a deleted agent
// falls back to the reason, "No agent" works exactly as before, and the
// screen still works when agents can't be loaded.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { MessagesScreen } from "@/sidepanel/components/screens/MessagesScreen";
import { chromeMock } from "../setup/chrome";

const READ = "carouselabs:read-conversation";
const TAB = { id: 7, url: "https://www.linkedin.com/messaging/thread/2-bharti/" } as chrome.tabs.Tab;
const CONVERSATION = {
  contact: { name: "Bharti Agrawal", headline: "Founder at Loop", profileUrl: "https://www.linkedin.com/in/bharti" },
  threadPath: "/messaging/thread/2-bharti/",
  thread: [
    { sender: "me", text: "Would love to connect about your pricing work." },
    { sender: "them", text: "Happy to! What are you working on?" },
  ],
};
const PROFILE = { id: "mp1", name: "Potential client", goal: "understand their needs", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: false };
const config = (goals: string) => ({
  business: "",
  offer: "",
  audience: "",
  goals,
  nextStep: "",
  strategy: "",
  tone: "Warm",
  length: "auto",
  language: "Match the conversation",
  facts: [],
  objections: [],
  alwaysDo: "",
  neverDo: "",
  examples: [],
});
const agent = (id: string, name: string, isDefault = false) => ({
  id,
  name,
  description: `${name} description`,
  purpose: "sales",
  status: "active",
  isDefault,
  version: 1,
  config: config(`${name} goals`),
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
});

type Call = { url: string; method: string; body: Record<string, unknown> | null };
let calls: Call[] = [];
let clock = Date.now();

function server({ agents = [] as unknown[], contact = null as unknown, agentsFail = false } = {}) {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, method: init?.method ?? "GET", body });
      if (url.endsWith("/api/ext/message")) return json(200, { message: "Here's what we tried.", freeRemaining: null, historyId: "h1" });
      if (url.endsWith("/api/ext/agents")) return agentsFail ? json(404, { error: "Not found" }) : json(200, { agents });
      if (url.endsWith("/api/ext/message-profiles")) return json(200, { profiles: [PROFILE] });
      if (url.endsWith("/api/ext/me")) return json(200, { defaultMessageProfileId: "mp1", extension: null });
      if (url.endsWith("/api/ext/config")) return json(200, { insertEnabled: true });
      if (url.includes("/api/ext/contacts")) return json(200, { contact, contacts: [] });
      return json(200, {});
    }),
  );
}

function linkedInTab() {
  const chrome = chromeMock();
  chrome.tabs.query.mockResolvedValue([TAB]);
  chrome.tabs.sendMessage.mockImplementation(async (_id: number, message: { type?: string }) =>
    message.type === READ ? { ok: true, conversation: CONVERSATION } : { ok: true },
  );
}

async function pick(trigger: HTMLElement, option: string | RegExp) {
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  const item = await screen.findByRole("option", { name: option });
  fireEvent.keyDown(item, { key: "Enter" });
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}

const agentPicker = () => screen.getByRole("combobox", { name: /Agent/ });
const reasonSwitch = () => screen.queryByRole("radiogroup", { name: "Reason for this conversation" });
const lastGenerate = () => [...calls].reverse().find((c) => c.url.endsWith("/api/ext/message"))?.body;
const savedContexts = () => calls.filter((c) => c.url.endsWith("/api/ext/contacts") && c.method === "PUT").map((c) => c.body);

async function readConversation(onCreateAgent?: () => void) {
  render(<MessagesScreen onCreateProfile={() => {}} onCreateAgent={onCreateAgent} />);
  fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
  await screen.findByText("2 messages read");
}

async function generate() {
  const button = await screen.findByRole("button", { name: "Generate reply" });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  await waitFor(() => expect(lastGenerate()).toBeTruthy());
}

beforeEach(() => {
  calls = [];
  clock += 60_000;
  vi.spyOn(Date, "now").mockReturnValue(clock);
  const store = chromeMock().__store;
  store.extensionToken = "cl_cmt_abc";
  store.settingsUploadedToAccount = true;
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Messages with AI agents", () => {
  it("a new conversation starts with the default agent, which writes instead of the reason", async () => {
    server({ agents: [agent("ag1", "Founder outreach", true), agent("ag2", "Recruiter")] });
    linkedInTab();
    await readConversation();

    await waitFor(() => expect(agentPicker().textContent).toContain("Founder outreach"));
    expect(screen.getByText(/Founder outreach description/)).toBeTruthy();
    expect(reasonSwitch()?.closest(".hidden")).toBeTruthy();

    await generate();
    expect(lastGenerate()).toMatchObject({ agentId: "ag1" });
    expect(lastGenerate()?.profileId).toBeUndefined();
    expect(lastGenerate()?.goal).toBeUndefined();
  });

  it("picking another agent is remembered for this conversation, and used", async () => {
    server({ agents: [agent("ag1", "Founder outreach", true), agent("ag2", "Recruiter")] });
    linkedInTab();
    await readConversation();
    await pick(agentPicker(), "Recruiter");

    await waitFor(() =>
      expect(savedContexts()).toContainEqual(expect.objectContaining({ contactUrl: CONVERSATION.contact.profileUrl, choice: "agent", agentId: "ag2" })),
    );
    await generate();
    expect(lastGenerate()).toMatchObject({ agentId: "ag2" });
  });

  it("“No agent” brings the reason back, works as before, and is remembered", async () => {
    server({ agents: [agent("ag1", "Founder outreach", true)] });
    linkedInTab();
    await readConversation();
    await pick(agentPicker(), /No agent/);

    expect(reasonSwitch()?.closest(".hidden")).toBeNull();
    await waitFor(() => expect(savedContexts()).toContainEqual(expect.objectContaining({ choice: "profile", agentId: "" })));
    await generate();
    expect(lastGenerate()).toMatchObject({ profileId: "mp1" });
    expect(lastGenerate()?.agentId).toBeUndefined();
  });

  it("a conversation that used an agent opens with it", async () => {
    server({
      agents: [agent("ag1", "Founder outreach", true), agent("ag2", "Recruiter")],
      contact: { contactUrl: "/in/bharti", choice: "agent", agentId: "ag2", profileId: "mp1", purpose: "", tone: "" },
    });
    linkedInTab();
    await readConversation();
    await waitFor(() => expect(agentPicker().textContent).toContain("Recruiter"));
  });

  it("an agent deleted since falls back to the default agent, or to the reason when there is none", async () => {
    server({
      agents: [agent("ag2", "Recruiter")],
      contact: { contactUrl: "/in/bharti", choice: "agent", agentId: "gone", profileId: "mp1", purpose: "", tone: "" },
    });
    linkedInTab();
    await readConversation();
    await waitFor(() => expect(agentPicker().textContent).toMatch(/No agent/));
    await generate();
    expect(lastGenerate()).toMatchObject({ profileId: "mp1" });
    expect(lastGenerate()?.agentId).toBeUndefined();
  });

  it("a conversation with a reason picked before agents existed keeps its reason", async () => {
    server({
      agents: [agent("ag1", "Founder outreach", true)],
      contact: { contactUrl: "/in/bharti", choice: "custom", profileId: null, purpose: "Hiring for my team", tone: "Natural" },
    });
    linkedInTab();
    await readConversation();
    await waitFor(() => expect(agentPicker().textContent).toMatch(/No agent/));
    await generate();
    expect(lastGenerate()).toMatchObject({ goal: "Hiring for my team" });
  });

  it("offers to create an agent", async () => {
    server({ agents: [] });
    linkedInTab();
    const onCreateAgent = vi.fn();
    await readConversation(onCreateAgent);
    await pick(agentPicker(), "+ Create agent");
    expect(onCreateAgent).toHaveBeenCalled();
  });

  it("still works when agents can't be loaded (an older server)", async () => {
    server({ agentsFail: true });
    linkedInTab();
    await readConversation();
    expect(screen.queryByRole("alert")).toBeNull();
    await generate();
    expect(lastGenerate()).toMatchObject({ profileId: "mp1" });
  });
});
