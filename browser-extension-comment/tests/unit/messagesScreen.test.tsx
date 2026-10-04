// The Messages screen: nothing to show until a conversation is read; once
// read, the thread and a reply written into the shared result card; a
// regenerate that fails keeps the message that was there; Generate says why
// it is off instead of just refusing.
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
const MESSAGE = "Pricing for a B2B tool with seat-based plans. Would a 20-minute call next week work?";

let clock = Date.now();

function server(messages: Array<{ status: number; body: unknown }> = []) {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  const send = vi.fn(async (url: string) => {
    if (url.endsWith("/api/ext/message")) {
      const next = messages.shift() ?? { status: 200, body: { message: MESSAGE, freeRemaining: null, historyId: "h1" } };
      return json(next.status, next.body);
    }
    if (url.endsWith("/api/ext/message-profiles")) return json(200, { profiles: [PROFILE] });
    if (url.endsWith("/api/ext/me")) return json(200, { defaultMessageProfileId: "mp1", insertWarningHidden: false, extension: null });
    if (url.endsWith("/api/ext/config")) return json(200, { insertEnabled: true });
    if (url.includes("/api/ext/contacts")) return json(200, { contact: null, contacts: [] });
    return json(200, {});
  });
  vi.stubGlobal("fetch", send);
  return send;
}

function linkedInTab(readResult: unknown = { ok: true, conversation: CONVERSATION }) {
  const chrome = chromeMock();
  chrome.tabs.query.mockResolvedValue([TAB]);
  chrome.tabs.sendMessage.mockImplementation(async (_id: number, message: { type?: string }) =>
    message.type === READ ? readResult : { ok: true },
  );
}

const messageBox = () => screen.getByRole("textbox", { name: "Your message" }) as HTMLTextAreaElement;

async function readAndGenerate() {
  render(<MessagesScreen onCreateProfile={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
  const generate = await screen.findByRole("button", { name: "Generate reply" });
  await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(generate);
  await waitFor(() => expect(messageBox().value).toBe(MESSAGE));
}

beforeEach(() => {
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

describe("Messages screen", () => {
  it("reads the conversation, shows it, and writes the reply into the card", async () => {
    server();
    linkedInTab();
    await readAndGenerate();

    expect(screen.getByText("Bharti Agrawal")).toBeTruthy();
    expect(screen.getByText("2 messages read")).toBeTruthy();
    expect(screen.getByText("Happy to! What are you working on?")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Copy" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Insert" })).toBeTruthy();
  });

  it("keeps the previous message when a regenerate fails", async () => {
    server([{ status: 200, body: { message: MESSAGE, freeRemaining: null, historyId: "h1" } }, { status: 502, body: { error: "x" } }]);
    linkedInTab();
    await readAndGenerate();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText("Something went wrong, try again")).toBeTruthy();
    expect(messageBox().value).toBe(MESSAGE);
  });

  it("says why Generate is off", async () => {
    server();
    linkedInTab();
    render(<MessagesScreen onCreateProfile={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));

    fireEvent.click(await screen.findByRole("radio", { name: "Write my own" }));
    expect(screen.getByText("Write your reason first.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Generate reply" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole("textbox", { name: "Your reason for this conversation" }), {
      target: { value: "A potential client" },
    });
    expect(screen.queryByText("Write your reason first.")).toBeNull();
    expect((screen.getByRole("button", { name: "Generate reply" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows what went wrong when the conversation can't be read", async () => {
    server();
    linkedInTab({ ok: false, error: "Open a conversation first." });
    render(<MessagesScreen onCreateProfile={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Open a conversation first.")).toBeTruthy();
  });
});
