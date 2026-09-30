// Connection Note mode: the note lands in the shared result card, counted
// against the 280-character cap (LinkedIn allows 300); a first-timer is asked what the note
// should say about them before Generate turns on; a failed regenerate keeps
// the note that was there; a failed Insert points at the note, ready to copy.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { ConnectionNotePanel } from "@/sidepanel/components/ConnectionNotePanel";
import { chromeMock } from "../setup/chrome";

const TARGET = {
  name: "Maya Lindqvist",
  headline: "Talent Partner | Hiring for early-stage startups",
  currentRole: "Talent Partner at Northwind Ventures",
  about: "",
  url: "https://www.linkedin.com/in/maya",
  capturedAt: 1,
};
const PROFILE = {
  id: "cp1", name: "Warm intro", angle: "shared interest", goal: "Get the invite accepted", tone: "friendly",
  length: "90-180 characters", alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: true,
};
const NOTE = "Hi Maya, your post on hiring for judgement over polish matched what I see. Would be good to connect.";

// Settings are cached for a few seconds per module; a clock that moves on
// between tests gives each test its own account settings.
let clock = Date.now();

function server(opts: { context?: unknown; notes?: Array<{ status: number; body: unknown }> } = {}) {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  const notes = opts.notes ?? [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/api/ext/connection-note")) {
        const next = notes.shift() ?? { status: 200, body: { note: NOTE, freeRemaining: null, historyId: "h1" } };
        return json(next.status, next.body);
      }
      if (url.endsWith("/api/ext/connection-profiles")) return json(200, { profiles: [PROFILE] });
      if (url.endsWith("/api/ext/me")) return json(200, { defaultConnectionProfileId: "cp1" });
      if (url.endsWith("/api/ext/settings")) {
        return json(200, {
          connectNoteContext: opts.context === undefined ? { choice: "none", purpose: "" } : opts.context,
          connectNoteLength: null,
          linkedinProfile: null,
        });
      }
      return json(200, {});
    }),
  );
}

function renderPanel(props: Partial<Parameters<typeof ConnectionNotePanel>[0]> = {}) {
  const all = {
    target: TARGET,
    paywalled: false,
    showInsert: true,
    inserting: false,
    insertError: null,
    onInsert: vi.fn(),
    onCreateProfile: vi.fn(),
    ...props,
  };
  const view = render(<ConnectionNotePanel {...all} />);
  return { ...view, props: all };
}

const noteBox = () => screen.getByRole("textbox", { name: "Your note" }) as HTMLTextAreaElement;

async function generate() {
  const button = await screen.findByRole("button", { name: "Generate note" });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  await waitFor(() => expect(noteBox().value).toBe(NOTE));
}

beforeEach(() => {
  clock += 60_000;
  vi.spyOn(Date, "now").mockReturnValue(clock);
  const store = chromeMock().__store;
  store.extensionToken = "cl_cmt_abc";
  store.settingsUploadedToAccount = true;
  setExtensionAccess({ access: "unlimited", freeUsed: 0, freeLimit: 10, status: "active", renewsAt: null, endsAt: null, manageUrl: null });
});

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Connection note panel", () => {
  it("writes the note into the card, counted against LinkedIn's limit", async () => {
    server();
    renderPanel();
    await generate();

    expect(screen.getByText(`${NOTE.length}/280`)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Copy" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Insert" })).toBeTruthy();
    // The profile's goal and length are shown as written, not as codes.
    expect(screen.getByText("Get the invite accepted · 90-180 characters")).toBeTruthy();
  });

  it("warns when an edited note runs over the 280-character cap", async () => {
    server();
    renderPanel();
    await generate();

    fireEvent.change(noteBox(), { target: { value: "x".repeat(285) } });
    expect(screen.getByText(/Over 280 characters/)).toBeTruthy();
    expect(screen.getByText("285/280")).toBeTruthy();
  });

  it("asks a first-timer what the note should say about them before Generate turns on", async () => {
    server({ context: null });
    renderPanel();

    expect(await screen.findByText("What should your notes say about you?")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Generate note" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Pick one of the options above first.")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: /Skip/ }));
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Generate note" }) as HTMLButtonElement).disabled).toBe(false),
    );
    expect(screen.getByText("Their profile only")).toBeTruthy();
  });

  it("keeps the previous note when a regenerate fails", async () => {
    server({ notes: [{ status: 200, body: { note: NOTE, freeRemaining: null, historyId: "h1" } }, { status: 502, body: { error: "x" } }] });
    renderPanel();
    await generate();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText("Something went wrong, try again")).toBeTruthy();
    expect(noteBox().value).toBe(NOTE);
  });

  it("points at the ready note when Insert can't reach LinkedIn", async () => {
    server();
    const { rerender, props } = renderPanel();
    await generate();

    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect(props.onInsert).toHaveBeenCalledWith(NOTE, "h1");

    rerender(<ConnectionNotePanel {...props} insertError="Couldn't find LinkedIn's note box." />);
    expect(screen.getByText("Couldn't find LinkedIn's note box.")).toBeTruthy();
    expect(screen.getByText(/Your note is ready above/)).toBeTruthy();
  });
});
