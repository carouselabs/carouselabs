// Stage 3 of the AI agents in the panel: on the Messages screen, what the
// reply should do, Shorter / Longer / a tone change applied to the message
// showing, Alternatives to pick from (only with an agent); and "Test this
// agent" in the agent form, with its reply and why it fits.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { MessagesScreen } from "@/sidepanel/components/screens/MessagesScreen";
import { AgentForm } from "@/sidepanel/components/AgentForm";
import { chromeMock } from "../setup/chrome";

const READ = "carouselabs:read-conversation";
const TAB = { id: 7, url: "https://www.linkedin.com/messaging/thread/2-bharti/" } as chrome.tabs.Tab;
const CONVERSATION = {
  contact: { name: "Bharti Agrawal", headline: "Founder at Loop", profileUrl: "https://www.linkedin.com/in/bharti" },
  threadPath: "/messaging/thread/2-bharti/",
  thread: [
    { sender: "me", text: "Would love to connect about your pricing work." },
    { sender: "them", text: "Happy to! What does your tool cost?" },
  ],
};
const PROFILE = { id: "mp1", name: "Potential client", goal: "understand their needs", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: false };
const CONFIG = {
  business: "SaaS for LinkedIn content",
  offer: "",
  audience: "",
  goals: "Build relationships with founders",
  nextStep: "",
  strategy: "",
  tone: "Warm",
  length: "auto",
  language: "Match the conversation",
  facts: ["Pro is $29 a month"],
  objections: [],
  alwaysDo: "",
  neverDo: "",
  examples: [],
};
const AGENT = { id: "ag1", name: "Founder outreach", description: "", purpose: "sales", status: "active", isDefault: true, version: 1, config: CONFIG, createdAt: "", updatedAt: "" };

type Call = { url: string; method: string; body: Record<string, unknown> | null };
let calls: Call[];
let agents: unknown[];
let testStatus: number;

beforeEach(() => {
  calls = [];
  agents = [AGENT];
  testStatus = 200;
  const store = chromeMock().__store;
  store.extensionToken = "cl_cmt_abc";
  store.settingsUploadedToAccount = true;
  const chrome = chromeMock();
  chrome.tabs.query.mockResolvedValue([TAB]);
  chrome.tabs.sendMessage.mockImplementation(async (_id: number, message: { type?: string }) =>
    message.type === READ ? { ok: true, conversation: CONVERSATION } : { ok: true },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, method, body });
      const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status });
      if (url.endsWith("/api/ext/message")) {
        if (body?.alternatives) {
          return json(200, { message: "Option one.", alternatives: ["Option one.", "Option two.", "Option three."], freeRemaining: null, historyId: "h1" });
        }
        const message = body?.adjust ? `${String(body.adjust)} version` : "Pro is $29 a month. What would you use it for?";
        return json(200, { message, freeRemaining: null, historyId: "h1" });
      }
      if (url.endsWith("/api/ext/agents/test")) {
        if (testStatus !== 200) return json(testStatus, { error: "You've used your 10 free generations." });
        return json(200, { reply: "It's $29 a month for Pro.", why: "Answers the price with a verified fact.", freeRemaining: 5 });
      }
      if (url.endsWith("/api/ext/agents")) return json(200, { agents });
      if (url.endsWith("/api/ext/message-profiles")) return json(200, { profiles: [PROFILE] });
      if (url.endsWith("/api/ext/me")) return json(200, { defaultMessageProfileId: "mp1", extension: null });
      if (url.endsWith("/api/ext/config")) return json(200, { insertEnabled: true });
      if (url.includes("/api/ext/contacts")) return json(200, { contact: null, contacts: [] });
      return json(200, {});
    }),
  );
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.unstubAllGlobals();
});

async function pick(trigger: HTMLElement, option: string | RegExp) {
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  const item = await screen.findByRole("option", { name: option });
  fireEvent.keyDown(item, { key: "Enter" });
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}

const messageCalls = () => calls.filter((c) => c.url.endsWith("/api/ext/message")).map((c) => c.body!);
const box = () => screen.getByRole("textbox", { name: "Your message" }) as HTMLTextAreaElement;

async function readAndGenerate() {
  render(<MessagesScreen onCreateProfile={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
  await screen.findByText("2 messages read");
  const generate = await screen.findByRole("button", { name: "Generate reply" });
  await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
  return generate;
}

describe("an agent's tools on the Messages screen", () => {
  it("sends what the reply should do", async () => {
    const generate = await readAndGenerate();
    await pick(screen.getByRole("combobox", { name: "What should this reply do?" }), "Handle an objection");
    fireEvent.click(generate);
    await waitFor(() => expect(messageCalls()[0]).toMatchObject({ agentId: "ag1", action: "objection" }));
  });

  it("Shorter and a tone change rework the message showing", async () => {
    fireEvent.click(await readAndGenerate());
    await waitFor(() => expect(box().value).toBe("Pro is $29 a month. What would you use it for?"));

    fireEvent.click(screen.getByRole("button", { name: "Shorter" }));
    await waitFor(() => expect(box().value).toBe("shorter version"));
    expect(messageCalls()[1]).toMatchObject({ agentId: "ag1", adjust: "shorter", draft: "Pro is $29 a month. What would you use it for?" });

    await pick(screen.getByRole("combobox", { name: "Change the tone" }), "Friendlier");
    await waitFor(() => expect(box().value).toBe("friendly version"));
    expect(messageCalls()[2]).toMatchObject({ adjust: "friendly", draft: "shorter version" });
  });

  it("Alternatives offers replies to pick from", async () => {
    fireEvent.click(await readAndGenerate());
    await waitFor(() => expect(box().value).not.toBe(""));
    fireEvent.click(screen.getByRole("button", { name: "Alternatives" }));
    await waitFor(() => expect(box().value).toBe("Option one."));
    expect(messageCalls()[1]).toMatchObject({ alternatives: true });

    fireEvent.click(screen.getByRole("button", { name: "Option two." }));
    expect(box().value).toBe("Option two.");
    expect(screen.getByRole("button", { name: "Option two." }).getAttribute("aria-pressed")).toBe("true");
  });

  it("without an agent: no agent tools, and nothing extra is sent", async () => {
    agents = [];
    const generate = await readAndGenerate();
    expect(screen.queryByRole("combobox", { name: "What should this reply do?" })).toBeNull();
    fireEvent.click(generate);
    await waitFor(() => expect(box().value).not.toBe(""));
    expect(screen.queryByRole("button", { name: "Shorter" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Alternatives" })).toBeNull();
    expect(messageCalls()[0].action).toBeUndefined();
  });
});

describe("Test this agent", () => {
  const draft = { name: "Founder outreach", description: "", purpose: "sales" as const, config: CONFIG };

  it("replies to a sample message with the agent as it is in the form, and says why", async () => {
    render(<AgentForm seed={draft} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Their message" }), { target: { value: "How much is it?" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add what you said before" }));
    fireEvent.change(screen.getByRole("textbox", { name: "What you said before" }), { target: { value: "Loved your post." } });
    await pick(screen.getByRole("combobox", { name: "What should the reply do?" }), "Answer their question");
    fireEvent.click(screen.getByRole("button", { name: "Test reply" }));

    expect((await screen.findByLabelText("The agent's reply")).textContent).toBe("It's $29 a month for Pro.");
    const sent = calls.find((c) => c.url.endsWith("/api/ext/agents/test"))!.body;
    expect(sent).toMatchObject({ message: "How much is it?", earlier: "Loved your post.", action: "answer", draft: { name: "Founder outreach", config: { facts: ["Pro is $29 a month"] } } });

    expect(screen.queryByText("Answers the price with a verified fact.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Why this reply" }));
    expect(screen.getByText("Answers the price with a verified fact.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Test again" })).toBeTruthy();
  });

  it("says what the server said when it can't (e.g. no free generations left)", async () => {
    testStatus = 402;
    render(<AgentForm seed={draft} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Their message" }), { target: { value: "Hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Test reply" }));
    expect(await screen.findByText("You've used your 10 free generations.")).toBeTruthy();
  });

  it("needs the agent's goal first", () => {
    render(<AgentForm seed={{ ...draft, config: { ...CONFIG, goals: "" } }} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Their message" }), { target: { value: "Hi" } });
    expect((screen.getByRole("button", { name: "Test reply" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Add the goal first/)).toBeTruthy();
  });
});
