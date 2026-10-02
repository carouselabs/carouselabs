// Picking another profile after something was written offers a clear
// "Rewrite with …" under the picker (the small Regenerate icon is easy to
// miss), naming what wrote the current text; using it rewrites with the new
// pick and the offer goes away. Also: the shared default profile (here
// Simple & Human, as the database marks it) is preselected and labelled.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { MessagesScreen } from "@/sidepanel/components/screens/MessagesScreen";
import { ConnectionNotePanel } from "@/sidepanel/components/ConnectionNotePanel";
import { chromeMock } from "../setup/chrome";

type Call = { url: string; body: Record<string, unknown> | null };

// Opens a dropdown and picks an option with the keyboard, as a person can.
async function pick(trigger: HTMLElement, option: string | RegExp) {
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  const item = await screen.findByRole("option", { name: option });
  fireEvent.keyDown(item, { key: "Enter" });
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}

const rewriteButton = () => screen.queryByRole("button", { name: /^Rewrite/ });

let calls: Call[] = [];
let clock = Date.now();

function server(routes: Record<string, (body: Record<string, unknown> | null) => unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ url, body });
      const route = Object.entries(routes).find(([path]) => url.includes(path));
      return new Response(JSON.stringify(route ? route[1](body) : {}), { status: 200 });
    }),
  );
}

beforeEach(() => {
  calls = [];
  clock += 60_000;
  vi.spyOn(Date, "now").mockReturnValue(clock);
  Object.assign(chromeMock().__store, { extensionToken: "cl_cmt_abc", settingsUploadedToAccount: true });
  setExtensionAccess({ access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null });
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Home", () => {
  const SIMPLE = { id: "sys-carouselabs-simple-human", name: "CarouseLabs — Simple & Human", tone: "Friendly", isDefault: true, isSystem: true, isRecommended: true };
  const EXPERT = { id: "sys-thoughtful-expert", name: "Thoughtful Expert", tone: "Professional", isDefault: false, isSystem: true, isRecommended: false };

  beforeEach(() => {
    chromeMock().__store.lastSelectedPost = {
      mode: "comment", authorName: "Anthony N.", authorHeadline: "Founder", text: "LinkedIn algorithm solved. Just pay for reach.",
      type: "text", url: "https://www.linkedin.com/feed/update/urn:li:activity:1", capturedAt: 1,
    };
    server({
      "/api/ext/generate": (body) => ({ comment: `Written by ${body?.profileId}`, freeRemaining: null, historyId: "h1" }),
      "/api/ext/profiles": () => ({ profiles: [SIMPLE, EXPERT] }),
      "/api/ext/me": () => ({ defaultCommentProfileId: null, commentsToday: 0, extension: null }),
      "/api/ext/config": () => ({ insertEnabled: false }),
    });
  });

  const trigger = () => screen.getByRole("combobox", { name: "Comment profile" });
  const box = () => screen.getByRole("textbox", { name: "Your comment" }) as HTMLTextAreaElement;

  async function generateFirst() {
    render(<HomeScreen onCreateProfile={() => {}} />);
    const generate = await screen.findByRole("button", { name: "Generate" });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(generate);
    await waitFor(() => expect(box().value).toBe(`Written by ${SIMPLE.id}`));
  }

  it("starts on the shared default, Simple & Human, and labels it", async () => {
    render(<HomeScreen onCreateProfile={() => {}} />);
    await waitFor(() => expect(trigger().textContent).toContain("CarouseLabs — Simple & Human"));
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "Enter" });
    expect((await screen.findByRole("option", { name: /Simple & Human/ })).textContent).toContain("(default)");
  });

  it("offers Rewrite with the newly picked profile, naming what wrote the current comment", async () => {
    await generateFirst();
    expect(rewriteButton()).toBeNull();

    await pick(trigger(), /Thoughtful Expert/);
    expect(rewriteButton()?.textContent).toBe("Rewrite with Thoughtful Expert");
    expect(screen.getByText("Current comment: CarouseLabs — Simple & Human")).toBeTruthy();

    fireEvent.click(rewriteButton()!);
    await waitFor(() => expect(box().value).toBe(`Written by ${EXPERT.id}`));
    expect(calls.filter((c) => c.url.endsWith("/api/ext/generate")).map((c) => c.body?.profileId)).toEqual([SIMPLE.id, EXPERT.id]);
    expect(rewriteButton()).toBeNull();
  });

  it("takes the offer back when the profile that wrote it is picked again", async () => {
    await generateFirst();
    await pick(trigger(), /Thoughtful Expert/);
    expect(rewriteButton()).toBeTruthy();
    await pick(trigger(), /Simple & Human/);
    expect(rewriteButton()).toBeNull();
  });
});

describe("Connection notes", () => {
  const WARM = { id: "cp1", name: "Warm intro", angle: "", goal: "Get the invite accepted", tone: "friendly", length: "90-180 characters", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true };
  const DIRECT = { id: "cp2", name: "Straight to the point", angle: "", goal: "Say why, briefly", tone: "direct", length: "60-120 characters", alwaysDo: null, neverDo: null, samples: [], isDefault: false, isSystem: true, isRecommended: false };
  const TARGET = { name: "Maya Lindqvist", headline: "Talent Partner", currentRole: "Talent Partner at Northwind", about: "", url: "https://www.linkedin.com/in/maya", capturedAt: 1 };

  it("offers Rewrite when another note profile is picked", async () => {
    server({
      "/api/ext/connection-note": (body) => ({ note: `Note by ${body?.profileId}`, freeRemaining: null, historyId: "h1" }),
      "/api/ext/connection-profiles": () => ({ profiles: [WARM, DIRECT] }),
      "/api/ext/me": () => ({ defaultConnectionProfileId: "cp1" }),
      "/api/ext/settings": () => ({ connectNoteContext: { choice: "none", purpose: "" }, connectNoteLength: null, linkedinProfile: null }),
    });
    render(
      <ConnectionNotePanel target={TARGET} paywalled={false} showInsert={false} inserting={false} insertError={null} onInsert={() => {}} onCreateProfile={() => {}} />,
    );
    const generate = await screen.findByRole("button", { name: "Generate note" });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(generate);
    const box = () => screen.getByRole("textbox", { name: "Your note" }) as HTMLTextAreaElement;
    await waitFor(() => expect(box().value).toBe("Note by cp1"));

    await pick(screen.getByRole("combobox", { name: "Note profile" }), "Straight to the point");
    expect(rewriteButton()?.textContent).toBe("Rewrite with Straight to the point");
    expect(screen.getByText("Current note: Warm intro")).toBeTruthy();
    fireEvent.click(rewriteButton()!);
    await waitFor(() => expect(box().value).toBe("Note by cp2"));
    expect(rewriteButton()).toBeNull();
  });
});

describe("Messages", () => {
  const READ = "carouselabs:read-conversation";
  const CLIENT = { id: "mp1", name: "Potential client", goal: "g", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true };
  const FOLLOW = { id: "mp2", name: "Warm follow-up", goal: "g", tone: "Warm", alwaysDo: null, neverDo: null, samples: [], isDefault: false, isSystem: true, isRecommended: false };

  beforeEach(() => {
    chromeMock().tabs.query.mockResolvedValue([{ id: 7, url: "https://www.linkedin.com/messaging/thread/2-bharti/" }]);
    chromeMock().tabs.sendMessage.mockImplementation(async (_id: number, message: { type?: string }) =>
      message.type === READ
        ? {
            ok: true,
            conversation: {
              contact: { name: "Bharti", headline: "Founder", profileUrl: "https://www.linkedin.com/in/bharti" },
              threadPath: "/messaging/thread/2-bharti/",
              thread: [{ sender: "them", text: "What are you working on?" }],
            },
          }
        : { ok: true },
    );
    server({
      "/api/ext/message-profiles": () => ({ profiles: [CLIENT, FOLLOW] }),
      "/api/ext/message": (body) => ({ message: `Message for ${body?.profileId ?? (body?.goal ? "own reason" : "flow")}`, freeRemaining: null, historyId: "h1" }),
      "/api/ext/me": () => ({ defaultMessageProfileId: "mp1", extension: null }),
      "/api/ext/config": () => ({ insertEnabled: false }),
      "/api/ext/contacts": () => ({ contact: null, contacts: [] }),
    });
  });

  async function readAndGenerate() {
    render(<MessagesScreen onCreateProfile={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Read this conversation" }));
    const generate = await screen.findByRole("button", { name: "Generate reply" });
    await waitFor(() => expect((generate as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(generate);
    await waitFor(() => expect((screen.getByRole("textbox", { name: "Your message" }) as HTMLTextAreaElement).value).toBe("Message for mp1"));
  }

  it("offers Rewrite with another saved reason", async () => {
    await readAndGenerate();
    expect(rewriteButton()).toBeNull();
    await pick(screen.getByRole("combobox", { name: "Saved reason" }), "Warm follow-up");
    expect(rewriteButton()?.textContent).toBe("Rewrite with Warm follow-up");
    expect(screen.getByText("Current message: Potential client")).toBeTruthy();
    fireEvent.click(rewriteButton()!);
    await waitFor(() => expect((screen.getByRole("textbox", { name: "Your message" }) as HTMLTextAreaElement).value).toBe("Message for mp2"));
    expect(rewriteButton()).toBeNull();
  });

  it("offers it for “Just continue” and for a reason written by hand", async () => {
    await readAndGenerate();
    fireEvent.click(screen.getByRole("radio", { name: "Just continue" }));
    expect(rewriteButton()?.textContent).toBe("Rewrite: just continue the chat");

    fireEvent.click(screen.getByRole("radio", { name: "Write my own" }));
    // Nothing to rewrite with until a reason is written.
    expect(rewriteButton()).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Your reason for this conversation" }), { target: { value: "A possible hire" } });
    expect(rewriteButton()?.textContent).toBe("Rewrite with your own reason");
  });
});
